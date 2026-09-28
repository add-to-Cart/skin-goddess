# Skin Goddess — Deployment Guide

---

## 1. Architecture overview

```
Browser / device
     │
     ▼
React SPA (static site)          ← served by Render Static Site (or any CDN)
     │  calls /api/...
     ▼
VITE_API_BASE_URL ──────────────►  FastAPI backend (Render Web Service / VPS)
                                         │
                                         ▼
                                   PostgreSQL database
                                   (Supabase / managed / self-hosted)
```

The frontend is a compiled static bundle. In production it calls the backend
using the absolute URL stored in `VITE_API_BASE_URL` at build time. The Vite
development proxy is **not** used in production.

---

## 2. Free demo setup (Render + Supabase)

### ⚠️ Important warnings for the free demo

- **Use fabricated / test data only.** Do not enter real client names, payments, or medical records on a free demo.
- **Cold starts:** Render Free web services spin down after 15 minutes of inactivity. The first request after inactivity can take 30–60 seconds.
- **Supabase Free expiry:** Supabase Free projects are paused after 7 days of inactivity and deleted after 90 days of inactivity. Enable "No pausing" in the project settings if available on your plan.
- **No backups on free tiers.** Render Free does not persist disk state between restarts. Supabase Free does not include automated backups.
- **Invoice email:** Render Free blocks outbound SMTP on ports 465 and 587. Configure the Mailjet HTTPS API below; SMTP is only an optional alternative on hosts that permit outbound SMTP.
- **60-connection limit on Supabase Free.** Set `pool_size=3, max_overflow=2` in `server/app/db/database.py` if you hit connection limit errors.

---

### Step 1 — Create a Supabase database

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project. Choose the `ap-southeast-1` (Singapore) region for the Philippines.
3. Wait for the project to provision.
4. Go to **Project Settings → Database → Connection string**.
5. Select **Transaction Pooler** (port 6543). Copy the URI. It looks like:
   ```
   postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
6. Replace `YOUR_PASSWORD` with the password you set when creating the project.
7. Add the `+psycopg2` dialect prefix:
   ```
   postgresql+psycopg2://postgres.xxxx:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
   This is your `DATABASE_URL`.

---

### Step 2 — Deploy the backend on Render

