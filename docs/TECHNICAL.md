# Skin Goddess: technical audit

Reviewed and updated 20 October 2026 after the approved initial Phase 2 implementation: local dates, explicit profile-load errors and audited administrator sale corrections. See [BUSINESS.md](BUSINESS.md) for staff guidance. Laragon configuration and dependencies are unchanged.

## Evidence and verification boundaries

Inspected controllers/models, routes, migrations, clinic pages/forms/services, invoice templates, tests, build/configuration files, README and local Apache configuration. `.ai/rules` is absent. Applied the repository's Laravel and testing skills. `route:list --path=sales` confirms the administrator PUT/PATCH correction route and signed-in history route.

Versions: PHP CLI 8.3.33; `composer show --direct` confirms Laravel 13.36.0, Dompdf 3.1.6, Pest 4.7.8 and Pest Laravel plugin 4.1.0. `resources/clinic/package.json` declares React ^19.2.8, React Router ^7.18.4, Vite ^8.3.0 and Tailwind ^4.3.3. JavaScript ranges are declarations, not a claim about loaded browser assets.

Executed `ClinicWorkflowTest.php` plus new `SaleCorrectionTest.php`: **36 tests, 314 assertions passed across the SQLite runs and together on separate MySQL**. The MySQL Artisan wrapper returned exit 1 despite a passing Pest summary; direct Pest confirmed the passing result with exit 0. The Node date regression test also passes. Pint, PHPStan with 512 MB memory and the production build pass. Focused ESLint reports seven existing `react-hooks/set-state-in-effect` errors; the original HEAD versions confirm the same seven baseline errors. New utility/test/service code passes lint.

This is not a reconciliation of live clinic data. A local backup was created, the additive migration applied, and production assets rebuilt. The login screen loads without browser errors; authenticated browser correction flows, actual simultaneous requests, restore recovery and real email receipt remain unverified. README's import counts are historical claims. Boost tools were unavailable; installed CLI/schema inspection and the [Laravel 13 documentation](https://laravel.com/docs/13.x/queries#pessimistic-locking) supplied API guidance.

## Actual architecture

| Layer | Responsibility and location |
| --- | --- |
| React SPA | `resources/clinic/src/App.jsx` uses BrowserRouter. Pages/forms display records, validate inputs, and call services. There is no Inertia dependency or Inertia page workflow in this application. |
| Browser services | `resources/clinic/src/services/apiClient.js` sends same-origin JSON `/api` requests with a bearer token. Auth uses a form-encoded login; invoice service uses direct fetch for PDF/email. |
| Laravel | `routes/api.php`, `app/Http/Controllers/*`: authentication boundaries, validation, calculations, transactions and JSON responses. Business rules primarily live in controllers. No separate business service layer or API Resource layer is present. |
| Persistence | Eloquent models in `app/Models`, MySQL configured in `config/database.php`. Business migrations specify InnoDB. Money is generally DECIMAL(10,2), quantities DECIMAL(10,3). |
| Hosting/build | Apache serves `public`; `routes/web.php` serves `public/clinic/index.html` for non-API SPA paths and returns 503 if missing. Root npm build runs `resources/clinic/build.mjs`, copying assets and HTML to `public`. |
| Invoices | `InvoiceController`, `app/Mail/ClinicInvoice.php`, `resources/views/invoice*.blade.php`: current billing data rendered through Dompdf, synchronous SMTP sending. |

`ClinicAuthentication::numericResponse()` converts known decimal response fields to JSON numbers for the existing UI. Internal financial arithmetic uses Brick Math BigDecimal; browser previews use JavaScript numbers. Do not infer monetary correctness from frontend previews alone.

## Data relationships

Primary schema: `database/migrations/2026_10_14_113847_create_clinic_business_tables.php`; user timestamp precision: `2026_10_14_120000_preserve_clinic_user_timestamp_precision.php`. Models declare corresponding relationships and casts.

