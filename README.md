# CULINOVA — Cash Flow CFO System

A web-based replacement for the `CULINOVA_CashFlow_CFO.xlsx` workbook. It gives the
team real-time visibility and control over **projects, collections, payments, reserves,
inventory and a live 13-week cash-flow forecast** — with all the Excel KPIs, calculations,
scenario analysis and charts rebuilt as a clean, multilingual, multi-currency app.

> Goal: better **visibility & control**, not accounting.

---

## 🧱 Architecture (3 apps)

```
Culinova-cashflow/
├── server/   → Node.js + Express REST API  (all backend + calculation engine)
│              connects to Supabase (PostgreSQL), JWT auth, role-based access
├── client/   → React + Vite + Tailwind     (main app for the company users)
├── admin/    → React + Vite + Tailwind      (admin panel: users + audit + records)
└── CULINOVA_CashFlow_CFO.xlsx  (original reference workbook)
```

- **Database:** Supabase (PostgreSQL)
- **Auth:** JWT (bcrypt) with roles → `admin | cfo | sales | viewer`
- **Calculations** live on the **server** so every number is always consistent (no broken
  cells / `#VALUE!` like Excel).
- **Multilingual:** English + Arabic (full RTL). **Multi-currency:** SAR / AED / USD / EUR
  with editable exchange rates and a display-currency switcher.

---

## ✅ Modules / Features

| Module | What it does |
|--------|--------------|
| **Dashboard** | 5 KPIs, cash-status banner (Green/Yellow/Red/Critical), alerts, 4 charts (closing balance, weekly in/out, scenario, trend) |
| **13-Week Forecast** | Rolling weekly engine: opening → inflows → outflows → reserve transfer → closing |
| **Projects** | Contract value, collected, remaining AR, gross profit, status |
| **Collections** | Receivables with probability, confirmation, delay-days auto-calc |
| **Payments** | Payables with category, priority, due dates, paid status |
| **Inventory & Stock** | Qty/cost/sell with total cost, potential revenue, gross profit |
| **Reserve Fund** | Policy config + gap + suggested weekly transfer |
| **Scenario Analysis** | Base / Conservative / Stress / Severe stress-tests |
| **Supplier & Customer Ledger** | PO/SO + VAT, balances, collection % |
| **AR Aging** | Current → 90+ day buckets with totals |
| **Admin Panel** | User management (CRUD + roles), audit log, settings, exchange rates |

Every module supports full **Create / Read / Update / Delete**, search, CSV export, and
column totals. All writes are recorded in the **audit log**.

---

## 🚀 Setup

### 1) Database (Supabase)
1. Create a project at <https://supabase.com>.
2. Open **SQL Editor → New Query**, paste the contents of [`server/db/schema.sql`](server/db/schema.sql) and run it.
3. From **Project Settings → API**, copy your **Project URL** and **service_role key**.

### 2) Server
```bash
cd server
cp .env.example .env          # fill SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
npm install
npm run dev                   # http://localhost:5000
```

### 3) Client (company app)
```bash
cd client
cp .env.example .env          # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                   # http://localhost:5173
```

### 4) Admin panel
```bash
cd admin
cp .env.example .env
npm install
npm run dev                   # http://localhost:5174
```

### Default login
```
Email:    admin@culinova.com
Password: Admin@123
```
> Change this password after first login (Admin → User Management).

---

## 🔌 API overview

```
POST   /api/auth/login                 → { token, user }
GET    /api/auth/me
GET    /api/analytics/overview         → dashboard + forecast + reserve + scenarios
GET    /api/analytics/forecast?weeks=13|26|52
CRUD   /api/projects | /collections | /payments | /inventory
CRUD   /api/supplier-ledger | /customer-ledger | /ar-aging | /scenarios
GET/PUT /api/settings/company | /settings/reserve | /settings/rates
CRUD   /api/users                      (admin only)
GET    /api/audit                      (admin/cfo)
```

All routes except `/auth/login` require `Authorization: Bearer <token>`.

---

## 🧮 Calculation parity with Excel

Implemented in [`server/src/utils/calc.js`](server/src/utils/calc.js):

- **Net cash position** = Bank + Collections(30d) − Payments(30d)
- **Cash status:** Green > 300k, Yellow 150k–300k, Red 100k–150k, Critical < 100k
- **13-week forecast:** opening rolls from previous closing; reserve transfer =
  `if (opening+net > 300k) min((opening+net−300k)×10%, 50k)`
- **Reserve gap** = max(target − balance, 0); suggested transfer = min(week reserve, gap)
- **Scenarios:** adjusted collections = collections × reliability%
- Ledgers: PO/SO + 15% VAT, balances, collection %; Inventory profit; AR aging totals.

---

## 🛠️ Tech
React 18 · Vite · Tailwind · Recharts · react-icons · react-toastify · i18next ·
Express · Supabase · JWT · bcrypt
