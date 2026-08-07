const { test } = require('node:test');
const assert = require('node:assert/strict');

const { formatNairobiTime, formatNairobiDate } = require('../utils/time');

// Instants are stored in UTC, which is correct. What must not vary is what the
// bursar SEES. `toLocaleTimeString()` without an explicit timeZone renders in
// the server's zone, so the same payment showed 10:58 AM on a developer's EAT
// machine and 07:58 AM once deployed to a UTC host — three hours wrong, with
// nothing in the data to hint at it.
//
// These assertions are absolute, so they fail on any host that loses the pin.

test('formatNairobiTime renders Nairobi time regardless of server timezone', () => {
  // 07:58:28Z is 10:58 in Nairobi (UTC+3).
  assert.equal(formatNairobiTime('2026-08-07T07:58:28Z'), '10:58 AM');
});

test('formatNairobiTime handles the afternoon/PM boundary', () => {
  // 12:30:00Z -> 15:30 EAT
  assert.equal(formatNairobiTime('2026-08-07T12:30:00Z'), '03:30 PM');
});

test('formatNairobiTime rolls past midnight UTC into the same Nairobi evening', () => {
  // 22:15Z on the 6th is 01:15 on the 7th in Nairobi — the case that silently
  // files a late payment under the wrong day in daily reconciliation.
  assert.equal(formatNairobiTime('2026-08-06T22:15:00Z'), '01:15 AM');
});

test('formatNairobiDate uses the Nairobi calendar day, not the UTC one', () => {
  // 21:30Z on the 6th is already the 7th in Nairobi.
  const d = formatNairobiDate('2026-08-06T21:30:00Z');
  assert.match(d, /7/, `expected the 7th in Nairobi, got ${d}`);
});

test('formatNairobiTime accepts a Date as well as a string', () => {
  assert.equal(formatNairobiTime(new Date('2026-08-07T07:58:28Z')), '10:58 AM');
});
