# Skin Goddess — Application Capabilities

This document describes what the application currently does, verified against
routes and frontend code. Each item is labelled:

| Label | Meaning |
|---|---|
| ✅ Implemented and verified | Route exists, schema defined, frontend wired end-to-end |
| ⚠️ Partial | Backend exists but UI is incomplete, or vice versa |
| 🔧 Backend only | API and database exist; no UI entry point yet |
| ❌ Not implemented | Not present in code |

---

## Authentication and access control

| Capability | Status | Notes |
|---|---|---|
| Login with username and password | ✅ | `POST /api/auth/login` (OAuth2 form). JWT stored in `localStorage`. |
| JWT protected routes | ✅ | All 13 business routers require `Bearer` token via `get_current_user`. |
| Logout | ✅ | Client discards token; server has a stub `/api/auth/logout` endpoint. |
| Per-user accounts | ❌ | Single shared admin login. No `users` table exists. All staff use the same credential. |
| Role-based access (admin vs staff) | ❌ | No roles. One login for everyone. |
| Password reset | ❌ | Not implemented. |
| Session invalidation / token blacklisting | ❌ | Tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 8 h) only. No server-side revocation. |

**Important limitation:** The app uses a single-admin login model. There is no
audit trail per staff member. If multiple staff need separate accounts, a
`users` table must be added. The smallest compatible next step would be a
`users` table with a `username`, `hashed_password`, and `role` column, and a
migration to seed the first admin from the current `ADMIN_PASSWORD` env var.

---

## Dashboard

| Capability | Status | Notes |
|---|---|---|
| Today's sales total and transaction count | ✅ | Live database query. |
| Clients served today | ✅ | Based on procedures performed today. |
| New clients registered today | ✅ | |
| Outstanding payments total | ✅ | Sum across unpaid/partial sales minus payments received. |
| Upcoming follow-ups (7-day window) | ✅ | Shows client name with link to profile. |
| Overdue follow-up count | ✅ | |
| Low-stock alerts | ✅ | Items where `current_quantity ≤ minimum_stock_level`. |
| Today's attendance summary | ✅ | Present/absent counts. |
| Today's expenses total | ✅ | |

---

## Client records

| Capability | Status | Notes |
|---|---|---|
| View client list with search | ✅ | Search by first name, last name, or phone. |
| Add client | ✅ | Form: first name, last name, phone, email, address, notes. |
| Edit client | ✅ | All fields editable. |
| Deactivate client (soft delete) | ✅ | `DELETE /api/clients/{id}` sets `is_active = false`. Client data is preserved. |
| Client profile page | ✅ | Shows contact info, procedure history, sales, follow-ups. |
| Per-client procedure history | ✅ | Tabbed within client profile. |
| Per-client sales and payment history | ✅ | Tabbed within client profile. |
| Per-client follow-ups | ✅ | Tabbed within client profile. |

---

## Services catalog

| Capability | Status | Notes |
|---|---|---|
| View services list | ✅ | |
| Add service | ✅ | Name, description, default price, duration. |
| Edit service | ✅ | |
| Activate / deactivate service | ✅ | Deactivated services are hidden from procedure form dropdowns. |

---

## Procedures / treatments

| Capability | Status | Notes |
|---|---|---|
| View all procedures | ✅ | Client and service names resolved (not raw IDs). |
| Record procedure | ✅ | Client, service, date, session number, price, next follow-up, notes. |
| Session number suggestion | ✅ | UI counts prior procedures for that client+service and suggests the next number. The backend does not enforce sequential numbers. |
| Edit procedure | ✅ | All fields. |
| Supplies used per procedure | ✅ | Add/remove inventory items consumed. Backend deducts from inventory and records an `InventoryTransaction`. |
| Remove supply from procedure | ✅ | Backend reverses the inventory deduction. |
| Link procedure to a specific employee | 🔧 | `employee_id` column exists in the model; no UI picker in the procedure form. |

---

## Follow-ups

| Capability | Status | Notes |
|---|---|---|
| View all follow-ups with status filter | ✅ | |
| Schedule follow-up | ✅ | Client, date, notes. Status defaults to "upcoming". |
| Edit follow-up (date, status, notes) | ✅ | |
| Mark follow-up complete | ✅ | One-click action in the list. |
| Overdue detection | ✅ | Follow-ups whose date has passed and status is still upcoming/due. |
| Follow-up linked to a specific procedure | 🔧 | `procedure_id` FK exists; the UI does not set it when creating a follow-up. |

