# Skin Goddess: technical audit

## Checkpoint 2E — React integration and acceptance, 25 October 2026

Authorization: explicit owner “yes” after the 2D report. All paths below are repository-relative. No dependencies, environment files, Laragon settings, payment algorithms or operating clinic data were changed. Three package migrations remain unapplied to the operating database; `resources/clinic/dist` was built for verification but not copied into published `public` assets. The pre-existing user edit to `resources/clinic/index.html` was preserved.

### Source changes

- `resources/clinic/src/pages/sales/SaleForm.jsx`: ordinary/package purchase mode; fixed single line, full price, treatment and positive allowance; purchased client/type/allowance remain locked during existing administrator sale corrections. `SalesPage.jsx` adds package/canceled badges. `SaleDetailPage.jsx` loads authoritative progress, catalog treatment and financial summary separately and retains existing payments, voids, correction and invoice flows.
- `resources/clinic/src/pages/sales/PackageSessions.jsx`: derived progress, immutable completion/supply/audit history, cancellation status and administrator reason/version dialogs. A stale audit response blocks resubmission until reload and review. `resources/clinic/src/components/shared/FormDialog.jsx` adds optional submit-only disabling.
- `resources/clinic/src/pages/procedures/PackageSessionForm.jsx`: completed date, notes, optional follow-up and actual supply quantities; explicit no-additional-supplies acknowledgement; original request recovery. `ProcedureForm.jsx` retains standalone entry and adds exact-purchase selection that opens its session workflow. `ProceduresPage.jsx` links covered records to their purchase instead of generic edit and identifies reversed/canceled history.
- `resources/clinic/src/pages/clients/ClientProfilePage.jsx`: independent progress and balance per purchase, included/reversed/canceled history labels, retained ordinary actions and explicit reload on failed data retrieval. Package cards use existing client-filtered sales plus per-purchase summary/session requests; large histories may need later pagination. `resources/clinic/src/pages/dashboard/DashboardPage.jsx` clarifies that its existing date-based count includes retained records, rather than representing valid package progress.
- `resources/clinic/src/services/salesService.js`, `inventoryService.js`: existing JSON client wrappers for session/audit actions and active supply choices. `apiClient.js` preserves HTTP status/validation errors and replaces unreadable responses with a connection/retry message. No replacement payment service.
- `resources/clinic/src/lib/packageRequests.js`: save the original purchase/completion payload and key in session storage before sending; uncertain network, server and conflict results retain that snapshot. Scope purchases by username and completions by username plus sale ID. Reopened fields stay locked; explicit history-review acknowledgement is required to discard. Cross-tab/device recovery is not promised. Storage unavailable blocks unsafe new package submission.
- `app/Http/Controllers/SaleController.php::sessions`: includes current sale version under its existing shared lock and eager-loads `supplies_used.inventory_item` for readable history. `app/Http/Controllers/ProcedureController.php::index` loads `package_sale:id,canceled_at` for canceled history badges. `tests/Feature/PackagePresentationTest.php` verifies response version, supply identity, safe actor fields, cancellation/reversal progress and procedure-list cancellation metadata. No additional schema/routes were required in 2E.

### Actual verification

Final focused backend runs (six feature files: `ClinicWorkflowTest.php`, `SaleCorrectionTest.php`, `PackagePurchaseTest.php`, `PackageSessionTest.php`, `PackageCorrectionTest.php`, `PackagePresentationTest.php` under `tests/Feature/`): **SQLite 146 passed, five MySQL-only skips, 1,456 assertions; dedicated MySQL 151 passed, 1,562 assertions, no skips.** Both exited 0. All five independent-process race tests executed on `skin_goddess_verification`. Pint passed; PHPStan reported zero errors. No full-suite pass is claimed.

Frontend commands from `resources/clinic`:

```text
npm run build
node --test src/lib/packageRequests.test.js src/lib/utils.test.js
node node_modules/eslint/bin/eslint.js src/pages/sales/PackageSessions.jsx src/pages/procedures/PackageSessionForm.jsx src/lib/packageRequests.js src/lib/packageRequests.test.js src/services/inventoryService.js src/services/salesService.js src/services/apiClient.js
```

All exited 0: four Node tests passed; the build succeeded with the existing-size warning for a bundle over 500 kB. Focused new-component/helper/service lint passed. Lint across touched legacy forms/pages still reports seven existing `react-hooks/set-state-in-effect` errors in initialization/loading effects; this is not an all-lint-clean result. Unrelated effect refactoring was deliberately excluded.

Browser checks used a temporary loopback API on port 8097 with process-only testing/MySQL settings, and a temporary Vite server on port 5175 explicitly proxying to it. Only disposable `skin_goddess_verification` fixtures were used. Verified: six-session ₱12,000 purchase; ₱4,000 cash payment with ₱8,000 owed; completion with 1.125 ml supply; audited reversal; replacement with no additional supplies; cancellation preserving ₱8,000 debt and payment history; staff purchase/completion without administrator controls; one-session exhaustion; API outage retaining a locked pending completion across reload and successful original-key retry; ordinary standalone procedure and ₱500 sale creation. Browser-console check after recovery returned no errors. API outage testing prompted the clear unreadable-response message fix. Browser coverage does not claim mobile, live email delivery, invoice download, every validation branch or manual stale-version conflict coverage; backend tests cover authorization/conflict/financial invariants.

### Release boundary and remaining risks

Owner review remains necessary before deployment. Back up operating data and deliberately apply all three additive migrations before publishing the new frontend. Never run test refresh/wipe commands on clinic data. Migration rollback after real use would destroy package/audit relationships; prefer forward corrections. Existing informal packages need reviewed manual reconciliation, and refund/settlement and stock corrections remain separate administrator decisions. Session storage is a convenience for uncertain requests, not an audit database; staff must review history after a tab/storage/device change. Inactive treatments block new completions pending administrator review. Follow-up reminders remain separate records. After confirming test isolation, the owner can run `php artisan test --compact` for the complete suite.

## Checkpoint 2D — audit transitions implemented, 25 October 2026