| Parent | Children / relationship |
| --- | --- |
| `clients` | Many `procedures`, `sales`, `follow_ups`. Archiving toggles `is_active`; no physical client delete in the controller. |
| `services` | Many procedures. Catalog name remains mutable; procedure history resolves the current catalog name. |
| `procedures` | Many `procedure_supplies`; optional references from `sale_items` and `follow_ups`. |
| `sales` | Many `sale_items` and `payments`; each belongs to one client. |
| `inventory_items` | Many purchase lines, procedure supply entries and inventory movements. |
| `inventory_purchases` | Many `inventory_purchase_items`; no relationship to an expense. |
| `users` | Payment recorder and optional voiding user. Other business records generally lack responsible-user fields. |
| `expenses` | Standalone dated/category amounts; no revision or reversal relationship. |

Foreign keys constrain these references; migrations do not declare cascading business deletes. Inventory movement source references are descriptive, not foreign keys. A removed supply's reversal references a deleted supply ID. New migration `2026_10_20_133557_add_sale_correction_history.php` adds `sales.version` (default 0) and `sale_corrections`: sale, unique per-sale revision, responsible user, reason, before/after JSON snapshots and timestamp. There are no correction edit/delete endpoints. No cancellation, refund, issued-PDF snapshot or email-dispatch-history tables exist. Ordinary sale lines have no timestamps; revision snapshots preserve their earlier values.

## Workflow coverage and correction behavior

Paths below are relative to the repository. Controller names refer to `app/Http/Controllers/`; page names refer to `resources/clinic/src/pages/`.

| Operation / user intent | Actual behavior and enforced rule | Failure, mistake recovery and retained history | UI and test position |
| --- | --- | --- | --- |
| Register/find/edit client | `ClientController` requires names, validates optional contact fields and searches active clients by name/phone. | Invalid input returns 422. Edits overwrite values. Archive preserves row and related history but ordinary show/search excludes it; no restore action. No duplicate detection/merge. | `clients/ClientsPage`, `ClientForm`, `ClientProfilePage` expose create/search/edit. Archive is backend-only. CRUD/search/archive row persistence tested, not access to related archived histories. |
| Maintain catalog | `ServiceController` creates/edits/activates services; nonnegative prices and positive duration. | Previous names/prices not audited. `ProcedureController::activeService` rejects inactive services on creation or a change of service; unchanged inactive service can remain on an existing procedure. | `services/ServicesPage` exposes catalog actions. Catalog create is test setup; activation and business boundaries lack dedicated tests. |
| Record/edit visit | `ProcedureController` validates client, service, dates, price and optional session number. Client cannot be changed through update. | Procedure plus supplied consumption commits together; insufficient stock rolls everything back. Ordinary edits overwrite old values, with no reason/user history. No cancellation/deletion workflow. | `procedures/ProcedureForm` and history pages expose record/edit, but no session-number or supply input. Supply rollback and a notes update are tested; full visit workflow is not. |
| Schedule return | `FollowUpController` stores a separate reminder; optional procedure must belong to client. Statuses: upcoming/due/completed/cancelled. | Editing replaces date/status/notes, without audit. Overdue is computed from dates, not a persisted status transition. No automatic reminder creation from `procedures.next_follow_up`. | `follow-ups/FollowUpForm`, `FollowUpsPage` expose create/edit/complete/cancel. No dedicated follow-up tests. Form's minimum date can obstruct editing an overdue reminder unless date changes; quick complete avoids that form. |
| Create/correct bill | `SaleController::store` calculates totals; administrator `update` corrects lines/date/notes with required reason and expected version. | Corrections preserve snapshots and payments, reject totals below recorded payments, and commit atomically. Client stays fixed. New-sale deduplication and cancellation remain missing. | `sales/SaleForm` supports create/correct; `SaleDetailPage` exposes admin action and before/after history. Catalog picks copy text/price, never submit procedure links. Correction safeguards tested; new-sale retry gaps remain. |
| Record money | `PaymentController::store` locks sale; validates expected balance, positive amount, request key and electronic references. | Stale balance/overpayment/duplicate reference returns 409. Retry with same key returns existing payment. Payment plus receipt/status commit together. | `sales/PaymentForm`, `SaleDetailPage` expose it. Sequential retry, stale balance, overpayment and partial status tested; full settlement and true concurrency untested. |
| Correct payment | Admin-only `PaymentController::void`, required trimmed reason; locks sale then payment. | Preserves payment and records reason/time/user; recalculates status atomically. Repeat void is 409. Edit/delete return 405. Replacement is a separate payment operation. | Admin void dialog and history expose status/reason/receipt, but not responsible users or void timestamp. Void and patch rejection tested; staff void denial and repeat void lack dedicated assertions. |
| Receive/adjust stock | `InventoryController` creates opening stock, purchases and movements; adjustments lock items and prohibit negative/overflow stock. Direct quantity update prohibited. | Purchase and stock movements commit together. Latest purchase overwrites acquisition cost. No purchase correction/return, request deduplication, user audit or required adjustment reason. | Backend-only; no inventory page/service module. Purchase addition and invalid deductions tested; broader rollback/cost/permission cases untested. |
| Consume/reverse supplies | `ProcedureController::recordSupply`, `addSupply`, `removeSupply` lock affected records and record movements. | Insufficient stock returns 409. Removal restores stock once, adds reversal movement and deletes original supply detail; no operator/reason. No inactive-item check on consumption/purchase. | Service wrappers exist, no supply-entry/removal controls. Exact deduction/removal and rollback tested. |
| Record/correct expense | Admin-only `ExpenseController` validates and saves dated amounts. | Edit overwrites; delete permanently removes the record. Neither records a correction reason/user or original values. API accepts zero; form requires positive amount. | `expenses/ExpensesPage` exposes entry/edit/filter, no delete control. One expense creation/report assertion and staff denial tested; corrections/deletion untested. |
| Issue billing summary | `InvoiceController::context` loads current client/lines/recorded payments; computes balance. PDF disables remote/PHP execution. | Missing recipient 422, SMTP config absent 503, send failure reported and returns 502. No version snapshot or durable delivery log. | `SaleDetailPage` download/send controls. PDF signature/config rejection/fake dispatch tested; actual email and PDF layout unverified. |
| Manage access | `ClinicAuthController`, `ClinicAuthentication`, `routes/api.php`. | Accounts are deactivated, not deleted. Self-demotion/deactivation/deletion blocked; no general user-change audit. | `users/UserManagementPage` exposes roles, password reset and active state. Its “Delete/cannot be undone” copy conflicts with reversible deactivation. Login/auth boundaries tested; account lifecycle incompletely tested. |

