const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const StudentFee = require('../models/StudentFee');
const LedgerEntry = require('../models/LedgerEntry');
const { findStudentMatches } = require('./matchingService');
const { allocatePayment } = require('./paymentAllocationService');
const { recomputeStudentBalance } = require('./balanceService');

// ── Parsing ──────────────────────────────────────────────────────────────────

// Native delimited-text parser (RFC-4180-ish): handles quoted fields, embedded
// delimiters/newlines, and "" escaped quotes. Avoids a CSV dependency.
const parseDelimited = (text, delimiter = ',') => {
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  const s = String(text).replace(/^﻿/, ''); // strip BOM

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      record.push(field); field = '';
    } else if (c === '\n') {
      record.push(field); rows.push(record); field = ''; record = [];
    } else if (c === '\r') {
      // swallow — handled by the \n branch (or lone CR ends the record)
      if (s[i + 1] !== '\n') { record.push(field); rows.push(record); field = ''; record = []; }
    } else {
      field += c;
    }
  }
  if (field.length || record.length) { record.push(field); rows.push(record); }

  // Drop fully-empty trailing rows.
  const cleaned = rows.filter((r) => r.some((v) => String(v).trim() !== ''));
  if (!cleaned.length) return { headers: [], rows: [] };

  const headers = cleaned[0].map((h) => String(h).trim());
  const objRows = cleaned.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, idx) => { o[h] = r[idx] !== undefined ? String(r[idx]).trim() : ''; });
    return o;
  });
  return { headers, rows: objRows };
};

// Optional XLSX support — only if the `xlsx` package is installed.
let xlsx = null;
try { xlsx = require('xlsx'); } catch { /* CSV-only */ }

const parseFile = (filename, buffer, delimiter = ',') => {
  const name = String(filename || '').toLowerCase();
  if ((name.endsWith('.xlsx') || name.endsWith('.xls'))) {
    if (!xlsx) throw new Error('XLSX files are not supported on this server — please upload a CSV export.');
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const arr = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false, raw: false });
    if (!arr.length) return { headers: [], rows: [] };
    const headers = arr[0].map((h) => String(h).trim());
    const rows = arr.slice(1).map((r) => {
      const o = {};
      headers.forEach((h, i) => { o[h] = r[i] !== undefined ? String(r[i]).trim() : ''; });
      return o;
    });
    return { headers, rows };
  }
  return parseDelimited(buffer.toString('utf8'), delimiter);
};

// ── Mapping → canonical credit rows ──────────────────────────────────────────

