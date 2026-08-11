// Time formatting for a Kenyan audience.
//
// Instants are stored in UTC (Mongo Dates always are) — that is correct and
// should stay. The bug this guards against is on the DISPLAY side:
// `toLocaleTimeString()` with no timeZone renders in the *server's* zone, so a
// payment made at 10:58 in Nairobi shows as 07:58 to the bursar the moment the
// API runs on a UTC host (Render, Docker, most PaaS). Every user of this system
// is in Africa/Nairobi, so pin it rather than inherit it.

const NAIROBI = 'Africa/Nairobi';

/** "10:58 AM" — Nairobi time regardless of where the process runs. */
const formatNairobiTime = (date = new Date()) =>
  new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: NAIROBI,
  });

/** "07/08/2026" — Nairobi calendar day, for date-stamped copy such as SMS. */
const formatNairobiDate = (date = new Date()) =>
  new Date(date).toLocaleDateString('en-KE', { timeZone: NAIROBI });

/**
 * "05 Sep" — Nairobi calendar day, short form for SMS bodies.
 *
 * Built from a fixed month table rather than `toLocaleDateString`, whose short
 * month names vary with the host's ICU build ("Sep" vs "Sept"). SMS is billed
 * per 160-character GSM-7 segment, so copy that silently grows by a character
 * on some hosts is a real cost bug. These names are also GSM-7 safe.
 */
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatNairobiShortDate = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NAIROBI,
    day: '2-digit',
    month: 'numeric',
  }).formatToParts(new Date(date));

  const day = parts.find((p) => p.type === 'day')?.value;
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  if (!day || !month) return '';

  return `${day} ${SHORT_MONTHS[month - 1]}`;
};

module.exports = { formatNairobiTime, formatNairobiDate, formatNairobiShortDate, NAIROBI };