---

## Sales and payments

| Capability | Status | Notes |
|---|---|---|
| View sales list with status filter | ✅ | Filter: all / unpaid / partial / paid. |
| Create sale with line items | ✅ | Client selector, date, line items (description, qty, price). |
| Service quick-pick in sale form | ✅ | Fills description and default price from services catalog. |
| View sale detail | ✅ | Line items and payment summary. |
| Record payment toward a sale | ✅ | Amount, method (cash/GCash/bank transfer/card/other), date. |
| Payment status auto-sync | ✅ | Backend recomputes unpaid/partial/paid after each payment. |
| Payment validation | ✅ | Backend rejects zero or negative amounts (pydantic `field_validator`). |
| Remaining balance | ✅ | Computed server-side and shown in sale detail. |
| Overpayment warning | ✅ | UI shows a warning if entered amount exceeds remaining balance; backend does not block it. |
| Edit sale (date, notes) | ⚠️ | Endpoint exists (`PATCH /api/sales/{id}`); no UI form for editing a sale after creation. Line items cannot be changed after creation. |
| Delete / void sale | ❌ | Not implemented. |

---

## Invoices

| Capability | Status | Notes |
|---|---|---|
| Generate PDF invoice | ✅ | Jinja2 template rendered to PDF via xhtml2pdf. Includes line items, totals, payment history, BIR disclaimer. |
| Download invoice as PDF | ✅ | Authenticated — requires valid Bearer token. |
| Email invoice to client | ✅ | Mailjet HTTPS API by default; requires `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, and a verified `EMAIL_FROM`. Brevo and SMTP are optional alternatives. |
| Email with custom recipient | ✅ | Override the client's email on file via the dialog. |
| Invoice branding | ⚠️ | Template uses old purple (`#9b59b6`) accent color, not the current `#FFB0B6` brand. Functional but visually inconsistent. |