## Sales, payments and transaction details

### Sale creation and amounts

`SaleController::store` validates at least one line, positive quantity (up to three decimals), nonnegative unit price (up to two decimals), and supported maxima. Quantity defaults to 1. It ignores submitted calculated totals and restricts nested line fields before creation. An optional procedure must belong to the sale client; it need not exist on every sale and no uniqueness constraint prevents charging the same procedure twice.

Within one database transaction, it creates an unpaid zero-total sale, inserts lines and updates total. Each line rounds quantity × unit price to two decimals, HalfUp. **The sale total instead rounds the sum of unrounded products.** Two lines of 0.500 × ₱0.01 each display ₱0.01 per line but yield ₱0.01 sale total, not ₱0.02. `fractional sale totals preserve the source aggregate rounding rule` explicitly verifies this behavior. Purchases use the same aggregate approach. Decide the rounding policy before adding corrections, rather than silently changing it.

Zero-priced lines are valid. Creation always marks unpaid; `PaymentController::syncStatus` also selects unpaid first when paid amount is zero. Complimentary-sale semantics need a decision.

### Payment recording

`PaymentController::store` validates sale/date/positive two-decimal amount, a 16–64 character idempotency key, expected remaining balance, allowed method and required reference for GCash/bank/card. A null method is allowed by the API; the UI defaults to cash.

Inside a transaction with up to three attempts, it locks the sale, checks existing request key, sums only `status=recorded` payments, checks exact expected balance and rejects amount above remaining. Electronic reference uniqueness is checked for the same sale/method against **all** statuses. It creates the payment with authenticated recorder ID and a temporary unique receipt, replaces it with `PAY-YYYYMMDD-<padded id>`, and updates stored sale status. Request key and receipt have unique indexes; the reference check has no equivalent unique index but payment writes serialize on the sale lock.

Balance = sale total − recorded payments. Stored status = unpaid if paid ≤ 0; paid if paid ≥ total; otherwise partial. Summary/history, invoices and reports all exclude voided payments from paid totals.

Retry limitations: matching request key/sale returns the previous payment without comparing amount/date/method/reference or checking its current recorded/voided status. `PaymentForm` retains its key while open, even if fields change after an uncertain response, and generates a new key on reopening. Thus changed-input retries can silently return the old record; reopened retries can duplicate real-world payments when balance permits. No cross-sale reference check exists. These are source findings, not covered by existing tests.