Owner authorization: explicit “yes” to the Checkpoint 2D approval request. Only backend reversal/cancellation and their tests/docs are included. React, payment logic, Laragon, dependencies and configuration remain unchanged. The operating clinic database has not received any package migration. Earlier sections below retain their checkpoint-specific history.

### Schema, endpoints and source

- `database/migrations/2026_10_24_163127_add_package_reversal_and_cancellation_audit.php`: nullable `sales.canceled_at` (microsecond timestamp), `canceled_by_user_id` foreign key to users, `cancellation_reason`; nullable `procedures.reversed_at`, `reversed_by_user_id` foreign key to users, `reversal_reason`. These terminal transitions occur once, so original immutable records plus actor/time/reason provide audit history without another table. No data is inferred/backfilled. Rollback would discard audit information after real use; prefer forward fixes.
- `app/Models/Sale.php`, `app/Models/Procedure.php`: timestamp/actor casts and `canceled_by`/`reversed_by` relationships to existing `ClinicUser`. Audit fields are not mass assignable.
- `routes/api.php`: administrator-only `POST /api/sales/{id}/cancel-package` → `SaleController::cancelPackage`; `POST /api/sales/{id}/sessions/{procedureId}/reverse` → `ProcedureController::reversePackage`. Both take `{"reason":"Administrator-reviewed explanation","expected_version":1}`. Reason is trimmed, required, string, max 2,000; version is required nonnegative integer. Invalid input returns 422; staff 403; anonymous 401; unknown sale/procedure 404. Reversal uses the sale's procedure relationship, so a procedure from another package returns 404. Ordinary sales cannot be canceled as packages (422).
- `app/Http/Controllers/SaleController.php`: cancellation locks the sale, checks package identity, noncanceled state and current version, sets actor/time/reason and increments version atomically. It never modifies lines, totals, payment status, payments or stock. New/ordinary sale correction input explicitly prohibits cancellation fields. Existing financial correction safeguards remain available after cancellation.
- `app/Http/Controllers/ProcedureController.php`: reversal locks sale then scoped procedure, rejects a previous reversal or stale version, stamps reversal audit fields and increments sale version in one transaction. The original completion key/fingerprint, actor/date/ordinal, notes and supplies remain intact. Reversals are permitted on canceled packages to correct history, but never reactivate them. Generic procedure create/update and package completion explicitly reject forged reversal fields.

### Completion, progress, retry and concurrency rules

Completion still locks service → sale → completion → inventory. New completion checks `canceled_at` before consuming anything; current allowance counts only linked procedures with `reversed_at IS NULL`. Maximum ordinal still includes reversed rows, so replacement ordinal 7 on a six-session purchase is valid when only six unreversed completions exist. No counter is stored and no prior number is reused.

`SaleController::sessions` keeps all procedure rows/supplies in ordered history and eager-loads safe completion/reversal actor details. It returns included, valid completed, remaining and reversed counts, plus `is_canceled`, cancellation reason/time/actor. Remaining remains included minus valid completions even on a canceled purchase; the cancellation flag forbids redemption. Other old dashboard/profile totals count retained procedure records, including reversals, and are not package progress. 2E acceptance must distinguish those labels/counts before live package use; inventory usage intentionally retains recorded consumption.

Saved completion retries are resolved before cancellation/exhaustion checks. Retrying a reversed or canceled purchase's original completion returns its original row (including reversal fields) without consuming allowance or stock. A new key on a canceled purchase returns 409. Repeating cancellation/reversal returns 409 and preserves the first audit entry; there is no reopening or undo endpoint. The UI must reload on 409 and review current state/version rather than silently retrying an altered decision. Cancellation does not prohibit later installment collection, payment voids or financial corrections, nor change outstanding-report inclusion. Billing PDFs remain current financial summaries, not refund/cancellation settlement documents.

Shared sale locks coordinate progress reads; exclusive sale locks coordinate completion, correction, payment, cancellation and reversal. If completion wins a race with a reviewed cancellation, version changes make the old cancellation stale; after review, cancellation can be resubmitted with the current version. If cancellation wins, new completion is rejected. Concurrent duplicate reversals restore allowance once. If an exhausted completion races with reversal, it either fails before reversal or succeeds after the slot is restored, without exceeding the valid allowance. No stock adjustment, refund computation, reminder cancellation or financial transfer is triggered.

### Verification and remaining boundary

Reconfirmed Laravel 13.36.0, no `.ai/rules`, existing SQLite memory/MySQL verification configurations, no inherited database override and no cached config. Continued project Laravel/testing skills and sufficient API guidance already inspected; Boost tools remain unavailable. Read-only MySQL target checks confirmed `skin_goddess_verification` is separate from operating `.env`; its one client/sale/procedure and zero payments were the previous concurrency fixtures, with zero nonmatching client/sale rows. Only that disposable database and SQLite memory were refreshed by tests. No clinic-data migration or destructive clinic command was run.

`tests/Feature/PackageCorrectionTest.php` covers audit actors/timestamps/reasons, exact preservation of original completion/supply/stock/movement/payment data, allowance restoration once, new ordinals, old-key retries, canceled historical reversals, continued debt collection/voids/corrections, duplicate actions, access control, malformed reasons/versions, stale payment changes, foreign-package scoping, injected audit fields and transaction rollback. Three additional MySQL cases use independent PHP processes and a held test sale lock for duplicate reversal, cancellation-versus-completion and reversal-versus-completion races. `tests/Feature/PackagePurchaseTest.php` upgrade test now removes/reapplies audit schema around earlier migrations to continue verifying preserved ordinary records.

Commands:

```text
php vendor/pestphp/pest/bin/pest --configuration=phpunit.xml tests/Feature/PackageCorrectionTest.php tests/Feature/PackageSessionTest.php tests/Feature/PackagePurchaseTest.php tests/Feature/ClinicWorkflowTest.php tests/Feature/SaleCorrectionTest.php --colors=never
php vendor/pestphp/pest/bin/pest --configuration=phpunit.mysql.xml tests/Feature/PackageCorrectionTest.php tests/Feature/PackageSessionTest.php tests/Feature/PackagePurchaseTest.php tests/Feature/ClinicWorkflowTest.php tests/Feature/SaleCorrectionTest.php --colors=never
php vendor/bin/pint --dirty --format agent
php vendor/bin/phpstan analyse --no-progress --memory-limit=512M
php artisan route:list --path=reverse --except-vendor
php artisan route:list --path=cancel-package --except-vendor
```

