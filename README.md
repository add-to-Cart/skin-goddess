# Skin Goddess — local clinic application

## Daily operation

1. Open the existing Laragon installation and click **Start All**.
2. Open **http://skin-goddess** and sign in with an existing clinic account.
3. Confirm the dashboard loads, then open Clients or Treatment & Services. Refreshing a page must continue to work.
4. Finish saving open forms, sign out, and click **Stop All** in Laragon before shutting down Windows.

Apache serves Laravel's `public` directory. The original React interface is a production build served on the same origin as `/api`. No Python, Uvicorn, Artisan development server, or React development server is required for daily use.

The Apache host in `C:/laragon/etc/apache2/sites-enabled/01-skin-goddess.conf` listens through the existing Apache on loopback addresses and grants local requests only. This keeps the clinic application restricted to this computer. The existing Laragon default host and installed PHP version were retained.

## Migration map

| Original feature | Laravel implementation | React integration | Business tables |
| --- | --- | --- | --- |
| Login, roles, users | ClinicAuthController, ClinicAuthentication | Existing login, protected pages, user management; same bearer request format | users |
| Clients and profiles | ClientController, Eloquent relationships | Existing Clients and profile pages | clients |
| Treatments and sessions | ServiceController, ProcedureController | Existing catalog, recording, editing and history forms | services, procedures, procedure_supplies |
| Stock, purchases and consumption | InventoryController; locked transactions | Original API functionality preserved; source has no inventory page or supply-entry form | inventory_items, inventory_purchases, inventory_purchase_items, inventory_transactions |
| Sales, balances and receipts | SaleController, PaymentController; decimal arithmetic and sale locks | Existing sales, detail, partial-payment and void controls | sales, sale_items, payments |
| Expenses | ExpenseController | Existing administrator expense page | expenses |
| Follow-ups | FollowUpController | Existing reminders and client follow-up forms | follow_ups |
| Dashboard and reports | DashboardController, ReportController | Existing dashboard; source reports are API-only | Existing business tables |
| PDF invoices | InvoiceController, original layout converted to Blade, Dompdf | Existing invoice download and send controls | sales, sale_items, payments, clients |

The current source database has no employee, attendance, or salary tables. Older Alembic files mention them, but the live schema, current models, routers and React pages do not implement those modules. They were not invented.

React sources live in resources/clinic; Laravel serves the JSON API. Root npm commands delegate to the sole clinic build pipeline.

## Source data and verification

Migration was verified against the original sample database. The retired source project and its sample snapshots have been removed; this Laravel project is the maintained application.

The imported snapshot contains 3 clients, 3 users, 1 service, 2 procedures, 2 follow-ups, 4 sales, 6 sale items, 5 payments and 2 expenses. All five inventory tables were empty. Source and MySQL totals matched: sales PHP 10,000.00, recorded payments PHP 10,000.00, expenses PHP 205,000.00 and stock quantity zero. A repeated import was verified without duplicate records.


Imported bcrypt passwords remain compatible. Clinic sessions use Laravel encrypted bearer tokens. Financial calculations use decimal arithmetic internally; JSON responses retain the numeric format the React application expects. Sale and purchase totals preserve the source rule of rounding the aggregate to two decimals.

Automated business tests use `skin_goddess_verification`, a separate MySQL database configured in `phpunit.mysql.xml`. Run them with `php artisan test --configuration=phpunit.mysql.xml --compact`. The ordinary `phpunit.xml` remains configured for isolated SQLite tests.

## Back up before clinic use

Make a fresh MySQL backup at the end of each business day once real clinic use begins. Backups contain private clinic records; keep a second protected copy outside this computer. Never put backups in `public`.

In Laragon's terminal, from this project folder, use a new dated filename each time:

```powershell
New-Item -ItemType Directory -Path storage/app/backups -Force
& 'C:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysqldump.exe' --host=127.0.0.1 --user=root --single-transaction --routines --triggers --hex-blob --no-tablespaces --result-file=storage/app/backups/clinic-YYYY-MM-DD.sql skin_goddess
```

Check the command succeeded and the backup is nonempty. If the MySQL account later has a password, use `--password` to prompt for it; do not place it in the command or this document. Preserve the Laravel `.env` and its `APP_KEY` separately in protected storage, along with the application source and production build.

## Restore safely

Validate a backup by restoring to an **empty separate database** first. For example, after choosing the actual backup filename:

```powershell
& 'C:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe' --host=127.0.0.1 --user=root --execute='CREATE DATABASE skin_goddess_restore_check CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
& 'C:/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql.exe' --host=127.0.0.1 --user=root --database=skin_goddess_restore_check --execute='SOURCE C:/full/path/to/clinic-backup.sql;'
```

Compare table counts, recorded-payment totals, sale totals, expense totals and stock quantities with the backed-up database. For real recovery, stop clinic activity, back up the current state, restore to a new empty database, then update `DB_DATABASE` in `.env`, run `php artisan config:clear`, and restart Laragon. Verify login and clinic records before resuming work. Keep the previous database until recovery is confirmed; do not overwrite it as the first recovery step.

## Remaining limitations

Invoice downloads work locally. The existing Gmail SMTP and business settings were copied privately into Laravel. Dispatch was tested with a fake transport and PDF attachment; no real invoice email was sent. Live delivery and the validity of the existing Google App Password remain unverified. Missing SMTP configuration returns a clear 503 error.

Inventory consumption, stock corrections and reports have migrated backend APIs and MySQL workflow tests. Their interactive pages were absent from the source, so these modules are not claimed as completed frontend workflows. Treatment forms preserve the source behavior: only supplies explicitly submitted through the existing supply API affect inventory; there is no inferred treatment recipe or automatic supply mapping.

React sources are preserved in `resources/clinic`. Run `npm run build` from this Laravel project after editing those sources. This builds using the local resources/clinic/node_modules and copies production files into public. To reinstall the locked clinic dependencies, run npm ci in resources/clinic. Building is a development task, not part of daily clinic startup.


For interface development, start Laragon and run npm run dev from this project. The development proxy sends API requests to http://skin-goddess. Normal clinic use serves the production build.