1. Go to [render.com](https://render.com) and create a free account.
2. Connect your GitHub repository.
3. Click **New → Web Service**.
   - **Root Directory:** `server`
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

4. Set the following environment variables in the Render dashboard
   (**Environment → Add Environment Variable**):

   | Key | Value | Secret? |
   |---|---|---|
   | `APP_ENV` | `production` | No |
   | `DATABASE_URL` | your Supabase connection string | **Yes** |
   | `SECRET_KEY` | generate with `python -c "import secrets; print(secrets.token_hex(32))"` | **Yes** |
   | `ADMIN_USERNAME` | your chosen username | **Yes** |
   | `ADMIN_PASSWORD` | a strong password | **Yes** |
   | `CORS_ORIGINS` | *(leave blank for now; fill in after frontend is deployed)* | No |
   | `BUSINESS_NAME` | Skin Goddess Clinic | No |
   | `BUSINESS_TAGLINE` | Beauty & Aesthetic Services | No |
   | `BUSINESS_ADDRESS` | your address | No |
   | `BUSINESS_PHONE` | your phone | No |
   | `BUSINESS_EMAIL` | your email | No |
   | `EMAIL_PROVIDER` | `mailjet` | No |
   | `MAILJET_API_KEY` | API key from Mailjet account settings | **Yes** |
   | `MAILJET_SECRET_KEY` | API secret paired with the API key | **Yes** |
   | `EMAIL_FROM` | verified sender email address in Mailjet | No |
   | `EMAIL_FROM_NAME` | Skin Goddess Clinic | No |

   In Mailjet, find your API key and secret in account settings, then verify
   the sender address under sender/domain settings. Store both credentials only
   in Render's environment settings. The backend uses Mailjet's HTTPS Send API
   and attaches the generated PDF; no SMTP port is needed on Render Free. The
   optional SMTP mode is for other hosts only: set `EMAIL_PROVIDER=smtp` and
   configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and
   `SMTP_FROM`.

5. Click **Create Web Service**. Wait for the first deploy to complete.
6. Note the service URL, e.g. `https://skin-goddess-api.onrender.com`.

---

### Step 3 — Run database migrations

Migrations must be run **once** after the database is created and **again** if
you add new migrations in the future. Run them from your local machine using
the Supabase connection string.

```bash
cd server

# Point to the Supabase database
set DATABASE_URL=postgresql+psycopg2://postgres.xxxx:PASSWORD@...pooler.supabase.com:6543/postgres

# Apply all migrations in order
..\venv\Scripts\python.exe -m alembic upgrade head
```

**Expected output:**
```
INFO  [alembic.runtime.migration] Running upgrade  -> 21d0dd66642a, create clients table
INFO  [alembic.runtime.migration] Running upgrade 21d0dd66642a -> e65aa773c91a, add all business tables
```

Do **not** run `alembic downgrade` or `alembic stamp` on a database that contains
real data without understanding what those commands do.

**Migration order matters:** migrations must always be run in upgrade order
(`upgrade head`). Never run them in parallel or out of sequence.

---

### Step 4 — Deploy the frontend on Render

1. Click **New → Static Site**.
   - **Root Directory:** `client`
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`

2. Set the following environment variable:

   | Key | Value | Secret? |
   |---|---|---|
   | `VITE_API_BASE_URL` | `https://skin-goddess-api.onrender.com` | No |

3. Under **Redirects/Rewrites**, add:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: **Rewrite**
   
   (This is the SPA routing rule. Without it, refreshing any page except `/`
   returns a 404.)

4. Click **Create Static Site**. Wait for the build to complete.
5. Note the URL, e.g. `https://skin-goddess-web.onrender.com`.

---

### Step 5 — Set CORS_ORIGINS on the backend

1. Go back to your backend web service in Render.
2. Add/update the environment variable:
   ```
   CORS_ORIGINS=https://skin-goddess-web.onrender.com
   ```
3. Render will automatically redeploy the backend.

---

### Step 6 — Verify the deployment

Run through this checklist in order:

- [ ] `GET https://skin-goddess-api.onrender.com/health` returns `{"status":"ok","version":"1.0.0"}`
- [ ] Open the frontend URL in a browser → login page appears
- [ ] Log in with your `ADMIN_USERNAME` and `ADMIN_PASSWORD` → dashboard loads
- [ ] Navigate to Clients → list is empty (expected for a fresh database)
- [ ] Add a test client → client appears in the list
- [ ] Open the client profile → tabs load without errors
- [ ] Navigate to Services → add a test service
- [ ] Record a test procedure for the test client
- [ ] Create a test sale → record a payment → payment status updates
- [ ] (Optional) Download a PDF invoice for the sale
- [ ] (Optional) Send the invoice by email — verify the email is received
- [ ] Check the dashboard → today's stats reflect the test data
- [ ] Open a follow-up and mark it complete

---

### Using `render.yaml` (optional)

The repository contains `render.yaml` at the root. Render can use this to
auto-create both services with the correct commands and routes:

1. In the Render dashboard, click **New → Blueprint**.
2. Connect the repository. Render reads `render.yaml` automatically.
3. You will still be prompted to fill in the secret env vars (`DATABASE_URL`,
   `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, etc.) before the deploy
   runs — they are marked `sync: false` in the file intentionally.

---

## 3. Production deployment checklist (paid hosting)

Use this checklist when you are ready to run the app with real clinic data.

### Infrastructure

- [ ] Use a paid Render plan (Starter or higher) to eliminate cold starts
- [ ] Use a managed PostgreSQL with **automated daily backups enabled**
  - Render PostgreSQL (Starter: $7/mo) includes daily backups with 7-day retention
  - Supabase Pro includes daily backups
  - Alternatively, self-host on a VPS with `pg_dump` scheduled via cron
- [ ] Set the database to a region close to your location (Singapore for Philippines)
- [ ] Configure connection pooling: keep `pool_size` well below the database's max connection limit

### Credentials

- [ ] `SECRET_KEY`: a long random string generated with `secrets.token_hex(32)`. Change it — all existing sessions are invalidated immediately.
- [ ] `ADMIN_PASSWORD`: a strong password, not a dictionary word. Store it in a password manager.
- [ ] `ADMIN_USERNAME`: change from "admin" to something less guessable.
- [ ] All secrets set only in the hosting dashboard, never in the repository.

### CORS

- [ ] `CORS_ORIGINS` set to exactly your production frontend URL — no wildcard, no extra origins.

### Email

- [ ] Configure Mailjet's HTTPS API (`EMAIL_PROVIDER=mailjet`, `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, and `EMAIL_FROM`).
- [ ] Verify by sending a test invoice and confirming receipt.
- [ ] SMTP is an optional alternative only where outbound SMTP is allowed; Render Free blocks ports 465 and 587.

### Backups and restore testing

- [ ] Verify that your backup strategy produces a restorable dump **before** entering real data.
- [ ] Test restore process: create a second database, restore the dump, verify the Alembic version matches.
  ```bash
  # Dump
  pg_dump $DATABASE_URL > backup.sql

  # Restore to a test database
  psql $TEST_DATABASE_URL < backup.sql

  # Verify Alembic head
  DATABASE_URL=$TEST_DATABASE_URL alembic current
  ```
- [ ] Document who is responsible for monitoring backup success.

### Monitoring

- [ ] Set up an uptime monitor (UptimeRobot free tier, Render health check) pointing to `GET /health`.
- [ ] Configure Render alert emails for service restarts and deploy failures.
- [ ] Review application logs periodically for unexpected errors.

### Before go-live

- [ ] Migrate all data from paper records (client cards, sales records) using the application's data entry forms. Do not import directly to the database without running the application logic (inventory deductions, payment status sync, etc.).
- [ ] Train all staff on the workflows.
- [ ] Keep paper backups for 30 days after go-live until you are confident in the application.

---

## 4. Environment variable reference

| Variable | Required | Secret | Default | Description |
|---|---|---|---|---|
| `DATABASE_URL` | **Yes** | **Yes** | — | Full PostgreSQL connection string |
| `APP_ENV` | Yes | No | `development` | Set to `production` on cloud hosts |
| `SECRET_KEY` | **Yes** | **Yes** | *insecure placeholder* | JWT signing key — must be changed |
| `ADMIN_USERNAME` | Yes | Yes | `admin` | Login username |
| `ADMIN_PASSWORD` | Yes | **Yes** | `admin123` | Login password — must be changed |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | No | `480` | JWT lifetime in minutes (8 h) |
| `CORS_ORIGINS` | Yes | No | `http://localhost:5173` | Comma-separated frontend origins |
| `BUSINESS_NAME` | No | No | `Skin Goddess Clinic` | Shown on invoices |
| `BUSINESS_TAGLINE` | No | No | `Beauty & Aesthetic Services` | Shown on invoices |
| `BUSINESS_ADDRESS` | No | No | *(empty)* | Shown on invoices |
| `BUSINESS_PHONE` | No | No | *(empty)* | Shown on invoices |
| `BUSINESS_EMAIL` | No | No | *(empty)* | Shown on invoices |
| `EMAIL_PROVIDER` | No | No | `mailjet` | Invoice email provider (`mailjet`, `brevo`, or optional `smtp`) |
| `MAILJET_API_KEY` | Required for Mailjet | **Yes** | *(empty)* | Mailjet API key; configure only in the hosting dashboard |
| `MAILJET_SECRET_KEY` | Required for Mailjet | **Yes** | *(empty)* | Mailjet API secret; configure only in the hosting dashboard |
| `BREVO_API_KEY` | Required for Brevo | **Yes** | *(empty)* | Brevo API key; configure only in the hosting dashboard |
| `EMAIL_FROM` | Required for API providers | No | *(empty)* | Sender email address verified with the selected provider |
| `EMAIL_FROM_NAME` | No | No | `BUSINESS_NAME` | Sender name shown on invoice emails |
| `SMTP_HOST` | Required for SMTP mode | No | `smtp.gmail.com` | Optional SMTP server |
| `SMTP_PORT` | Required for SMTP mode | No | `587` | Optional SMTP port; 465 uses implicit TLS |
| `SMTP_USER` | Required for SMTP mode | **Yes** | *(empty)* | Optional SMTP username |
| `SMTP_PASSWORD` | Required for SMTP mode | **Yes** | *(empty)* | Optional SMTP password |
| `SMTP_FROM` | Required for SMTP mode | No | = `SMTP_USER` | Optional SMTP sender address |
| `VITE_API_BASE_URL` | **Yes (prod)** | No | *(empty = relative)* | Set on the frontend service at build time |

---

## 5. Migration reference

The project uses Alembic for database schema management.

**Run from the `server/` directory with `DATABASE_URL` set.**

```bash
# Apply all pending migrations (run after fresh deploy and after any new migration)
alembic upgrade head

# Check current applied version
alembic current

# Show migration history
alembic history --verbose

# ⛔ Do not run these on databases with real data without a backup
# alembic downgrade -1       # revert last migration
# alembic downgrade base     # revert all migrations (destructive)
```

**Current migration chain:**

```
(base)
  └─► 21d0dd66642a  create clients table
        └─► e65aa773c91a  add all business tables   ← HEAD
```

`e65aa773c91a` creates: employees, expenses, inventory_items, inventory_purchases,
inventory_purchase_items, inventory_transactions, services, attendance, procedures,
salary_records, sales, follow_ups, payments, procedure_supplies, sale_items.
