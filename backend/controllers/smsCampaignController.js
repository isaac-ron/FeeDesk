const SmsCampaign = require('../models/SmsCampaign');
const SmsLog = require('../models/SmsLog');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const School = require('../models/School');
const { sendSms } = require('../services/smsService');

const schoolFilter = (req) => {
  if (req.user.role === 'super_admin') return {};
  return { school: req.user.school };
};

// Render a template with per-student placeholders.
const renderTemplate = (template, ctx) => {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = ctx[key];
    return val !== undefined && val !== null ? String(val) : `{${key}}`;
  });
};

// Resolve the recipient list from a campaign's filter.
// Returns [{ student, outstanding }].
const resolveRecipients = async (schoolId, filter = {}) => {
  const studentQuery = { school: schoolId, isActive: true };
  if (filter.classLevel && filter.classLevel !== 'ALL') studentQuery.classLevel = filter.classLevel;
  if (Array.isArray(filter.studentIds) && filter.studentIds.length) {
    studentQuery._id = { $in: filter.studentIds };
  }

  const students = await Student.find(studentQuery);

  let outstandingByStudent = new Map();
  if (filter.termId || filter.minOutstanding != null || filter.daysOverdue != null) {
    const feeQuery = { school: schoolId, status: { $in: ['UNPAID', 'PARTIAL'] } };
    if (filter.termId) feeQuery.term = filter.termId;
    if (filter.daysOverdue != null) {
      const cutoff = new Date(Date.now() - filter.daysOverdue * 86400000);
      feeQuery.dueDate = { $lte: cutoff };
    }
    const fees = await StudentFee.find(feeQuery).select('student amountCharged amountPaid');
    for (const f of fees) {
      const sid = f.student.toString();
      const out = Math.max(0, (f.amountCharged || 0) - (f.amountPaid || 0));
      outstandingByStudent.set(sid, (outstandingByStudent.get(sid) || 0) + out);
    }
  }

  const result = [];
  for (const s of students) {
    const outstanding = outstandingByStudent.get(s._id.toString()) || 0;
    if (filter.minOutstanding != null && outstanding < filter.minOutstanding) continue;
    // If any outstanding-based filter was set, require a positive balance.
    if ((filter.minOutstanding != null || filter.daysOverdue != null || filter.termId) && outstanding <= 0) continue;
    result.push({ student: s, outstanding });
  }
  return result;
};

// GET /api/sms/campaigns
const listCampaigns = async (req, res) => {
  try {
    const query = { ...schoolFilter(req) };
    const campaigns = await SmsCampaign.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/sms/campaigns/preview
// Returns projected recipient count + a sample rendered message.
const previewCampaign = async (req, res) => {
  try {
    const schoolId = req.user.role === 'super_admin' ? req.body.school : req.user.school;
    const { filter = {}, messageTemplate } = req.body;
    const recipients = await resolveRecipients(schoolId, filter);
    const school = await School.findById(schoolId);

    const sample = recipients[0];
    let renderedSample = null;
    if (sample && messageTemplate) {
      renderedSample = renderTemplate(messageTemplate, {
        parent_name: sample.student.guardianName,
        student_name: sample.student.name,
        admission_number: sample.student.admissionNumber,
        class: sample.student.classLevel,
        balance: Number(sample.outstanding || 0).toLocaleString(),
        school_name: school?.name || 'SchoolPay',
        paybill: school?.paybillNumber || '',
      });
    }

    res.json({
      success: true,
      data: {
        recipientCount: recipients.length,
        estimatedCostKes: recipients.length * 1, // placeholder per-SMS cost
        sample: sample ? {
          studentName: sample.student.name,
          guardianPhone: sample.student.guardianPhone,
          outstanding: sample.outstanding,
          renderedMessage: renderedSample,
        } : null,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/sms/campaigns
// Creates and immediately sends a campaign. (Scheduling punted to a later cron.)
const sendCampaign = async (req, res) => {
  try {
    const schoolId = req.user.role === 'super_admin' ? req.body.school : req.user.school;
    if (!schoolId) return res.status(400).json({ success: false, message: 'School is required' });

    const { name, filter = {}, messageTemplate } = req.body;
    if (!messageTemplate) return res.status(400).json({ success: false, message: 'messageTemplate is required' });

    const school = await School.findById(schoolId);
    const recipients = await resolveRecipients(schoolId, filter);

    const campaign = await SmsCampaign.create({
      school: schoolId,
      createdBy: req.user._id,
      name,
      filter,
      messageTemplate,
      status: 'SENDING',
      startedAt: new Date(),
      recipientCount: recipients.length,
    });

    // Fire-and-forget the actual sends so the HTTP request returns quickly.
    (async () => {
      let sent = 0;
      let failed = 0;
      for (const r of recipients) {
        const msg = renderTemplate(messageTemplate, {
          parent_name: r.student.guardianName,
          student_name: r.student.name,
          admission_number: r.student.admissionNumber,
          class: r.student.classLevel,
          balance: Number(r.outstanding || 0).toLocaleString(),
          school_name: school?.name || 'SchoolPay',
          paybill: school?.paybillNumber || '',
        });
        const log = await SmsLog.create({
          school: schoolId,
          campaign: campaign._id,
          student: r.student._id,
          recipientPhone: r.student.guardianPhone,
          recipientName: r.student.guardianName,
          message: msg,
          type: 'BULK_REMINDER',
          status: 'QUEUED',
        });
        const ok = await sendSms(r.student.guardianPhone, msg);
        log.status = ok ? 'SENT' : 'FAILED';
        log.sentAt = ok ? new Date() : undefined;
        if (!ok) log.errorMessage = 'Provider rejected or phone invalid';
        await log.save();
        if (ok) sent++;
        else failed++;
      }
      campaign.status = failed && !sent ? 'FAILED' : 'COMPLETED';
      campaign.sentCount = sent;
      campaign.failedCount = failed;
      campaign.completedAt = new Date();
      await campaign.save();
    })().catch(err => console.error('[SMS campaign worker]', err));

    res.status(202).json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sms/campaigns/:id/logs
const listCampaignLogs = async (req, res) => {
  try {
    const logs = await SmsLog.find({ campaign: req.params.id })
      .populate('student', 'name admissionNumber classLevel')
      .sort({ createdAt: 1 })
      .limit(500);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sms/logs — recent SMS across the school (transactional + bulk)
const listLogs = async (req, res) => {
  try {
    const logs = await SmsLog.find({ ...schoolFilter(req) })
      .populate('student', 'name admissionNumber')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listCampaigns,
  previewCampaign,
  sendCampaign,
  listCampaignLogs,
  listLogs,
};