Final focused results: **SQLite: 145 passed, five MySQL-only skips, 1,435 assertions; dedicated MySQL: all 150 passed, 1,541 assertions, no skips. Both exited 0.** The MySQL run included all five independent-process concurrency cases from 2C/2D. Duplicate reversals returned one success and one conflict; reversal/completion and cancellation/completion races preserved valid allowance and terminal cancellation rules. Pint passed; PHPStan passed with zero errors; route inspection confirmed both new actions; whitespace checks passed; `composer.lock` is unchanged. No browser acceptance or full-suite pass is claimed; the owner can run `php artisan test --compact` after confirming isolation.

Next checkpoint 2E requires explicit approval: update `resources/clinic/src/pages/sales/SaleForm.jsx`, `SaleDetailPage.jsx`, `resources/clinic/src/pages/clients/ClientProfilePage.jsx`, `resources/clinic/src/pages/procedures/ProcedureForm.jsx`, `ProceduresPage.jsx` and related existing service wrappers. Add purchase keys, exact-package selection, actual supply entry, valid-progress and canceled/reversed badges, immutable history, admin reason/version dialogs, conflict reloads and acceptance checks; preserve existing ordinary sale/procedure/payment flows. Deployment of the three additive package migrations to clinic data remains a separate deliberate step, with backups and review of live-use readiness.

## Checkpoint 2C — completed-session backend, 25 October 2026

Authorization: owner replied “yes, let's proceed” to the 2C approval request. Only 2C is implemented. The sections below preserve earlier checkpoint evidence. No changes to payments, React, Laragon, dependencies, configuration or operating clinic data were made. No administrator reversal/cancellation operation has been implemented; these remain 2D.

### Source and database changes

- `database/migrations/2026_10_24_161715_add_package_completion_fields.php`: nullable unique `procedures.completion_key` (64), nullable hidden `completion_fingerprint` (64), nullable `completed_by_user_id` foreign key to users, and unique `(package_sale_id, session_number)`. Ordinary procedures keep null package/key/actor fields and their existing manual-number behavior. No new status/counter/payment tables. Both new migrations must precede live package use; neither has been run against the operating database. Rollback after real completions would discard audit/retry information and is not routine recovery.
- `app/Models/Procedure.php`: completion actor relationship to `ClinicUser`, actor integer cast, hidden fingerprint; protected completion fields remain outside mass assignment.
- `app/Http/Controllers/ProcedureController.php`: `completePackage` records completed visits and supplies using existing `recordSupply`. Generic create still prohibits package links and now rejects server completion fields. Generic update rejects any package procedure change (409). Supply append/removal also rejects package procedures (409); this preserves the original detail and prevents untracked stock restoration pending audited correction work. Ordinary procedure and supply operations retain their behavior.
- `app/Http/Controllers/SaleController.php`: `sessions` returns derived progress and ordered procedure history under a shared sale lock. Existing sale creation refuses billing a procedure already covered by a package (422); arbitrary free-text billing cannot be recognized as a duplicate without a real procedure link, and no description inference was added.
- `routes/api.php`: signed-in staff/administrator `GET /api/sales/{id}/sessions` (history/progress) and `POST /api/sales/{id}/sessions` (completion). Ordinary sales return 422 for these package operations; missing sales return 404. `tests/Feature/PackageSessionTest.php` covers the new behavior. `tests/Feature/PackagePurchaseTest.php` upgrade test now removes/reapplies dependent completion schema in the correct order when verifying old ordinary data.

Completion request example (purchase ID is in the route):

```json
{"client_id":1,"service_id":2,"procedure_date":"2026-10-25","completion_key":"package-session-completion-001","supplies":[{"inventory_item_id":3,"quantity_used":"1.125"}]}
```

Client/service must match the purchase. The key uses the same 16–64 lowercase ASCII letter/digit/underscore/hyphen format as purchase keys. Price and session number are server-controlled; no additional charge is stored (`price=null`). Optional notes/follow-up date retain existing behavior and do not auto-create reminders. Supplies are optional, must have distinct item IDs, and use existing quantity/cost validation; no consumption is guessed if omitted. Client, service, date, notes/follow-up and sorted normalized supply input are fingerprinted. Same-key/equivalent-input retry returns original completion (200), new completion returns 201, conflicting reuse or exhausted allowance returns 409. Retries are checked before exhaustion/inactive-treatment checks and never deduct stock or increase the sale version again.

### Atomicity, progress and protection

Lock order is service → sale → existing completion → inventory sorted by ID, consistent with purchase catalog locks. The service lock preserves the existing active-treatment rule. The sale lock serializes allowance checks, ordinal assignment, procedure/supply/movement inserts and sale-version increment in one transaction with up to three retry attempts. Insufficient stock or persistence failure rolls everything back, including the completion key and version. Unique keys provide a second duplicate barrier; the specific unique-constraint recovery only returns an existing completion with a matching fingerprint. A cross-purchase key cannot create another session.

Each package procedure is a completed record at this checkpoint; there are no bookings, reversals or cancellations in the data model yet. Completed = linked procedure count; remaining = included − completed. Session number is maximum prior ordinal + 1, never a financial quantity or progress counter. Once 2D introduces reversals, both enforcement and summaries must count only unreversed completions while keeping monotonically increasing ordinals and original rows. Current history is immutable and bill-linked sessions cannot be moved between packages through the API. Completion increases the existing sale version, so an old financial correction form becomes stale rather than ignoring intervening progress.

### Verification boundary

PHP/Laravel versions, missing `.ai/rules`, isolated SQLite configuration and absence of inherited database overrides/config cache were rechecked. Boost tools are still unavailable; reused the official Laravel 13 API guidance and inspected installed APIs. Installed Symfony Process 7.4.21 is reused only by concurrency tests; no dependency was added.

