# Skin Goddess: business audit

Reviewed and updated 20 October 2026 after the approved initial Phase 2 work. This describes the application currently present, not promised features. Developer evidence and test details are in [TECHNICAL.md](TECHNICAL.md).

## What the clinic can currently do

Staff can register and search clients, edit contact details, maintain the treatment catalog, record treatment visits, create sales, record partial or full payments, download billing summaries, and maintain follow-up reminders. Administrators can also manage accounts, record and edit expenses, void incorrect payments, and correct recorded sales with a reason and preserved history.

These are separate steps. Recording a treatment does not automatically bill the client, record payment, deduct supplies through the current form, or create a reminder from its follow-up date. Staff must complete and check each relevant record.

| Capability | Current position |
| --- | --- |
| Client registration, editing, search | Available on screen; core record handling has automated checks. |
| Treatment catalog and visit records | Available on screen; visit editing and supply safeguards have some automated checks, but the complete staff process is not tested. |
| Sales, partial payments, administrator payment voids | Available on screen; core calculations and several failure cases are tested. |
| Follow-up reminders | Creation, editing, completion and cancellation are available; not adequately tested. |
| Expenses | Administrator entry and editing are available; only limited expense/report checks exist. |
| Billing PDF and email | Download and simulated email dispatch are tested. Actual delivery to a client is unverified. |
| Stock purchases, stock adjustments and supply recording | Behind-the-scenes functionality with some automated checks; no usable inventory or supply-entry screen. |
| Detailed owner reports | Behind-the-scenes functionality; no dedicated reports screen. Only a few calculations are tested. |
| Sale correction | Administrator correction form and before/after history are available; selected safeguards are tested. |
| Sale cancellation and refunds | Missing; require separate business decisions and implementation. |

“Tested” here refers to selected automated checks. No complete browser-based clinic transaction was demonstrated during this audit.

## A client visit, from registration to payment

1. Search for the client before registering someone new. The system does not prevent duplicate client records or merge them.
2. Record the treatment, date, price and notes. This records a visit; the price entered here does not become a bill automatically. Session numbers can be displayed, but the current form provides no session-number entry.
3. Create a sale for the correct client. Select a catalog service to copy its name and suggested price, or enter a description and price. Check quantities and prices before saving. Catalog selection does not link the charge to a particular treatment visit.
4. Open the sale and record the money actually received. Choose the method and date. GCash, bank transfer and card payments require a transaction reference.
5. Check the sale's payment history and remaining balance. Download the billing summary if needed. Email can be attempted, but “accepted for delivery” does not prove the client received it.
6. Schedule a follow-up separately. Entering a follow-up date on the treatment record alone does not place it in the reminder list.

Example: Maria receives a ₱2,500 facial and a ₱1,000 add-on. Staff record a ₱3,500 sale, then a ₱1,500 cash payment. The balance becomes ₱2,000 and the sale is partially paid. A later ₱2,000 payment clears it. Recording the visit alone would leave no sale or payment.

## Sales, balances and mistakes

The system calculates the sale amount from its line items. Remaining balance is the sale amount less payments still marked as recorded. Voided payments remain visible but no longer reduce the balance.

- **Unpaid:** no recorded payment amount remains.
- **Partially paid:** recorded payments cover some of the sale.
- **Paid:** recorded payments cover the total. New payments above the remaining balance are rejected.

A sale can currently have a zero total and still show unpaid. The owner must decide how complimentary services should appear.

Payment submission protects against an immediate repeat of the same request. If another payment changed the balance, the system rejects an outdated submission. Staff must refresh and review before trying again. Closing and reopening the form creates a new request, so staff must inspect history after an uncertain save instead of assuming it failed.

Other new records, including sales, lack equivalent repeat-request protection. A connection failure after a successful save can lead to duplicates if staff submit again.

### An incorrect payment

Only an administrator can void a payment, and a reason is required. Its original amount stays in history; the responsible accounts and void time are retained. The balance and payment status are recalculated together. Staff can then enter the correct payment separately.

