# Backend Migration Notes — Dashboard Overhaul

Companion to `dashboard-overhaul-prompt.md` at the project root. Covers only
the backend model restructure; controllers/routes come in a follow-up pass.

---

## What changed in this commit

Six new Mongoose models + one field extension:

| File | Purpose |
| --- | --- |
| `models/Term.js` | Real term entity (dates, lifecycle, one ACTIVE per school) |
| `models/FeeStructure.js` | Per (term, classLevel) fee sheet with embedded `items[]` |
| `models/StudentFee.js` | Per-student ledger row — snapshotted from FeeStructure at publish |
| `models/AuditLog.js` | Append-only log for the Settings > Audit log page |
| `models/SmsCampaign.js` | Bulk-reminder job with filter, template, aggregate counts |
| `models/SmsLog.js` | Per-recipient SMS record (transactional + bulk) |
| `models/Transaction.js` | **Extended** with `allocations[]` — how a payment splits across StudentFee rows |

Nothing existing was deleted or renamed. Legacy `Fee` stays in place as a
read-only catalog during the transition. `Student.currentBalance` stays and
becomes a denormalised cache of `sum(StudentFee.outstanding)` for the active
term.

---

## Data model, end to end

```
School ──┬── Term (DRAFT → ACTIVE → ARCHIVED, one ACTIVE per school)
         │     └── FeeStructure (per classLevel, DRAFT → PUBLISHED)
         │           └── items[] (embedded subdoc: name, amount, dueDate, isRequired)
         │
         ├── Student
         │     └── StudentFee (one per item published for this student)
         │           ├── amountCharged (snapshot)
         │           ├── amountPaid (running)
         │           └── status (UNPAID | PARTIAL | PAID | WAIVED)
         │
         ├── Transaction (unchanged fields, now with allocations[])
         │     └── allocations[]: [{ studentFee, amount }]
         │
         ├── AuditLog (append-only)
         └── SmsCampaign ──< SmsLog (per recipient)
```

### Why embed `items[]` inside `FeeStructure` but split `StudentFee` out

- A FeeStructure is read as a whole (edit screen shows every line). Embedding
  makes that one document fetch and makes inline edits atomic.
- StudentFee is read per-student, filtered and aggregated across thousands of
  rows. It has to be a top-level collection for the indexes to work.
- `StudentFee.feeItemId` points at the subdoc `_id` inside the structure's
  `items[]`, so we can trace a charge back to its source without duplicating
  every field.

### Why snapshot name/amount onto StudentFee

If the bursar corrects a fee amount three weeks into the term, students who
already paid must not have their historical charges rewritten — their
receipts would stop matching. Snapshotting on publish means edits only touch
the source-of-truth FeeStructure; the ledger rows are updated explicitly by
the edit flow, and only for rows where `amountPaid === 0`.

---

## Payment allocation (no refund/reallocate)

Per the product call on 2026-04-13, we do **not** build reallocate/refund
flows — they're out of scope until a client asks. The allocation logic is
therefore one-way: when a payment is confirmed, split it across the student's
UNPAID/PARTIAL StudentFee rows and never touch it again.

Allocation algorithm (to implement in `paymentController.js` or a new
`services/allocationService.js`):

1. Load the student's StudentFee rows where `status IN (UNPAID, PARTIAL)`
   and `term = school.activeTerm`, sorted by `dueDate ASC`, then `createdAt
   ASC` as a tiebreaker.
2. Walk the rows, applying `min(remainingPayment, row.outstanding)` to each,
   incrementing `row.amountPaid`, pushing `{ studentFee, amount }` onto
   `transaction.allocations`, and saving.
3. If payment remains after all rows are paid, leave the remainder unallocated
   — it shows up on the student ledger as a credit balance. (No carry logic
   yet; just visible in the UI.)
4. Recompute `Student.currentBalance` = `sum(outstanding)` across all the
   student's active-term StudentFee rows.

Priority strategy is hardcoded to "oldest due first" for now. The
`School.settings` payment-rules panel in Phase 7 will expose this as a
dropdown later.

---

## Term lifecycle

- **DRAFT**: term is being set up. Bursar can create FeeStructures inside it.
  Publishing a FeeStructure while the term is DRAFT is allowed — it just
  pre-stages StudentFee rows that become live when the term activates.
- **ACTIVE**: reminder jobs run against it, the Overview page reads from it,
  the partial unique index guarantees only one ACTIVE term per school.
- **ARCHIVED**: set when a new term is activated. At archive time, for each
  student with outstanding StudentFee rows and `carryForwardEnabled: true`,
  create a new StudentFee in the incoming term with `carriedForwardFrom`
  pointing at the original row. The student ledger "All terms" view uses
  this chain to render the carry-forward banner.

Activation endpoint (to build in the controller pass) is the only place that
flips DRAFT → ACTIVE. It runs in a transaction: archive the current ACTIVE
term, do the carry-forward pass, flip the new term to ACTIVE.

---

## SMS — per-student personalised templating