const toNumber = (v) => {
  if (v === undefined || v === null) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// Map raw header→value rows to canonical { txnRef, valueDate, amount, reference,
// payerName, isCredit } using a profile/mapping. Credit detection follows
// amountMode. Debits and zero/blank-amount rows come back with isCredit=false.
const applyMapping = (rows, profile) => {
  const col = profile.columns || {};
  const mode = profile.amountMode || (col.credit ? 'separate' : 'signed');
  const creditTokens = (profile.creditTokens || ['CR', 'C', 'CREDIT']).map((t) => t.toUpperCase());
  const creditWhenPositive = profile.creditWhenPositive !== false;

  return rows.map((r) => {
    let amount = 0;
    let isCredit = false;

    if (mode === 'separate') {
      const cr = toNumber(r[col.credit]);
      const dr = toNumber(r[col.debit]);
      if (cr > 0) { amount = cr; isCredit = true; }
      else if (dr > 0) { amount = dr; isCredit = false; }
    } else if (mode === 'direction') {
      amount = Math.abs(toNumber(r[col.amount]));
      const dir = String(r[col.direction] || '').trim().toUpperCase();
      isCredit = creditTokens.some((t) => dir === t || dir.startsWith(t));
    } else { // signed
      const a = toNumber(r[col.amount]);
      isCredit = creditWhenPositive ? a > 0 : a < 0;
      amount = Math.abs(a);
    }

    const rawDate = col.date ? r[col.date] : null;
    const d = rawDate ? new Date(rawDate) : null;
    return {
      txnRef: col.txnRef ? String(r[col.txnRef] || '').trim() : '',
      valueDate: d && !Number.isNaN(d.getTime()) ? d : null,
      amount: Math.round(amount * 100) / 100,
      reference: col.reference ? String(r[col.reference] || '').trim() : '',
      payerName: col.payerName ? String(r[col.payerName] || '').trim() : '',
      isCredit,
    };
  });
};

// Deterministic synthetic reference when a statement row has no bank txn id, so
// re-importing the same row still de-duplicates.
const synthRef = (schoolId, row) =>
  'STMT-' + crypto.createHash('sha1')
    .update(`${schoolId}|${row.valueDate ? row.valueDate.toISOString().slice(0, 10) : ''}|${row.amount}|${row.reference}|${row.payerName}`)
    .digest('hex').slice(0, 16);

// ── Processing ───────────────────────────────────────────────────────────────

// Ingest canonical rows for a school: credit-only, deduped by transaction ref,
// matched via the ladder, allocated + ledgered. Never sends SMS or socket events
// (bulk historical import must not spam parents). Returns a summary.
const processCreditRows = async (school, canonicalRows, { userId, source = 'BANK_TRANSFER' } = {}) => {
  const schoolId = school._id || school;
  const summary = { totalRows: canonicalRows.length, credits: 0, imported: 0, autoMatched: 0, suspense: 0, duplicates: 0, skipped: 0 };

  for (const row of canonicalRows) {
    if (!row.isCredit || !(row.amount > 0)) { summary.skipped++; continue; }
    summary.credits++;

    const txnId = row.txnRef || synthRef(String(schoolId), row);

    // Dedup — also catches rows already ingested via a live IPN.
    const existing = await Transaction.findOne({ transactionId: txnId });
    if (existing) { summary.duplicates++; continue; }

    const m = await findStudentMatches({
      school,
      accountRef: row.reference,
      payerName: row.payerName,
      prefix: school.admissionPrefix,
    });
    const matched = m.autoMatch || null;

    const txn = await Transaction.create({
      school: schoolId,
      transactionId: txnId,
      student: matched?._id || null,
      amount: row.amount,
      source,
      type: 'CREDIT',
      status: matched ? 'COMPLETED' : 'PENDING',
      reference: row.reference || '',
      paidBy: row.payerName || 'Statement import',
      matchMethod: matched ? m.method : 'NONE',
      matchConfidence: matched ? m.confidence : 0,
      suggestedMatches: matched ? [] : m.candidates.map((c) => ({ student: c.student._id, score: c.score, reasons: c.reasons })),
      metadata: { import: true, channel: 'STATEMENT', valueDate: row.valueDate || null },
    });

    // Land the transaction on its real value date, not the import time.
    if (row.valueDate) {
      await Transaction.updateOne({ _id: txn._id }, { $set: { createdAt: row.valueDate } });
    }

    if (matched) {
      const { allocations } = await allocatePayment({ studentId: matched._id, amount: row.amount, transaction: txn });
      for (const alloc of allocations) {
        const sf = await StudentFee.findById(alloc.studentFee);
        if (!sf) continue;
        const balanceAfter = -Math.max(0, (sf.amountCharged || 0) - (sf.amountPaid || 0));
        await LedgerEntry.create({
          school: schoolId,
          student: matched._id,
          studentFee: alloc.studentFee,
          term: sf.term,
          type: 'payment',
          amount: alloc.amount,
          balanceAfter,
          payment: txn._id,
          performedBy: userId,
          note: `Statement import — ref ${txnId}`,
        });
      }
      await recomputeStudentBalance(matched._id);
      summary.autoMatched++;
    } else {
      summary.suspense++;
    }
    summary.imported++;
  }

  return summary;
};

module.exports = { parseDelimited, parseFile, applyMapping, processCreditRows, synthRef };