Example: a ₱1,500 payment was entered as ₱1,800 against a ₱3,500 sale. The administrator voids ₱1,800 with a reason. The balance returns to ₱3,500. Recording the correct ₱1,500 leaves ₱2,000 due. Voiding and replacing are two separate saves; verify both.

A payment cannot simply be edited or deleted. There is also a correction obstacle: reusing the same electronic transaction reference for the same sale and method is rejected even after the original payment is voided. An approved way to record the replacement accurately is needed; do not invent a different reference.

### An incorrect sale

An administrator opens the sale and selects **Correct Sale**. They may change descriptions, quantities, prices, sale date and notes, and add or remove charge lines. The client stays fixed. A reason is mandatory. Existing treatment links on retained charge lines stay fixed too.

Saving recalculates the amount and payment status together. Existing payments remain unchanged. A correction cannot reduce the total below recorded payments: a sale with ₱3,000 already paid cannot be reduced to ₱2,500. A correction to exactly ₱3,000 marks that sale paid.

The sale's correction history shows the reason, administrator, time, and before/after date, notes and charge lines. If someone changes the sale or records/voids a payment while the form is open, saving is rejected. Use **Discard edits and reload sale**, review the current record and enter the correction again. If saving fails, the correction must not partly change the bill.

The invoice keeps the same number and displays its correction revision on newly generated PDFs and invoice emails. Previously downloaded copies do not update automatically. Original sale values are retained in correction history; the system does not archive every PDF previously issued.

There is still no sale cancellation or wrong-client reassignment process. Creating a replacement sale does not remove the original amount from sales or balances. Changing a sale date moves it between date-based reports; review that choice deliberately.

### Refunds and cancellations

Voiding a mistaken payment entry does not record money returned to a client. No refund, credit balance, cancellation charge, payment transfer or refund approval process exists. Cancelling a reminder only cancels that reminder.

Until an approved process is implemented, escalate these cases to the owner, retain the original records and payment evidence, and keep an approved separate record of the decision and any money returned. Do not describe a void as a completed refund.

## Procedures and supplies

The current treatment form does not record supplies used, even though history screens show a supply count. Consequently, routine treatment entry does not keep stock accurate.

The underlying stock functions support opening quantities, purchases, adjustments and explicit treatment consumption. If an explicit supply entry would consume more than available stock, it is rejected. When a treatment and its supplied quantities are saved together, failure leaves neither a partial treatment nor partial stock deductions.

Removing a supply entry restores stock and adds a reversal movement, but deletes the original supply detail. It does not retain the responsible staff member or a mandatory correction reason. Restoring stock is appropriate only when the original entry was wrong or supplies actually returned to stock; a cancelled visit does not make consumed supplies reusable.

Purchase costs do not automatically become expenses. Recording a ₱5,000 purchase does not automatically add ₱5,000 to the expense list. The owner must define how purchases and expenses are reconciled.

## Information available to the owner

The dashboard shows today's billed sales and sale count, clients with treatment records today, new registrations, current outstanding balances, today's expenses, and reminders. **Staff can see these dashboard financial totals too**, even though detailed expenses and reports are restricted.

The sales screen shows each bill and its payment status; sale details show payment history and balance. A client's profile shows total billed, which is not their remaining balance. The expense screen supports date and category filtering and totals.

Detailed reports exist behind the scenes for sales, expenses, balances, active stock, supply usage and follow-ups. They need developer assistance until a reports screen exists.

Report interpretation matters:

- Today's sales means bills dated today, including unpaid bills; it is not money received today.
- A sales-period report includes all currently recorded payments for sales dated in that period, even payments dated later. For an October ₱3,500 sale paid in November, the October report can later show that collection. It is not a fixed month-end or daily cash report.
- Voiding a payment changes current balances and collection totals. Historical report snapshots are not preserved.
- Outstanding-client totals cover unpaid and partially paid sales only, not the client's entire lifetime billing.
- The supply-usage report labelled by procedure combines quantities by supply item rather than showing each treatment separately. Client usage has no date filtering.
- No complete cash reconciliation, profit calculation or refund report was found. Purchase costs and supply costs are not automatically combined into profit.