Before any MySQL test writes, a read-only check confirmed `SELECT DATABASE()` is `skin_goddess_verification`, distinct from operating `.env`, with 23 tables and zero clients, sales, procedures and payments. Test runs use the existing `phpunit.mysql.xml`, never the clinic database. Concurrency cases additionally require that exact database and empty database URL, commit only their test-fixture transaction, start two independent PHP processes with explicitly inherited test connection values, hold/release a test service lock to coordinate overlapping requests, and inspect HTTP results plus stored stock/counts. Child processes reject any non-testing/non-verification target. SQLite skips those two cases explicitly. No verification script or dependency/configuration file was created.

Coverage includes unpaid/partial/full payment independence and voids, per-purchase numbering, final allowance and exhausted retries, normalized/reordered supply retries, changed-payload/cross-purchase key conflicts, client/service mismatch, ordinary-sale rejection, stock/persistence rollback, actor fields and forged input, protected records/supplies, rebilling rejection, inactive-service behavior, database uniqueness, authentication, and ordinary numbering without inferred entitlement. Reversal/cancellation/browser behavior is not claimed. Initial test setup failed once because staff promotion used a non-fillable model field; fixed the fixture with explicit server-side assignment. Static analysis identified a nullable-model boolean condition and it was changed to an explicit null comparison.

Verification commands (all executed outside sandbox file/socket restrictions):

```text
php vendor/pestphp/pest/bin/pest --configuration=phpunit.xml tests/Feature/PackageSessionTest.php tests/Feature/PackagePurchaseTest.php tests/Feature/ClinicWorkflowTest.php tests/Feature/SaleCorrectionTest.php --colors=never
php vendor/pestphp/pest/bin/pest --configuration=phpunit.mysql.xml tests/Feature/PackageSessionTest.php tests/Feature/PackagePurchaseTest.php tests/Feature/ClinicWorkflowTest.php tests/Feature/SaleCorrectionTest.php --colors=never
php vendor/bin/pint --dirty --format agent
php vendor/bin/phpstan analyse --no-progress --memory-limit=512M
php artisan route:list --path=sessions --except-vendor
```

Final verification after adding explicit partial-payment and ordinary-numbering cases: **SQLite: 114 passed, two MySQL-only skips, 1,020 assertions; dedicated MySQL: all 116 passed, 1,058 assertions, no skips**. Both commands exited 0. The MySQL concurrency cases verified final-slot requests produce 201/409 and identical retries produce 201/200, with exactly one procedure, one supply entry and one deduction in both cases. Pint passed; PHPStan passed with zero errors; route inspection confirmed both session endpoints; documentation/code whitespace checks passed. `composer.lock` is unchanged. The complete suite and browser acceptance remain separate checks; the owner can run `php artisan test --compact` with verified isolation.

After the final test-import cleanup, reran `tests/Feature/PackageSessionTest.php` alone: SQLite 32 passed/two skipped, 338 assertions; dedicated MySQL all 34 passed, 376 assertions. Both exited 0; Pint passed again.

Next checkpoint 2D, only with explicit confirmation: administrator-only reasoned reversals restoring allowance without restoring supplies, cancellation blocking future completions without changing debt/payments, preserved actors/timestamps/original records, and updates to counts/retry/history behavior. Staff React integration remains 2E.

## Checkpoint 2B — implemented in source, 25 October 2026

Owner authorization: explicit “yes” in response to “Do you approve Checkpoint 2B?” Only 2B is implemented. This section supersedes earlier proposed-schema and implementation-status statements below. No migration was applied to operating MySQL, no React/build/hosting/configuration/dependency changes were made, and no session completion/reversal/cancellation APIs were added. The pre-existing `resources/clinic/index.html` edit remains untouched.

### Implemented files and contract

- `database/migrations/2026_10_24_160253_add_package_purchase_fields.php` (generated by Artisan; timestamp is UTC): nullable `sales.package_service_id` foreign key to services, unsigned integer `included_sessions`, unique nullable `package_purchase_key` (64), nullable `package_purchase_fingerprint` (64), and indexed nullable `procedures.package_sale_id` foreign key to sales. No defaults infer packages from old records. Existing ownership/price/payment columns remain authoritative. Database foreign keys prevent removal of referenced records; positive allowance and required field grouping are enforced by the API. The rollback drops these fields and would lose package history after real use; prefer forward fixes.
- `app/Models/Sale.php`: package treatment and procedure relationships, integer casts and purchase fields; fingerprint is server-assigned and excluded from JSON. `app/Models/Procedure.php`: inverse purchase relationship and cast; package link is deliberately not mass assignable yet.
- `app/Http/Controllers/SaleController.php`: existing `POST /api/sales` accepts `package_service_id`, `included_sessions` and `package_purchase_key` together. Allowance is 1–2,147,483,647; key is 16–64 lowercase ASCII letters/digits/underscores/hyphens (UUIDs fit). Package line count must be one, quantity numerically one (omission defaults to one), with no billed `procedure_id`. Catalog must be active for a new purchase; successful retries still work after deactivation. Unit price is the full package price under existing decimal limits; zero remains accepted under existing complimentary-sale semantics.
- The controller normalizes numeric identity/allowance/price fields, fingerprints original client/treatment/allowance/date/notes/description/price, and saves fingerprint with sale/line in one transaction. Same-key/equivalent-input retries return 200 and the existing sale; new purchase returns 201; different original input with the same key returns 409. Price is normalized to two decimal places, quantity must be one, and omitted notes/null notes are equivalent. The original fingerprint survives later audited financial corrections, so replay returns the current corrected sale rather than recreating it. A treatment row lock serializes same-treatment purchase creation; the unique request-key index and a specific unique-constraint catch handle competing key inserts. Actual multi-process MySQL concurrency remains unverified.
- Existing administrator correction endpoint prohibits package identity/allowance/key/fingerprint submissions and conversion of ordinary sales into packages. For package sales it requires the original single line ID and quantity one. Existing reason/version/snapshots/payment preservation/below-paid rules remain; description, price, sale date and notes remain correctable. Ordinary corrections keep their line flexibility.
- `app/Http/Controllers/ProcedureController.php`: generic create/update rejects a nonempty `package_sale_id` with 422. This prevents accidental package use before 2C; ordinary procedure/stock behavior is unchanged. No progress counters are stored or session endpoints enabled. `tests/Feature/PackagePurchaseTest.php` covers the new purchase contract and boundary. Existing routes, payments and inventory code were reused.

