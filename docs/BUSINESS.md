# Skin Goddess: business audit

## Current clinic workflow — 10 November 2026

- **Clients** is the directory. A client profile keeps editable contact details and notes above read-only treatment history. Sales, balances, and package progress are handled in **Sales**.
- **Treatment Records** is the worklist for recording and correcting treatments across clients. Standalone records save the selected service's catalog price from **Treatment & Services**. Later catalog changes apply to new records. Editing an existing record keeps its recorded price unless staff select a different service.
- **Return date** records when the client should return, whether advised or required. Staff create and manage reminders separately in **Follow-ups**. Entering a return date does not create a reminder.

The sections below document earlier checkpoints.

## Checkpoint 2E — package screens and acceptance checks, 25 October 2026

The owner approved 2E with an explicit “yes” after the 2D checkpoint. Package purchase, completion, progress and administrator correction screens are now implemented in source. **They are not deployed to the operating clinic: its database and published frontend assets remain unchanged.** Earlier sections preserve the status at each checkpoint.

Staff can choose an ordinary sale or a treatment package. A package records one client, one treatment, its fixed session allowance and its full purchase price once. No supplies are deducted at purchase. Existing payment entry accepts full or flexible partial payments without a schedule, interest or penalties. Price, paid amount and outstanding payment appear separately from session progress.

For example, Ana buys six facial sessions for ₱12,000 and pays ₱4,000. Her remaining payment is ₱8,000; she can still receive an available session. Staff select the exact purchase, record the actual completed date and supplies used, or explicitly confirm that no additional supplies were used. Completing treatment creates no additional sale. When all purchased sessions are used, another completion is blocked.

Client profiles show each purchase separately, including multiple purchases of the same treatment. Treatment history identifies included sessions, reversals and canceled packages. Ordinary treatment entry and sales remain available. Old descriptions or session numbers never grant package sessions automatically; historical packages still require manual reconciliation.

Only administrators see reversal and cancellation controls. A reason is required. Reversal retains the original visit and supplies and restores one available session; a corrected visit receives a new history number. Staff must not deduct already-recorded supplies again. Cancellation blocks further treatment but leaves payments and debt unchanged. Ana's ₱8,000 balance remains after cancellation, and five unused sessions are shown as not redeemable. Refunds or settlement require separate administrator review; no amount is calculated automatically.

If a purchase or completion response is uncertain, the same browser tab retains the original request across closing the form or reloading. Retry checks that original request instead of making a second purchase or deducting supplies twice. Review history before explicitly discarding a pending request. This recovery is local to that tab and user; closing the tab, clearing browser storage or switching devices requires a history review before re-entry.

Browser acceptance on disposable test records verified package purchase, partial payment, completion with actual supplies, reversal, replacement without additional supplies, cancellation with retained debt, staff permissions, exhausted allowance, interrupted-request recovery, and ordinary sale/treatment creation. Production rollout and owner acceptance remain separate decisions. No expiry, sharing, transfer, reopening, automatic refunds or installment schedules were added.

## Checkpoint 2D — audited reversals and cancellation backend, 25 October 2026

The owner approved 2D after the 2C report. Administrator reversal and cancellation controls are implemented in source and verified on isolated test data. **The package migrations have not been applied to the operating clinic database, and staff screens are still reserved for 2E.** Earlier “not implemented” statements below describe their historical checkpoints.

Only administrators may reverse an incorrectly recorded package session or cancel a package. Each action requires a meaningful reason and preserves the responsible administrator and time. If payments, sessions or sale corrections changed after the administrator opened the record, the action is rejected until they reload and review it. The original audit reason cannot be silently overwritten by repeating the action.

Reversing an incorrect completion returns one session to the allowance, without deleting its original treatment date, session number, recorder, notes or supplies. History shows both the completion and its reversal. The old completion request still returns that same reversed record; it never consumes the restored allowance again. A separately entered corrected completion gets the next unused session number. A valid treatment actually delivered must not be reversed simply to provide another free visit.