Billing PDFs are generated from current records each time. Sale correction history preserves earlier sale values, but earlier PDF files and email delivery history are not retained. The PDF itself says it is a billing summary and not a substitute for the business's required official tax documentation.

## Responsibilities and permissions

| Action | Staff | Administrator |
| --- | --- | --- |
| View dashboard financial totals and client records | Yes | Yes |
| Create/edit treatments, catalog and reminders | Yes | Yes |
| Create sales and record payments | Yes | Yes |
| Download/email billing summaries | Yes | Yes |
| Void payments with a reason | No | Yes |
| Open expense and account management screens | No | Yes |
| Access detailed reports behind the scenes | No | Yes |
| Change stock through underlying stock functions | Yes | Yes |
| Correct sale items/date/notes with reason and history | No | Yes |
| Change a sale's client, cancel sales or record refunds | Unavailable | Unavailable |

Client archiving exists behind the scenes and retains records, but hides the client from ordinary profiles and searches. There is no archive/recovery screen. It does not cancel the client's debts. Account “Delete” actually deactivates the account and preserves it; an administrator can reactivate it. Self-deactivation and self-demotion are blocked.

Signing out clears the browser's saved login, but an already copied login credential remains usable until its eight-hour expiry unless the account is deactivated. Password reset alone does not invalidate it.

## Remaining operational risks

| Priority | Risk and practical effect |
| --- | --- |
| High | Administrators can correct amounts, but duplicate bills and wrong-client bills still have no approved cancellation/reassignment process. |
| High | Expense edits replace previous values, and behind-the-scenes deletion permanently removes an expense. No reason or responsible-user history is kept. |
| High | Stock and reminders can be missing even when a treatment was saved successfully. |
| High | Current permissions expose dashboard expenses to staff and allow stock changes without administrator approval. |
| Operational | A local backup was created before this update. A protected outside copy and successful recovery drill remain unverified. Losing this computer could interrupt the clinic. |
| Operational | Editing client details changes newly generated billing summaries; earlier issued versions are not preserved. Concurrent ordinary edits can replace another person's work. |

The initial Phase 2 work fixed local date defaults, recalculates a new expense's default date whenever its form opens, and shows a visible error with Retry if a client history fails to load. It no longer represents a failed history request as an empty history or ₱0 billed.

## Approved correction policy and remaining decisions

The following approved sale correction policy is now implemented:

- Only administrators may correct recorded sales initially; every correction requires a reason, time and responsible account.
- Original values remain traceable; existing payments are never silently changed.
- The total is recalculated from corrected lines, and balance and payment status change consistently.
- Reject a corrected total below recorded payments until an explicit overpayment/refund policy exists. For example, a sale with ₱3,000 recorded payments cannot be reduced to ₱2,500.
- Failure must leave all records unchanged, and simultaneous changes must not silently replace each other.

The approved scope allows descriptions, quantities, prices, date and notes to change, keeps the client fixed, and retains the invoice number with a correction marker. Current fractional rounding is preserved. The owner and developer still need to settle:

1. Whether wrong-client reassignment or changing treatment links should ever be permitted, and whether full issued-PDF archives are required.
2. How wrong-client sales, duplicate sales, cancellations, discounts, complimentary visits and refunds are approved and recorded.
3. How to replace a voided electronic payment using its genuine reference; how that replacement links to the original.
4. Whether staff should see dashboard expenses or manage catalog and stock; which other corrections need reasons and history.
5. Whether reminders should be created from treatment follow-up dates, and whether treatment entry should include actual supplies or approved standard quantities.
6. How sales, money received, purchases and expenses should be reconciled at day-end and month-end; whether fractional quantities and current rounding are acceptable.
7. Who owns daily backups, protected outside copies, retention and a witnessed recovery test; who verifies actual invoice email delivery.

The approved initial Phase 2 work is complete: date/history fixes and audited sale corrections. Recommended next order: agree on cancellation/refund and other correction controls, then complete inventory/reminder screens and owner reconciliation reports. Those additional workflows are not included in this update.
