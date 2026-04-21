// Unified payment normalisation layer.
//
// All four payment providers (MPESA, KCB, Equity, Co-op) POST different
// payload shapes. This module normalises every callback into one internal
// shape BEFORE any business logic runs.
//
// Spec non-negotiable #4: "Normalise before processing."

const bankService = require('./bankService');

/**
 * @param {'MPESA'|'KCB'|'EQUITY'|'COOP'} provider
 * @param {object} rawPayload  — the request body from the webhook
 * @param {object} [school]    — resolved school document (needed for bank providers)
 * @returns {{ provider, ref, amount, phone, accountRef, receivedAt, rawPayload, sourceLabel }}
 */
const normalise = (provider, rawPayload, school) => {
  switch (provider) {
    case 'MPESA':
      return normaliseMpesa(rawPayload);
    case 'KCB':
    case 'EQUITY':
    case 'COOP':
      return normaliseBank(provider, rawPayload, school);
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
};

// ─── MPESA C2B Confirmation ───────────────────────────────────────────
const normaliseMpesa = (body) => {
  const {
    TransID,
    TransAmount,
    BillRefNumber,
    MSISDN,
    FirstName,
    MiddleName,
    LastName,
    TransTime,
  } = body;

  let phone = null;
  if (MSISDN && !String(MSISDN).includes('*')) {
    const cleaned = String(MSISDN).replace(/\D/g, '');
    if (cleaned.startsWith('254') && cleaned.length === 12) phone = cleaned;
  }

  return {
    provider: 'MPESA',
    ref: TransID,
    amount: parseFloat(TransAmount),
    phone,
    accountRef: String(BillRefNumber || '').trim().toUpperCase(),
    paidBy: [FirstName, MiddleName, LastName].filter(Boolean).join(' ') || 'Unknown',
    receivedAt: TransTime ? parseTransTime(TransTime) : new Date().toISOString(),
    sourceLabel: 'MPESA',
    rawPayload: body,
  };
};

// Safaricom TransTime format: YYYYMMDDHHmmss
const parseTransTime = (t) => {
  if (!t || t.length < 14) return new Date().toISOString();
  const s = String(t);
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}+03:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

// ─── Bank providers (KCB, Equity, Co-op) ──────────────────────────────
const normaliseBank = (provider, body, school) => {
  // bankService.processWebhook already extracts per-provider fields into
  // a consistent shape: { transactionId, amount, reference, phoneNumber,
  //   paidBy, rawPayload, timestamp }
  const data = bankService.processWebhook(provider, body, school);

  return {
    provider,
    ref: data.transactionId,
    amount: parseFloat(data.amount),
    phone: data.phoneNumber || null,
    accountRef: String(data.reference || '').trim().toUpperCase(),
    paidBy: data.paidBy || 'Bank Transfer',
    receivedAt: data.timestamp || new Date().toISOString(),
    sourceLabel: `${provider} BANK`,
    rawPayload: body,
  };
};

module.exports = { normalise };