### Locks and failure boundaries

Transactions protect sale creation, payment creation/void/status, procedure-plus-supplies, supply addition/removal, stock opening/adjustment, purchases and their movements. Purchase items are locked in ID order; supplied items are sorted on procedure creation. Concurrent over-consumption/overpayment protection is implemented using row locks, but tests make sequential requests and do not prove real parallel behavior.

`SaleController::update` locks the sale, compares required `expected_version`, and rejects stale corrections with 409. Payment creation/void and corrections increment the same integer version under that lock; payment retries that return an existing record do not increment it. Other ordinary edits still lack version checks. Payment void and replacement remain separate transactions. Invoice context now loads sale/lines/recorded payments/revision inside a shared sale lock and transaction so financial changes cannot interleave. Email sending remains outside the database transaction.

## Authentication, permissions and errors

Login lowercases/trims username and verifies `hashed_password`; `ClinicUser` is a separate Eloquent view of `users` from Laravel's scaffold `User`. It encrypts a JSON bearer credential containing user ID and eight-hour expiry, **not a JWT**, despite an outdated frontend comment. Middleware decrypts/validates it, reloads the user and checks active state and current role on each request. Login has `throttle:10,1`; password creation/reset explicitly allows 6–72 characters and does not use the provider's stronger default password rule.

The browser stores token/role/username in localStorage. Backend middleware is authoritative. Admin-only routes cover users, expenses, reports, payment voids and all sale updates. Signed-in staff can read correction history, maintain catalog, archive clients and mutate stock. Dashboard remains shared with expense/sales totals. Broader permission changes were outside the approved initial scope.

Logout only returns 204; frontend logout only clears localStorage. No token revocation/session registry exists. Password reset alone does not revoke a token; deactivation blocks it while inactive. React's cached role can remain stale after a role change, while API permissions immediately reflect the database.

`bootstrap/app.php` forces JSON for API errors and maps validation to 422 `{detail, errors}` and HTTP aborts to `{detail}` with their status. Conflicts use 409, missing records generally 404, unauthorized/forbidden use 401/403. Unexpected exceptions rely on Laravel handling rather than a unified business recovery mechanism. `apiClient` redirects on 401, otherwise throws `detail` or a generic status error; network/non-JSON errors have no durable recovery queue. Invoice direct fetch has its own error handling.

`ClientProfilePage::loadAll` now uses `Promise.all`: any failed client/history/catalog request shows an explicit error and Retry instead of a misleading empty history or ₱0 billed. `SaleDetailPage` clears prior errors when reloading and includes correction history in its required requests. `SaleForm` reports client/service-choice load failures. Some other existing page loaders still retain prior errors after success; unrelated refactoring was avoided.

## Reports: exact meanings

`DashboardController::index`, `ReportController` and `pages/dashboard/DashboardPage.jsx` establish the following:

| Output | Calculation / limitation |
| --- | --- |
| Today's sales | Sum/count by `sale_date`, including unpaid bills. Not payment-date cash collections. |
| Clients served | Distinct clients with procedures dated today. Not sale count or booking attendance. |
| Outstanding dashboard | Total of unpaid/partial sales less their recorded payments; negative overall result clamped to zero. Depends on stored statuses being correct. |
| Upcoming dashboard | Upcoming/due reminders from today through today + 7 days, inclusive, capped at 10; overdue count is separate. |
| Sales range | Sales selected by sale date; all their currently recorded payments summed regardless of payment date. Later payments/voids alter past-period output. |
| Outstanding clients | Groups only unpaid/partial sales by client; totals are not lifetime billed/paid. Archived clients are not excluded. |
| Expenses | Daily/range/category sums by expense date; no purchase auto-posting. Category date bounds are validated independently, without range-order validation. |
| Current stock | Active items only, low stock when quantity ≤ configured minimum. |
| Usage “by procedure” | Groups by inventory item, not procedure. Optional dates filter procedure date. |
| Usage by client | Groups client/item with optional client ID; no date filtering in this method. Cost is quantity × cost-at-use, treating all-null sums as zero. |
| Follow-ups report | Client names, date/status; optional status filter, no date range implemented. |