**Email availability warning:** Render Free blocks outbound SMTP on ports 587/465. The configured Mailjet HTTPS API works over outbound HTTPS; set `EMAIL_PROVIDER=mailjet`, `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, and verified sender `EMAIL_FROM` in the deployment environment.

---

## Inventory

| Capability | Status | Notes |
|---|---|---|
| View inventory list with search and category filter | ✅ | |
| Low-stock filter | ✅ | |
| Add inventory item | ✅ | Name, category, unit, initial quantity, minimum stock level, cost. |
| Edit inventory item | ✅ | |
| Record stock purchase (stock-in) | ✅ | Creates `InventoryPurchase` + `InventoryPurchaseItem` records, increments `current_quantity`, updates `acquisition_cost`, writes `InventoryTransaction`. |
| Adjust stock manually | ✅ | Add or subtract with a reason. Writes `InventoryTransaction`. Full audit trail. |
| Stock deduction via procedure | ✅ | Automatic when supplies are recorded on a procedure. Reversible. |
| View transaction history per item | 🔧 | `GET /api/inventory/items/{id}/history` exists; no UI page to display it. |
| View all inventory transactions | 🔧 | `GET /api/inventory/transactions` exists; no UI page. |
| View purchase history | 🔧 | `GET /api/inventory/purchases` exists; no UI page. |

---

## Expenses

| Capability | Status | Notes |
|---|---|---|
| View expenses with search, category, and date filter | ✅ | |
| Record expense | ✅ | Date, description, category, amount, notes. |
| Edit expense | ✅ | |
| Delete expense | 🔧 | `DELETE /api/expenses/{id}` exists; no UI confirmation dialog. |
| Expense categories | ✅ | inventory / supplies / rent / utilities / salary / equipment / other |

---

## Employees

| Capability | Status | Notes |
|---|---|---|
| View employee list | ✅ | Search by name or position. |
| Add employee | ✅ | Name, position, salary type, phone, email, address, date hired, notes. |
| Edit employee | ✅ | |
| Deactivate / reactivate employee | ✅ | Soft delete. Data preserved. |

---

## Attendance

| Capability | Status | Notes |
|---|---|---|
| View attendance by date | ✅ | Shows present / late / absent / leave counts. |
| Record attendance | ✅ | Employee, date, status, time in/out, overtime hours, notes. |
| Edit attendance record | ✅ | |
| Duplicate prevention | ✅ | Backend returns HTTP 409 if an attendance record already exists for the same employee on the same date. |

---

## Salary

| Capability | Status | Notes |
|---|---|---|
| View salary records with status filter | ✅ | |
| Add salary record | ✅ | Employee, period start/end, gross, deductions, net (auto-calculated in UI), release date, status. |
| Edit salary record | ✅ | |
| Payroll calculation engine | ❌ | Not implemented. Net is gross minus deductions; no automatic daily/hourly/commission calculation. |

---

## Reports

| Capability | Status | Notes |
|---|---|---|
| Daily sales report | ✅ | Total and transaction count for a given date. |
| Sales date-range report | ✅ | Total sales, collected, and outstanding for a date range. |
| Expenses by category | ✅ | Optional date filter. |
| Outstanding client balances | ✅ | Clients with unpaid or partially paid sales. |
| Inventory current stock | ✅ | All items with current quantity and low-stock status. |
| Supply usage by procedure date range | ✅ | Total quantity and cost per item across procedures. |
| Supply usage by client | ✅ | Material cost consumed per client. Optional client filter. |
| Daily expenses report | 🔧 | `GET /api/reports/expenses/daily` exists; not exposed in the UI. |
| Expenses date-range report | 🔧 | `GET /api/reports/expenses/range` exists; not exposed in the UI. |
| Client follow-up report | 🔧 | `GET /api/reports/clients/follow-ups` exists; not in UI. |
| Monthly / weekly sales grouping | ❌ | Use the date-range report with manual date selection. |
| Export reports to CSV / Excel | ❌ | Not implemented. |

---

## Capacity and limits

**This section describes known constraints from the code and schema. Hosting capacity (concurrent users, maximum request rate, storage) depends on the hosting plan, database resources, and workload and has not been measured.**

### Code and schema constraints

| Constraint | Value | Source |
|---|---|---|
| Maximum file/media uploads | N/A | No file upload feature exists |
| Maximum invoice size | Limited by available memory | xhtml2pdf renders in memory |
| Maximum text field (client notes, descriptions) | Unlimited (TEXT column) | SQLAlchemy `Text` |
| Maximum name field | 100 characters | `String(100)` on client/employee names |
| Maximum monetary precision | 99,999,999.99 (NUMERIC 10,2) | All monetary columns |
| Maximum inventory quantity precision | 9,999,999.999 (NUMERIC 10,3) | `current_quantity` |
| Token expiry | 480 minutes (8 hours) default | `ACCESS_TOKEN_EXPIRE_MINUTES` |
| Concurrent users | **Not measured** | See load-test plan below |

### What has not been measured

The following claims cannot be made without running a load test:

- Maximum concurrent users
- Maximum requests per second
- Response time under load
- Database connection pool saturation point (current: SQLAlchemy default pool size 5)
- PDF generation time for large invoices

### Reproducible load-test plan

To make defensible capacity claims, run the following before going live:

1. **Tool:** [Locust](https://locust.io) or [k6](https://k6.io) (both free and open source)
2. **Test scenarios:**
   - Login → list clients → open client profile → load procedure history
   - Create a sale with 3 line items
   - Record a payment
   - Load the dashboard
3. **Metrics to capture:** p50/p95/p99 response time, error rate, database query count per request
4. **Target:** define your acceptable p95 response time (e.g. ≤ 500 ms) and run the test with increasing concurrent users until that threshold is exceeded
5. **Database connection limit:** Supabase Free allows 60 connections. Set `pool_size` and `max_overflow` in `database.py` to stay below this limit.

---

## Important limitations and disclaimers

- **Not a BIR-compliant official receipt system.** The invoice template includes a disclaimer that the PDF is a billing summary only, not an official BIR receipt. Official receipts must be issued separately per Philippine BIR requirements.
- **No regulatory compliance certification.** This application has not been independently assessed for HIPAA, PDPA, or any other healthcare data regulation. Do not rely on this application for regulated data without independent legal review.
- **No offline support.** The application requires a live backend and PostgreSQL connection. Data entered offline is not queued.
- **No automated backups.** You are responsible for scheduling and testing database backups. See `docs/deployment.md` for guidance.