TextSMS integration already exists (`services/smsService.js`) and works.
What's missing is the bulk-send pipeline, which the new models cover:

1. Bursar opens SMS Reminders, picks a filter (class, min balance, days
   overdue, last-reminder-older-than).
2. Frontend calls `POST /api/sms/preview` with the filter — backend resolves
   the recipient list from StudentFee + Student and returns count + one
   rendered sample.
3. Bursar confirms → `POST /api/sms/bulk` creates a `SmsCampaign` row
   (`status: SCHEDULED` or `SENDING`), queues it.
4. Worker walks recipients. For each, it renders the template with
   per-student variables, creates a `SmsLog { status: QUEUED }`, calls
   `smsService.sendSms`, updates the log to SENT/FAILED with provider
   response, and increments the campaign's sentCount/failedCount.

Template placeholders are substituted at send time, not stored rendered:

```
{parent_name}       → student.guardianName
{student_name}      → student.name
{admission_number}  → student.admissionNumber
{class}             → student.classLevel
{balance}           → sum(outstanding StudentFee.amountCharged - amountPaid) for active term
{due_date}          → earliest unpaid StudentFee.dueDate
{school_name}       → school.name
{paybill}           → school.paybillNumber
```

`SmsLog.message` stores the final rendered text verbatim so the bursar can
audit exactly what each parent received.

Scheduled sends: if `SmsCampaign.scheduledAt` is in the future, a cron
worker picks it up at that time. For pilot we can run campaigns inline
(immediate only) and wire scheduling post-pilot if needed.

---

## Indexes added

| Collection | Index | Why |
| --- | --- | --- |
| `terms` | `(school, academicYear, termNumber)` unique | No duplicate terms |
| `terms` | `(school, status)` partial unique on `status: ACTIVE` | One ACTIVE per school |
| `feestructures` | `(school, term, classLevel)` unique | One structure per class per term |
| `studentfees` | `(student, feeStructure, feeItemId)` unique | No double-charging |
| `studentfees` | `(school, term, status)` | Bulk-reminder filter, overview alerts |
| `studentfees` | `(student, term)` | Student ledger current-term view |
| `auditlogs` | `(school, createdAt desc)` | Audit log page pagination |
| `auditlogs` | `(school, entityType, entityId)` | Entity history lookups |
| `smscampaigns` | `(school, createdAt desc)` | History table |
| `smscampaigns` | `(school, status)` | Failed-campaign filter |
| `smslogs` | `(school, createdAt desc)` | History table |
| `smslogs` | `(school, status)` | Failed-deliveries panel |
| `smslogs` | `(campaign, status)` | Campaign progress rollup |

---

## Backwards compatibility

- Existing routes (`/api/fees`, `/api/payments`, `/api/transactions`,
  `/api/dashboard/*`) are untouched. Legacy Dashboard keeps working against
  `Student.currentBalance`.
- New routes will be additive: `/api/terms`, `/api/fee-structures`,
  `/api/students/:id/ledger`, `/api/sms/*`, `/api/audit-log`.
- `paymentController.recordPayment` (etc.) will be extended to also
  write `transaction.allocations` and update `StudentFee.amountPaid` once
  the new ledger is populated for a school. Until a school has an ACTIVE
  Term + published FeeStructure, the extension is a no-op and the legacy
  `student.currentBalance -= amount` path still runs.
- The migration from legacy `Fee` to `FeeStructure` is not automated. Schools
  onboarded before the overhaul will need to create a Term and publish a
  fresh FeeStructure once. Pilot school (target 2026-05-02) starts on the
  new model directly — no data migration needed for them.

---

## Not yet built (next passes)

1. `services/allocationService.js` — the walk-and-apply logic
2. `services/auditService.js` — `recordAudit(...)` helper, swallows errors
3. `controllers/termController.js` + routes
4. `controllers/feeStructureController.js` + routes (including `publish`)
5. `controllers/studentLedgerController.js` (the per-student view)
6. `controllers/smsCampaignController.js` + routes (preview, bulk, retry, history)
7. `controllers/auditLogController.js` + routes
8. Wire `paymentController` to call allocation + audit when a payment lands
9. Wire `smsService.sendPaymentReceipt` to write an `SmsLog` row

---

## Review checklist for Codex

- [ ] Indexes cover every query the Phase 2–7 UI needs (see the prompt)
- [ ] No field duplication between `FeeStructure.items` and `StudentFee`
      beyond the intentional snapshot fields (name, type, amountCharged)
- [ ] Allocation design handles overpayment without losing money
      (credit balance is visible, not silently dropped)
- [ ] Carry-forward chain is traceable in both directions for the ledger UI
- [ ] AuditLog metadata stays small — never dump full documents into it
- [ ] SmsLog stores the rendered message, not the template — auditability
- [ ] All new models respect the multi-tenant `school` scoping already used
      elsewhere in the codebase
- [ ] Partial unique index on `terms.status = ACTIVE` works on our MongoDB
      version (requires 3.2+, which we're well past)