No reports route/page is registered in `App.jsx`. Tests only check a sales-range total/outstanding and one expense daily total; they do not establish cash reconciliation, multi-client outstanding correctness, dashboard semantics or usage report accuracy. No profit, refund, aging or fixed historical report snapshot workflow exists.

Date fix: `resources/clinic/src/lib/utils.js::todayISO()` now formats local year/month/day. `ExpenseForm` refreshes a new expense's date whenever opened. The Node regression test freezes 01:00 Philippine time and advances a day. Browser dates follow the computer timezone; backend “today” still uses `config('clinic.timezone')`, default Asia/Singapore (UTC+8). New-client count still compares stored creation dates directly; that reporting boundary was outside this fix.

## Implemented administrator sale corrections

The user approved this initial scope. The implementation follows existing controllers and JSON contracts without new dependencies or a separate abstraction layer.

| Approved requirement | Implementation |
| --- | --- |
| Administrator only, required reason | PUT/PATCH sales routes use admin middleware. Whitespace-only reasons rejected; limit 2,000 characters. Old staff date/notes bypass is closed. |
| Original values/time/user | Append-only API history stores sale and line snapshots before/after, actor foreign key, reason, UTC time and increasing per-sale revision. |
| Existing payments unchanged | Correction code does not write payments; tests compare every payment field before/after. |
| Calculate from corrected lines | Description/quantity/price, sale date and notes may change; lines can be added/removed. Submitted totals are ignored. Client/procedure-link changes prohibited; retained lines keep their original treatment link. Existing aggregate rounding preserved. |
| Reject below paid | Current recorded-payment sum is read under the sale lock. Below-paid returns 409; equal-to-paid marks paid. Voided payments excluded. |
| Atomic consistency | Line writes, sale total/status/version and audit insert share one transaction. A persistence-failure test verifies full rollback. |
| Stale corrections | Integer version comparison rejects stale forms after correction/payment/void. A failed or uncertain save can be reviewed via reload; retry cannot silently add a second correction using the old version. |
| Issued invoice identification | Same INV number, explicit correction revision in PDF and email. Financial values are loaded under a shared sale lock. Full issued-PDF archives remain absent. |

The correction form reuses `SaleForm` with a saved sale and `expected_version`; existing line IDs are scoped to that sale, new lines have no procedure link. `GET sales/{id}/corrections` joins actor usernames and decodes snapshots; no model/factory was needed for this append-only history table. `SaleDetailPage` shows expandable before/after tables and a discard-and-reload option after save errors. Wrong-client handling, duplicate/cancelled sale disposition, complimentary semantics, changing rounding and real-reference replacement after a void still need decisions. Refund approval, payout evidence, inventory consequences and financial-period treatment remain future work.

## Automated coverage and missing checks

`tests/Pest.php` applies `RefreshDatabase` to feature tests. `tests/Feature/ClinicWorkflowTest.php` contains 15 behavioral tests; helpers use `User::factory()` and generated encrypted credentials, so most tests bypass login. `tests/Feature/ExampleTest.php` is a home-response smoke test; `tests/Unit/ExampleTest.php` only asserts true. Neither substitute for a business workflow test.

| Existing check | What it proves, and limit |
| --- | --- |
| Invalid/expired/malformed credentials | Selected 401 responses. No logout replay/password-reset revocation tests. |
| Staff permission denial | Report GET, expense POST and user list denied. Not a complete role/method matrix. |
| Imported bcrypt login | Successful/failed login, normalization and hash hiding on `/auth/me`. |
| Clients | Create/edit/search/archive preserves the client row. Not duplicate handling or archived profile recovery. |
| Supplies (three tests) | Fractional deduction, no double restore, complete insufficient-stock rollback and ignoring injected nested IDs. |
| Purchases/adjustments | Quantity/cost after receipt; invalid deductions/additions rejected. Not purchase retries/returns/concurrency. |
| Payments | Partial payment, same-request sequential retry, stale balance and overpayment rejection, void balance/status, patch blocked and original amount/reason retained. No full-settlement assertion or actor/timestamp assertion. |
| Reports/decimal totals | Basic sale arithmetic, sales-range outstanding, daily expense sum and aggregate rounding. |
| Validation | Missing client names returns expected 422 and inserts nothing. Not the full validation matrix. |
| Invoices (two tests) | PDF file signature, missing SMTP 503, fake email recipient/PDF content. No layout, live delivery, failure/retry or immutable snapshot verification. |
| Corrections (21 cases) | Administrator/staff/anonymous access, reason/version/client/input constraints, preserved payments and original values/actor/time, below-paid rejection, equal-paid status, void exclusion, stale correction/payment/void versions, foreign line ownership, added/removed fractional lines, transaction rollback, preserved treatment links, reopening a paid sale with reconciled reports, and corrected invoice marker/escaping. |
| Local date (Node) | `resources/clinic/src/lib/utils.test.js` freezes 01:00 Asia/Manila and advances a day; verifies current local dates. |

