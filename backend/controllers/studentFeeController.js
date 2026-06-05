const StudentFee = require('../models/StudentFee');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const { deriveCategoryBreakdown } = require('../services/feeCategoryService');

const schoolFilter = (req) => {
  if (req.user.role === 'super_admin') return {};
  return { school: req.user.school };
};

// GET /api/student-fees?student=&term=&status=
const listFees = async (req, res) => {
  try {
    const { student, term, status } = req.query;
    const query = { ...schoolFilter(req) };
    if (student) query.student = student;
    if (term) query.term = term;
    if (status) query.status = status;
    const rows = await StudentFee.find(query)
      .populate('term', 'name academicYear termNumber status')
      .sort({ createdAt: 1 });
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/students/:studentId/ledger?term=
// Returns charges, outstanding totals, and recent allocations for the student.
const getStudentLedger = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { term } = req.query;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (req.user.role !== 'super_admin' && student.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const feeQuery = { student: studentId };
    if (term) feeQuery.term = term;
    const fees = await StudentFee.find(feeQuery)
      .populate('term', 'name academicYear termNumber status')
      .populate('feeStructure', 'categories label amount')
      .sort({ createdAt: 1 });

    const totals = fees.reduce(
      (acc, f) => {
        acc.charged += f.amountCharged || 0;
        acc.paid += f.amountPaid || 0;
        return acc;
      },
      { charged: 0, paid: 0 }
    );
    totals.outstanding = Math.max(0, totals.charged - totals.paid);

    // Pro-rata presentation: when the row's structure defines category shares,
    // derive a per-category paid/outstanding split from this row's flat amounts.
    // Empty array when there are no categories (UI falls back to the flat line).
    const feesWithBreakdown = fees.map((f) => {
      const obj = f.toObject({ virtuals: true });
      const cats = f.feeStructure && f.feeStructure.categories;
      obj.categoryBreakdown = (cats && cats.length)
        ? deriveCategoryBreakdown(cats, f.amountCharged || 0, f.amountPaid || 0)
        : [];
      return obj;
    });

    const feeIds = fees.map(f => f._id);
    const payments = await Transaction.find({
      'allocations.studentFee': { $in: feeIds },
    })
      .select('amount status mpesaReceiptNumber paidAt allocations')
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: {
        student,
        fees: feesWithBreakdown,
        totals,
        payments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/student-fees/:id/waive
const waiveFee = async (req, res) => {
  try {
    const row = await StudentFee.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role !== 'super_admin' && row.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    row.status = 'WAIVED';
    await row.save();
    res.json({ success: true, data: row });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  listFees,
  getStudentLedger,
  waiveFee,
};