Example: Ana's six-session ₱12,000 package has two recorded completions and ₱4,000 paid. An administrator reverses one erroneous entry with a reason. Progress becomes one valid completion and five remaining; the ₱8,000 debt is unchanged. Supplies previously recorded remain deducted. If staff enter the corrected visit, they must record only additional supplies actually used, not deduct the already-recorded quantities again. There is no automatic stock restoration or separate stock-correction feature in this checkpoint.

Canceling a package blocks all new completions, even if it has unused sessions or is later paid in full. The unused-session count remains visible as history and does not authorize further visits. Cancellation preserves payments, debt, completed sessions and consumed supplies; it does not calculate a refund, forgive debt or void receipts. Existing installment collection, administrator payment voids and audited financial sale corrections remain available, and none of those actions reactivates a canceled package. Any refund or settlement still requires a separate administrator decision.

An administrator may correct an erroneous historical completion on a canceled package, but doing so does not reopen it. No reopening, undo-reversal, automatic refund or payment-transfer operation is included. Follow-up reminders remain separate records and require deliberate review rather than automatic cancellation.

Checkpoint 2E, only after approval, will add the package purchase/completion screens, visible payment/progress/cancellation distinctions, administrator reason dialogs and acceptance checks. Until then, existing procedure-history totals should not be interpreted as valid package progress; the new package history explicitly identifies reversals.

## Checkpoint 2C — session backend implemented, 25 October 2026

The owner approved 2C after the 2B report. The purchase and session backends are implemented in source and tested on isolated data; **neither is deployed to the operating clinic database or integrated into new staff screens yet**. Earlier checkpoint descriptions below are historical.

Staff can use the new backend operation to record each completed session against the exact purchased package. The system checks the client and treatment, assigns the next session number, and rejects completion when the allowance is exhausted. The package record shows included, completed and remaining sessions separately from money owed. A fully paid package can have unused sessions; a partly paid or unpaid package can receive sessions while allowance remains.

Example: Ana's six-session ₱12,000 package still owes ₱8,000 after a ₱4,000 installment. Recording two completed facials leaves four sessions available and the same ₱8,000 debt. Completing all six leaves zero sessions and may still leave debt. A seventh completion is rejected until another package is purchased. No additional sale, charge or payment is created by completion.

Record actual supplies with completion. The existing stock logic deducts those quantities once; insufficient stock rejects the whole operation without consuming a session or partially deducting other items. Treatments needing no supplies may omit them; the backend does not guess supply usage or maintain a standard recipe. Retrying the same completion request returns the original session without another stock deduction. Changing its contents while reusing its request key is rejected. Starting a new request is a new completion, so staff must check history after an uncertain save.

Completed package records and their supply history are protected from ordinary edits, additions and stock-restoring deletions. They cannot be selected as another billed procedure. The existing rule against new records for inactive catalog treatments remains in effect; a saved completion can still be retrieved by retry. No package expiry or payment restriction has been introduced.

Reversals and cancellation are **not implemented yet**. Incorrect completions must remain preserved pending the administrator workflow in 2D; do not erase them or simulate a correction by returning used supplies. Checkpoint 2D will require its own approval, followed by the React staff workflow and acceptance testing in 2E.

## Checkpoint 2B — purchase backend implemented, 25 October 2026

The owner explicitly approved 2B after the 2A report. Package purchase support is now implemented in source and verified on isolated test data. **It is not deployed to the clinic database or exposed through new staff screens yet.** The earlier 2A/Phase 1 sections below describe earlier checkpoints; their “not implemented” statements are historical.

The backend can record one package purchase for one client, one treatment type and a positive whole-number session allowance. One sale line of quantity one records the entire agreed package price. For example, six facials for ₱12,000 are one ₱12,000 purchase, not six new sales. Purchasing creates no completed visits, payments or stock deductions. Existing payment entry and voiding behavior are reused.