High-value missing tests: authenticated browser client→visit→sale→payment→correction→void/replacement; profile-load failure and Retry in a browser; actual parallel payment/void/correction/stock operations; changed-payload payment-key retries; voided reference replacement; new-sale ownership/repeated procedure billing/failed creation rollback; complete role matrix; inactive client/item handling; service deactivation and history renames; reminder independence/overdue editing; expense changes/deletion audit; cross-period reports and archived-client balances; invoice content after void and genuinely concurrent reads. Stale requests are tested sequentially, not through simultaneous processes.

Executed commands:

```text
php artisan test --compact tests/Feature/SaleCorrectionTest.php tests/Feature/ClinicWorkflowTest.php
php vendor/pestphp/pest/bin/pest --configuration=phpunit.mysql.xml tests/Feature/SaleCorrectionTest.php tests/Feature/ClinicWorkflowTest.php --colors=never
php vendor/bin/pint --dirty --format agent
php vendor/bin/phpstan analyse --no-progress --memory-limit=512M
npm run build
# From resources/clinic:
node --test src/lib/utils.test.js
```

Default `phpunit.xml` uses in-memory SQLite. `phpunit.mysql.xml` forces local MySQL and `skin_goddess_verification`; tests refresh that database. Never repoint it at clinic data. CI builds then runs checks/default SQLite tests; it does not exercise MySQL locks or browser workflows. The Node test uses Node's built-in runner, with no dependency changes. The focused backend suites, formatter, static analysis, build and date test were run. For the complete suite, run `php artisan test --compact`; use the separate MySQL configuration when checking MySQL behavior.

## Laragon operation and recovery

`README.md` documents daily Start All → sign in → finish saves/sign out → Stop All, with no development server needed. The inspected `C:/laragon/etc/apache2/sites-enabled/01-skin-goddess.conf` binds Apache on loopback port 80, points to this project's `public`, permits overrides and requires local requests. This verifies the file, not active Apache state or Windows firewall exposure.

Root `npm run build` invokes `resources/clinic/build.mjs`; root `npm run dev` delegates to Vite, whose proxy is configured in `resources/clinic/vite.config.js`. Dependencies and builds are developer tasks. Do not run `composer setup` against the operating clinic casually: it includes migrations and frontend installation. No Inertia SSR or Wayfinder workflow is used by this frontend.

README documents manual backups, protected outside copies, preserving `.env`/APP_KEY/source/build, and restoring to a separate empty database first. Before this migration, `mysqldump` completed successfully and produced `storage/app/backups/clinic-before-sale-corrections-20261020-214327.sql` (34,707 bytes). The migration then ran successfully on the clinic database. Do not roll it back casually: rollback drops correction history and the version column. `.gitignore` excludes backups and generated assets. No outside copy, automated backup schedule or successful restore drill was verified. No credentials or client data are included here.

## Completed scope and remaining implementation order

1. **Completed:** approved date defaults, profile-load error handling, administrator sale corrections, preserved revisions, below-paid limit and version conflicts coordinated with payments/voids. Migration and production assets are applied locally.
2. **Next decisions:** refunds/cancellations and real-reference payment replacement; broader staff permissions; expense/supply correction history; backup ownership and recovery evidence.
3. **Next financial workflows:** explicit refunds/cancellations, expense history and purchase reversals before claiming full financial control.
4. **Then staff screens and reporting:** supply entry, deliberate reminder creation/linkage, reports with approved date semantics and day-end reconciliation; verify complete browser paths and real concurrent requests on MySQL.

The approved initial Phase 2 scope is complete. Refunds, cancellations, broader permission changes and inventory/reminder/report screens were not added.