Example new purchase request body for `POST /api/sales` (IDs refer to real selected records):

```json
{"client_id":1,"sale_date":"2026-10-25","package_service_id":2,"included_sessions":6,"package_purchase_key":"package-purchase-request-001","items":[{"description":"Six facial sessions","quantity":1,"unit_price":"12000.00"}]}
```

### Verification and deployment boundary

Rechecked `phpunit.xml`, absence of config cache/inherited database overrides, and installed Laravel 13.36.0 before edits. Boost search/schema tools remain unavailable; inspected existing migration sources and installed framework APIs, and consulted official Laravel 13 [validation](https://laravel.com/framework/docs/13.x/validation), [migration](https://laravel.com/framework/docs/13.x/migrations) and [query](https://laravel.com/framework/docs/13.x/queries) documentation. No dependency repair or configuration change was necessary.

Executed outside the sandbox readability restriction:

```text
php vendor/pestphp/pest/bin/pest --configuration=phpunit.xml tests/Feature/PackagePurchaseTest.php --colors=never
# 44 tests passed, 349 assertions
php vendor/pestphp/pest/bin/pest --configuration=phpunit.xml tests/Feature/PackagePurchaseTest.php tests/Feature/ClinicWorkflowTest.php tests/Feature/SaleCorrectionTest.php --colors=never
# Final run: 82 tests passed, 682 assertions (46 new package cases plus 36 existing cases)
php vendor/bin/pint --dirty --format agent
php vendor/bin/phpstan analyse --no-progress --memory-limit=512M
```

The initial purchase-only run and final combined run returned exit 0 on SQLite in memory. New checks cover successful staff purchase without stock/payment/treatment effects, ordinary fractional bills and no inferred entitlement, invalid fields/shape, normalized retries and conflicting reuse, separate purchases, inactive-service handling, protected corrections, payment/void integration, premature linking rejection, relationships, authorization and full transaction rollback/retry on line persistence failure. Two additional cases enforce database key uniqueness independently of API validation and verify upgrading populated ordinary sales/payments/procedures without inferring entitlements. Intermediate schema-test runs found an index-removal ordering issue (fixed in the migration) and SQLite's inability to toggle foreign keys within the test wrapper transaction (the migration test now exits that wrapper before exercising the upgrade). Final result is 82/82 passed; no remaining test failure. Formatting passed after its initial sandbox writability check failed. Static analysis passed with zero errors after replacing an ambiguous model lookup with an explicit single-row query; no vendor modification was required. MySQL tests, browser acceptance and full suite are not claimed as executed. Full suite: ask the owner to run `php artisan test --compact` with verified isolation outside the sandbox restriction.

Deploy additive migration before enabling package API requests; no operating-database migration has been run in 2B. Ordinary frontend forms still submit the old contract. Do not backfill existing informal packages. MySQL schema/locking behavior and real concurrent purchase retries require separate isolated verification before live package use. New tests do not prove payment/concurrency cases beyond their assertions; existing payment retry/reference limitations remain unchanged.

Next checkpoint 2C, only after approval: completion key/fingerprint/actor fields, transactional package-session creation with supplies, client/treatment match, remaining-session checks, duplicate protection and no repeat billing, with functional/concurrency coverage. Reversal/cancellation history and staff screens remain reserved for 2D/2E.

## Checkpoint 2A — current assessment, 24 October 2026

Only test-environment verification, design and the two requested documents are authorized. This section supersedes Phase 1's pending-policy wording below; the owner has approved the package business policies, but no package code, migration, schema or React changes have been implemented. Each subsequent checkpoint needs explicit approval.

### Environment and bootstrap diagnosis

- PHP CLI: `C:/php/php.exe`, PHP 8.3.33. Composer 2.10.2 is available. `composer show --direct` confirms installed Laravel 13.36.0, Pest 4.7.8, Pest Laravel plugin 4.1.0 and Collision 8.9.5. `pdo_sqlite`, `sqlite3` and `pdo_mysql` are loaded. Locked dependencies are present; `require "vendor/autoload.php"` succeeds.
- Reproduced failure with `php vendor/pestphp/pest/bin/pest --configuration=phpunit.xml --list-tests --colors=never`: exit 1, cannot open bootstrap. In the execution sandbox, `is_file("vendor/autoload.php")` is true but `is_readable(...)` is false. `vendor/phpunit/phpunit/src/TextUI/Configuration/BootstrapLoader.php` rejects the latter before inclusion. The same read-only PHP check outside the sandbox returns readable for autoload and the feature test. This is a sandbox readability-check restriction, not evidence of missing dependencies or a Composer autoload defect.
- Repair: no dependency installation, autoload regeneration, configuration edit, package upgrade or lockfile change. Use the installed direct Pest runner outside the execution sandbox. The existing owner's 2A authorization covers running isolated tests; tool review allowed the read-only check and test execution. No installation/configuration approval was requested because neither action was needed. Do not run `composer update`, `composer setup`, or `composer test` as a repair: setup includes application migrations, and the test script clears application config and invokes extra checks.
- Operating `.env` identifies production MySQL database `skin_goddess`; no credentials were printed. `.env.testing` is absent. `bootstrap/cache/config.php` is absent, no alternate `APP_CONFIG_CACHE` is inherited, and the shell has no inherited `APP_ENV`, `DB_CONNECTION`, `DB_DATABASE` or `DB_URL` overrides. `tests/TestCase.php` uses normal framework bootstrap; tests do not redirect connections. `tests/Pest.php` applies `RefreshDatabase` to feature tests.
- `phpunit.xml` supplies testing environment, SQLite `:memory:` and empty `DB_URL`, with array cache/mail/session and synchronous queue. These values take precedence over `.env` when PHPUnit loads them before Laravel. This is the verified isolated baseline; database refreshes occur only in transient SQLite memory. The XML does not force its environment values, so recheck inherited overrides and config cache before future runs.
- `phpunit.mysql.xml` exists and forces local MySQL `skin_goddess_verification`, distinct from the operating database. However `APP_ENV` and `DB_URL` lack `force=true`, and credentials are privileged. Its presence alone does not prove safe disposable contents or current runtime isolation. No MySQL test run or destructive MySQL command was authorized by this assessment; validate the target and disposable data before a later MySQL concurrency run. No live clinic data was changed.

### Executed baseline and limits

Executed outside the sandbox, with the existing unmodified SQLite configuration:

```text
php vendor/pestphp/pest/bin/pest --configuration=phpunit.xml tests/Feature/ClinicWorkflowTest.php tests/Feature/SaleCorrectionTest.php --colors=never
```

Exit 0; actual Pest result: **36 tests passed, 314 assertions, 23,827 ms**. No tests failed in this run. The earlier sandbox `--list-tests` attempt failed before tests executed; it is not a failed business test. Dependency/configuration repairs performed: none. `composer.lock` SHA-256 remains `79ED6353A7E272B081CD8A38DDEEAED3AE12A1D684B56AF9634E6DF1CB573523`.

| Requested behavior | Evidence in executed suites |
| --- | --- |
| Ordinary sale creation | API fixture sales, decimal totals, fractional rounding and persistence. |
| Partial/full payments | Partial balance/status; full payment marks paid before an audited increase reopens only the extra balance; sequential retry, stale balance and overpayment rejection. |
| Payment voids | Recorded amount/reason retained; balance/status recomputed; voided payments excluded from corrected totals. |
| Sale correction/audit | Original snapshots, actor/time/reason, unchanged payments, version conflicts, ownership, below-paid limits and atomic rollback. |
| Procedures/inventory | Record/update treatment, fractional stock deductions, insufficient-stock rollback, controlled input and restoration exactly once. |
| Authorization | Invalid/expired credentials, staff denials on selected financial/account operations, administrator-only correction routes. Not a complete permission matrix. |

Not executed: MySQL tests, full suite, Node/browser acceptance, actual concurrent requests or package tests (package functionality does not exist). The existing full suite can be run with `php artisan test --compact` in an execution context without the sandbox readability restriction; recheck isolation first. No additional test files or verification scripts were created.

### Minimal schema proposal and checkpoint boundaries

The inspected schema remains `database/migrations/2026_10_14_113847_create_clinic_business_tables.php` plus `database/migrations/2026_10_20_133557_add_sale_correction_history.php`. There are no package columns today. Existing `sales.client_id`, `sale_date`, `total_amount`, line description/price and payments already record ownership, purchase date, price and money; do not duplicate them.

| Record | Proposed nullable additions | Purpose / checkpoint |
| --- | --- | --- |
| `sales` | `package_service_id` foreign key to `services`; `included_sessions` positive integer | Present together only on package sales; one purchased treatment and fixed allowance. 2B. |
| `sales` | `package_purchase_key` string up to 64, unique; `package_purchase_fingerprint` fixed 64-character hash | Required for new package purchases, null on ordinary/legacy sales. Stable key protects retries; hash of normalized original purchase input rejects changed-payload retries even after audited sale corrections. 2B. |
| `procedures` | `package_sale_id` indexed foreign key to `sales` | Many completed procedures belong to one purchased sale. Null retains standalone behavior. Add relationship in 2B; consumption API waits for 2C. |
| `procedures` | `completion_key` nullable unique string up to 64; `completion_fingerprint` nullable 64-character hash; `completed_by_user_id` nullable user foreign key | Completion retry protection and responsible user. 2C; not needed to accept purchases in 2B. Existing creation timestamp records entry time; procedure date records treatment date. |
| `procedures` | `reversed_at`, `reversed_by_user_id` foreign key, `reversal_reason`, all nullable | Original completion retained; only unreversed package procedures count. 2D. |
| `sales` | `canceled_at`, `canceled_by_user_id` foreign key, `cancellation_reason`, all nullable | Prevent future consumption without changing debt/payments/stock. 2D. |

No package table, catalog, stored completed/remaining counters, installment table or payment migration is needed. Reuse `procedures.session_number` as an assigned package ordinal at 2C, with uniqueness on `(package_sale_id, session_number)`; standalone numbers remain unrestricted when package ID is null. Number monotonically including reversals; progress is the count of unreversed linked procedures, not the largest ordinal. Remaining = included − valid completed count. In 2B no completion endpoint exists, so no procedure may acquire a package link through the generic create/update path yet.

At 2B validate package fields together, positive integer allowance, active treatment, one sale line of quantity 1 with no pre-existing procedure link, and price using current decimal rules. A package key must be checked against the normalized original request fingerprint; same key/same input returns the original purchase, changed input returns conflict. The unique index resolves simultaneous retries. Ordinary sales omit all package fields and follow existing creation rules. Do not infer/backfill entitlements. Protect package client/treatment/allowance, key/fingerprint and package identity from ordinary corrections; preserve current reason/version/below-paid safeguards and financial snapshots. Retain the single package line (no conversion, removal or added unrelated charges), while retaining approved audited price/date/notes/description corrections. Payments remain untouched.

At 2C serialize completions against the sale lock; enforce client/service match, remaining allowance and no additional billing for covered visits. Unpaid balances are explicitly allowed. At 2D use the same lock for reversal/cancellation; preserve original rows and supplies. Package-linked procedures must not be silently edited through the existing generic update, or have original supply detail deleted through the existing removal endpoint. Reject those destructive paths for package records unless a separately audited supply correction is implemented; ordinary behavior remains unchanged. Review active-service/client eligibility separately from the approved rule permitting unpaid sessions.

### Expected 2B changes and regression risks

Expected files: one new additive migration under `database/migrations/` (name generated after approval), `app/Models/Sale.php`, `app/Models/Procedure.php`, `app/Http/Controllers/SaleController.php`, targeted `tests/Feature/PackagePurchaseTest.php`, and updates to these two docs. `app/Http/Controllers/ProcedureController.php` may need explicit rejection of premature package fields and tests proving they cannot create/link sessions before 2C. Existing `routes/api.php` can stay unchanged when purchases use `POST /api/sales`; no React or payment changes are expected at 2B. All migrations are first verified on isolated test data; application to the operating clinic is a separate deliberate deployment step.

Risks: added fields may accidentally bypass protection through fillable/update validation; correction snapshots and serialized responses must continue working for ordinary sales. New uniqueness applies only to non-null request keys, preserving existing rows. Numeric normalization must treat equivalent decimal inputs consistently; immutable fingerprints avoid comparing against later corrected values. Additive nullable columns need no entitlement backfill. Rollback after package use would discard business history and must not be treated as routine recovery. SQLite establishes functional behavior but does not prove MySQL locking/concurrent last-session safety. Existing changed-payload payment retries and reuse of voided electronic references remain known limitations; rebuilding payment logic is outside this scope.

## Package assessment — Phase 1, 24 October 2026

Documentation only. The previous audit below is retained; its completed Phase 2 refers to earlier corrections, not authorization for packages. Source and migration inspection establish behavior, not the contents or reconciliation of live clinic data. `.ai/rules` is absent; Boost tools are not exposed in this session. No migrations, builds, dependency or configuration changes are part of this review.

### Source evidence and reuse

All paths in this document are exact repository-relative paths under `C:/Users/18084/Documents/chan/new/skin-goddess`.

| Existing source | Finding and reuse |
| --- | --- |
| `app/Models/Sale.php`, `app/Models/SaleItem.php`, `app/Models/Payment.php` | Sale belongs to client, has many lines/payments; line optionally belongs to one procedure. Reuse financial records and decimal arithmetic; no installment table needed. |
| `app/Models/Client.php`, `app/Models/Service.php`, `app/Models/Procedure.php` | Client has many sales/procedures; service has procedures; procedure has sale items, supplies and follow-ups. No purchased-package relationship exists. |
| `app/Http/Controllers/SaleController.php` | Creates sale and lines atomically, sums unrounded quantity × price and rounds aggregate HalfUp. Optional procedure ownership checked against client; repeated billing is allowed. Corrections lock sale, check version, preserve snapshots/payments, reject below-paid totals. Reuse creation/correction transaction structure, but package validation must be added. |
| `app/Http/Controllers/PaymentController.php` | Locks sale; sums recorded payments; checks expected balance and overpayment; key-based retry; receipt, status and version updated atomically. Admin void retains reason/time/actor. Reusable without package-specific financial changes. Same-key changed-payload retries return original payment; references remain blocked after void; these existing limits must be disclosed. |
| `app/Http/Controllers/ProcedureController.php` | Standalone visit creation/editing; optional positive session number, no uniqueness, sequence or allowance enforcement. Service must be active for creation. Supplied consumption and procedure creation share a transaction. Current edits are unaudited, so cannot be reused unchanged for package-session corrections. |
| `app/Models/ProcedureSupply.php`, `app/Models/InventoryItem.php`, `app/Models/InventoryTransaction.php`, `app/Http/Controllers/InventoryController.php` | Reuse item locks, exact three-decimal quantities, insufficient-stock rejection, supply costs and movement records. `ProcedureController::removeSupply` restores quantity then deletes supply detail; movement source IDs are not foreign keys. Preserve supply detail and actor/reason for any package correction path. No stock operations occur in sale/payment controllers. |
| `database/migrations/2026_10_14_113847_create_clinic_business_tables.php` | Actual original business schema: optional `sale_items.procedure_id`, nullable `procedures.session_number`, no package allowance or uniqueness preventing duplicate procedure charges. Sale-line quantity is a bill multiplier, not session entitlement. |
| `database/migrations/2026_10_20_133557_add_sale_correction_history.php` | Adds `sales.version` and append-only API correction snapshots, unique revision per sale. Reuse history pattern; protect package identity/allowance from ordinary corrections. |

### Existing relevant endpoints

Defined in `routes/api.php`; `/api` prefix. Signed-in staff and administrators have access except where stated. `php artisan route:list --path=api/sales --except-vendor` was invoked to verify sale routes; source routes are the authority for this inventory.

| Method and path | Purpose |
| --- | --- |
| `GET, POST /api/sales`; `GET /api/sales/{sale}` | List/create/view sales, including line items. |
| `PUT, PATCH /api/sales/{id}` | Administrator correction; reason and expected version required. |
| `GET /api/sales/{id}/summary`, `/api/sales/{id}/corrections` | Financial totals and correction snapshots. |
| `GET /api/sales/{id}/invoice`; `POST /api/sales/{id}/send-invoice` | Current billing PDF/email; reusable as financial output. |
| `GET, POST /api/payments`; `GET /api/payments/{id}` | Payment list/create/view. |
| `GET /api/payments/sale/{id}`; `POST /api/payments/{id}/void` | Payment history with balance; administrator-only void. PATCH/DELETE payment returns 405. |
| `GET, POST /api/procedures`; `GET, PUT, PATCH /api/procedures/{procedure}` | Visit list/create/view/update; no procedure delete route. |
| `POST /api/procedures/{id}/supplies`; `DELETE /api/procedures/{id}/supplies/{supplyId}` | Explicit consumption and stock-restoring removal. |
| `GET /api/clients/{client}`, `/api/services`, `/api/inventory/items` | Existing client, treatment and supply choices. |
| `POST /api/inventory/items/{id}/adjust`; `GET /api/inventory/items/{id}/history` | Stock adjustment and movement history. |

### Minimum proposed design — not implemented

Subject to one treatment/one package per sale approval, attach the entitlement directly to the existing sale. This is smaller than a package catalog, package lines or an allocation framework:

- New additive migration in `database/migrations/` (filename generated only after approval): nullable `sales.package_service_id` foreign key and positive integer `sales.included_sessions`, required together for packages, plus a nullable unique package-purchase request key for safe retries. Client and purchase date already exist. Keep one package line, quantity 1, captured description and total package price; do not divide price into per-session charges. Ordinary sales remain null and unchanged. Multiple package purchases for one client remain separate sales.
- Add nullable indexed `procedures.package_sale_id` foreign key. A sale has many package procedures; each procedure belongs to at most one purchase. Never repurpose `sale_items.procedure_id`: it represents an optional billed visit, not a reusable allowance. Preserve existing standalone links.
- Add a nullable unique completion request key for retry safety, authenticated completion actor, and minimal reversal fields (reason/time/actor). A reversed record remains present and does not count; completed and remaining counts are derived, not separately stored counters. Treat all new package procedures as completed visits; do not build appointment statuses. Reversal must not automatically replenish used stock. Audited amendments need before/after snapshots; simplest first release locks completed package fields and uses administrator reversal plus replacement, subject to approval.
- If cancellation controls are approved, add cancellation actor/time/reason on the sale and block consumption, without changing payments, total or debt. A financial refund/cancellation engine is excluded. If supply reversal is included, retain original supply rows with reversal actor/time/reason and exclude reversed usage consistently; otherwise reject the existing destructive removal for package supplies and leave that workflow unavailable pending approval.

In `app/Http/Controllers/SaleController.php`, validate package fields and package line shape inside existing creation transaction. Freeze client/service/allowance and reject package-line deletion/conversion through corrections; keep existing audited financial corrections. Do not backfill informal packages automatically.

In `app/Http/Controllers/ProcedureController.php`, lock the selected sale, validate client/service match and eligibility, count unreversed package visits, reject exhaustion, assign the next package-specific session number and create procedure/supplies atomically. Use a stable request key to return an existing matching completion on retry and reject changed payloads. Keep package identity and completion fields protected from generic update; ordinary supplies endpoints must obey the same history rules. Serialize reversals/cancellation on that sale lock too. Use a consistent lock order (sale, procedure, inventory by ID) across package writes. A unique package/session-number constraint is desirable; never reuse a reversed ordinal. Remaining allowance comes from counts, so a replacement may have ordinal 7 on a six-session package while only six unreversed sessions count.

Reject additional billed lines that reference package-covered procedures, preventing double billing through the API. Do not impose a global uniqueness rule on all existing procedure charges without resolving legacy duplicates and ordinary billing policy. No automatic sale creation on completion. Reuse payment history/status unchanged: a fully consumed package can still owe money, and a fully paid package can remain unused.

### React scope and likely Phase 2 files

The actual frontend is React Router with JSON services, not Inertia. No frontend framework migration is proposed.

- `resources/clinic/src/pages/sales/SaleForm.jsx`: package purchase option, treatment and integer allowance; package price once; prevent unsupported mixed lines and protected correction edits.
- `resources/clinic/src/pages/sales/SaleDetailPage.jsx`: included/completed/remaining and session history separately from existing financial status/history; record-session action and balance warning. Keep `resources/clinic/src/pages/sales/PaymentForm.jsx` and existing payment service unchanged unless approved policy requires a display change.
- `resources/clinic/src/pages/clients/ClientProfilePage.jsx`: package purchases with balances/progress; select the exact purchase when several exist. Current “latest session” is just the latest procedure's manual number; total billed is not outstanding balance.
- `resources/clinic/src/pages/procedures/ProcedureForm.jsx`, `resources/clinic/src/pages/procedures/ProceduresPage.jsx`: package selector, read-only assigned ordinal, actual supply inputs, completion request key, included-session label instead of another price charge, protected history/correction controls.
- `resources/clinic/src/services/salesService.js`, `resources/clinic/src/services/proceduresService.js`: expose package summary/filter and approved correction operations. A small inventory-choice wrapper may be needed under the existing `resources/clinic/src/services/` directory; no new inventory application required.
- Backend likely changes: `app/Models/Sale.php`, `app/Models/Procedure.php`, `app/Http/Controllers/SaleController.php`, `app/Http/Controllers/ProcedureController.php`, `routes/api.php`, one additive migration in `database/migrations/`, and focused Pest tests in `tests/Feature/`. `app/Models/ProcedureSupply.php` and usage queries in `app/Http/Controllers/ReportController.php` are conditional on audited supply reversals. Payment models/controller, inventory deduction core, dependencies and Laragon should need no package-specific changes.

### Test evidence, expected checks and risks

Reviewed `tests/Feature/ClinicWorkflowTest.php`, `tests/Feature/SaleCorrectionTest.php`, `tests/Pest.php`, `phpunit.xml` and `resources/clinic/src/lib/utils.test.js`. Existing HTTP tests cover decimal totals, partial payments, sequential retries/stale balances/overpayments, voids, supplies rollback/restoration, and audited sale corrections with payment preservation. No purchased-package tests exist. Existing tests do not prove real concurrent operations or authenticated browser completion. Earlier test/build/MySQL results below are historical, not new verification of packages.

Current verification attempt: `php artisan test --compact tests/Feature/ClinicWorkflowTest.php tests/Feature/SaleCorrectionTest.php` exited 1 before executing tests: PHPUnit reported it could not open `C:/Users/18084/Documents/chan/new/skin-goddess/vendor/autoload.php`. No dependency repair was attempted during this documentation-only phase. Sale route inspection succeeded and listed eight routes. Current test health is therefore unverified; the previous passing results must not be treated as a new pass.

Phase 2 should cover purchase snapshots without stock use; full/partial/void payment independence; exact purchase/client/service selection; multiple packages; final allowance and rejection beyond it; concurrent final-session requests; stable-key retries and changed-payload rejection; insufficient-stock complete rollback; no additional sale or duplicate package billing; protected purchase corrections; retained reversal history and allowance restoration without stock resurrection; approved unpaid-balance/cancellation policy; ordinary sale/procedure regressions and legacy null relationships. Use existing Pest tools and narrow suites first, then full suite and a separate safe MySQL test database for actual lock behavior. Manually verify sale → installments → sessions on client/sale/procedure screens; do not add dependencies.

Operational risks: duplicate sale requests have no idempotency protection; package purchase needs equivalent retry protection before release. Archived clients and inactive services can obstruct future use and need policy; catalog renaming changes displayed procedure names. Existing summary/history reads are separate requests, so UI must refresh after conflicts. Protect entitlement against price/line correction paths and old clients, and review reports: full package billing occurs on purchase date while stock costs arise across visits; current reports are not deferred-revenue accounting. No automatic legacy linkage, refunds, interest or penalties is proposed.

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