Retrying the same purchase request returns its saved sale instead of another bill; changing the purchase while reusing that request is rejected. A genuinely separate package purchase requires a new request. This protection is package-specific; ordinary sales retain their existing behavior.

Administrators can still correct the package's price, description, date and notes with a reason and audit history, subject to existing recorded-payment limits. They cannot change the client, purchased treatment or allowance, replace/remove the original package line, multiply its quantity or add unrelated charges. Existing ordinary sales retain their correction behavior.

Checkpoint 2C is still required to record sessions against the purchase, enforce remaining allowance and protect duplicate completions. Current procedure entry explicitly refuses a package link. Unpaid balances will remain independent of session eligibility under the approved policy. Reversals and cancellation remain in 2D; package staff screens remain in 2E. Do not start using this as a live package workflow before those controls are ready.

## Approved package policies — Checkpoint 2A, 24 October 2026

This section supersedes the pending package-policy questions in the historical Phase 1 assessment below. The owner approved the policies, but **package functionality is not implemented yet**. Only environment inspection, existing-test verification and documentation are authorized at Checkpoint 2A. Checkpoints 2B, 2C, 2D and 2E each require separate explicit confirmation.

- Each purchase is one sale for one client, one treatment type and a fixed included-session allowance. Record the package price once at purchase; completing included sessions creates no new sale.
- Customers may pay fully or through flexible partial payments using existing payment records. Remaining debt is the package price less payments still recorded. Payment progress and treatment progress are independent: an unpaid balance does not prevent a session when allowance remains.
- No interest, penalties, payment schedule, expiry, sharing or transfer will be added. Existing informal packages require manual reconciliation; descriptions and old session numbers never establish entitlement.
- Staff may sell packages and record completed sessions. Only administrators may reverse incorrect completions or cancel a package. Reversals require a reason and preserved original history; a reversed incorrect completion returns one available session but never automatically returns supplies to stock.
- A canceled package cannot receive further sessions. Cancellation preserves completed treatments and payments. It does not forgive remaining debt, void money received, return supplies or calculate a refund. Refunds require administrator review and a separate decision.
- Client, purchased treatment and included allowance are protected from ordinary sale corrections. Existing audited financial sale corrections and payment voiding remain available under their current safeguards.

Example: Ana buys six facial sessions for ₱12,000 and pays ₱4,000. After two completed visits she owes ₱8,000 and has four sessions left; she may receive the next session. A later ₱3,000 payment reduces debt to ₱5,000 without changing her session count. If an administrator reverses an incorrectly entered visit, the original remains visible and allowance increases by one, while inventory stays unchanged. If the package is canceled, further visits stop but the ₱5,000 debt does not disappear and no refund is calculated automatically.

Checkpoint 2B, if approved, will add the purchase fields and relationships and validate package purchases while preserving ordinary sales. Recording/limiting sessions follows at 2C, reversals/cancellation at 2D, and staff screens/acceptance at 2E. A future database migration must not be confused with permission to alter the operating clinic database during this checkpoint.

## Package review — Phase 1, 24 October 2026

This section is the current package assessment. The earlier audit below remains useful historical context; its references to an approved Phase 2 concern earlier sale-correction work. **No package implementation is approved or included.**

### Current behavior

- A sale belongs to one client and contains priced lines. Saving it creates no treatment or inventory consumption. Staff can describe “6 facial sessions” on a bill today, but this is only text: it creates no enforceable session allowance.
- Full and partial payments already work. Balance equals the bill less payments still recorded; voided payments remain visible and are excluded. There are no installment schedules, interest, penalties or late fees.
- Treatment visits are separate records. The API accepts a manually supplied positive session number, without automatic numbering, uniqueness or a purchased-session limit. The form does not enter that number or supplies.
- An API sale line may reference one existing treatment for the same client. The same treatment can be charged on multiple lines or sales. Catalog selection in the sale form only copies description and price.
- Administrator sale corrections preserve before/after values and a reason. Payment voids preserve the original payment, user, time and reason. Treatment edits overwrite prior values without equivalent history. There is no treatment deletion endpoint, but there is also no audited session reversal.
- Inventory decreases only when supplies are explicitly recorded against a treatment. Selling a package must continue to leave stock unchanged. Supply removal currently restores stock and deletes its detail, so it is unsuitable for preserving complete correction history.

### Proposed purchase, payment and session workflow — approval pending

Start with one client, one treatment type and one package per sale. Record the purchased allowance separately from bill quantity: quantity 1, package price ₱12,000, included sessions 6. Keep that purchase price even if catalog prices later change. Mixed treatments, sharing and transfers are outside this minimum proposal.

Example: Ana purchases six facial sessions for ₱12,000. One sale records ₱12,000. She pays ₱4,000 initially and ₱3,000 later using the existing payment form; ₱5,000 remains. After two completed visits, her progress is 2 completed / 6 included / 4 remaining. Those visits create no additional sale or payment. A final ₱5,000 payment clears the balance without changing progress. Full payment before the first visit likewise leaves all six sessions available.

Record each actual completed visit against the specific purchase, even when the client owns two packages for the same treatment. Derive progress from valid completed records, never from money paid or the largest session number. Reject a seventh visit unless another purchase exists or an administrator makes an audited correction. Repeated submission of one completed visit must not consume two sessions. Record actual supplies during completion and reject insufficient stock without partially saving the visit.

### Unpaid balances and cancellation — approval pending

The current system does not block treatment when a client owes money. Separating payment status from progress does **not** decide whether the clinic should allow the next session. Confirm a policy: allow visits while owing, require full payment, or require a minimum deposit/administrator exception. The recommended simple starting policy is to display the outstanding balance prominently and allow sessions within the purchased allowance; this requires owner approval. No payment dates, automatic collections, interest or late fees are proposed.

If Ana cancels after two visits with ₱7,000 paid and ₱5,000 outstanding, there is currently no automatic answer for either the refund or remaining debt. Refer the case to an administrator and preserve the sale, payments, completed visits and stock usage. Do not void genuine receipts to simulate a refund, erase the sale, or restore supplies already used. Proposed minimum: block further use once an administrator records a cancellation decision, reason and time; financial settlement remains separately reviewed, without automatic refund calculations. Confirm whether that small cancellation control belongs in Phase 2 or cancellations remain a manual escalation.

### Decisions required before Phase 2

1. Approve the initial scope: one treatment type and one package per sale, allowance entered at purchase, no package catalog, expiry, sharing, transfers or mixed bills. Confirm whether any expiry or minimum deposit is essential now.
2. Choose the unpaid-balance attendance policy above, including whether missed promised payments ever block treatment. Ad hoc installments need no financing schedule.
3. Confirm who may sell packages and complete sessions (recommend existing staff), and who may correct/reverse sessions or cancel packages (recommend administrators only, mandatory reason and audit).
4. Decide whether correcting a falsely entered completed session restores its allowance. Recommendation: yes, with the original record retained; a treatment actually delivered continues to consume a session. Stock restoration requires a separate factual correction, never automatic restoration on cancellation.
5. Approve locking client, treatment and included allowance after purchase for the first release; retain audited price/date/notes corrections, reject package-line removal, and prohibit reducing price below recorded payments. Later entitlement changes require a separately approved audited process.
6. Decide how existing informal packages are reconciled. Recommendation: manual review of receipts and visits; never infer ownership or allowance from descriptions, matching treatments or session numbers.
7. Confirm cancellation scope and handling of remaining debt, refunds and genuine electronic-reference replacement after voiding. No automatic refund, debt write-off or refund calculation is authorized.

Phase 1 stops at documentation. Any Phase 2 needs explicit approval of its scope and the applicable decisions above.

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

The sales screen shows each bill and its payment status. Sale details show payment history and balance. The expense screen supports date and category filtering and totals.

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
