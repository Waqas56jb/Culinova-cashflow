-- ============================================================
--  CULINOVA — Cash Flow CFO System
--  Supabase / PostgreSQL schema
--  Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
--  USERS  (custom auth handled by the Node server with JWT)
-- ------------------------------------------------------------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  full_name     text not null,
  role          text not null default 'viewer'  -- admin | cfo | sales | viewer
                check (role in ('admin','cfo','sales','viewer')),
  language      text not null default 'en',      -- en | ar
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
--  COMPANY SETTINGS  (single row)
-- ------------------------------------------------------------
create table if not exists company_settings (
  id                  int primary key default 1,
  company_name        text default 'CULINOVA',
  base_currency       text default 'SAR',
  current_bank_balance numeric default 0,
  vat_rate            numeric default 0.15,
  -- Cash-status thresholds (mirror the Excel rules)
  status_green        numeric default 300000,
  status_yellow       numeric default 150000,
  status_red          numeric default 100000,
  -- Forecast start (week 0 opening balance source)
  forecast_start_date date default current_date,
  updated_at          timestamptz not null default now(),
  constraint one_row check (id = 1)
);

-- ------------------------------------------------------------
--  EXCHANGE RATES  (everything normalised to base currency)
-- ------------------------------------------------------------
create table if not exists exchange_rates (
  currency    text primary key,        -- SAR, AED, EUR, USD, ...
  rate_to_sar numeric not null,        -- 1 unit of currency = ? SAR
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
--  RESERVE FUND  (single row)
-- ------------------------------------------------------------
create table if not exists reserve_fund (
  id                   int primary key default 1,
  current_balance      numeric default 0,
  target_reserve       numeric default 150000,
  reserve_pct          numeric default 0.05,    -- % from each collection
  min_operating_cash   numeric default 300000,
  constraint one_row_reserve check (id = 1)
);

-- ------------------------------------------------------------
--  PROJECTS
-- ------------------------------------------------------------
create table if not exists projects (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  customer           text,
  currency           text default 'SAR',
  contract_value     numeric default 0,
  collected_to_date  numeric default 0,
  gross_profit_pct   numeric default 0.30,
  status             text default 'In Progress', -- Signed|In Progress|Delivered|Invoiced|Collected|On Hold
  progress_pct       numeric,                     -- actual delivery / project progress % (0..100), entered by management
  next_billing       text,
  expected_collection_date date,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ------------------------------------------------------------
--  COLLECTIONS  (money coming IN)
-- ------------------------------------------------------------
create table if not exists collections (
  id                 uuid primary key default gen_random_uuid(),
  project            text,
  customer           text,
  amount             numeric default 0,
  currency           text default 'SAR',
  expected_date      date,
  probability_pct    numeric,                 -- 0..100
  probability_status text,                    -- Confirmed|High|Medium|Low
  invoice_ref        text,
  confirmed          boolean default false,
  actual_collection_date date,
  owner              text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ------------------------------------------------------------
--  PAYMENTS  (money going OUT)
-- ------------------------------------------------------------
create table if not exists payments (
  id                 uuid primary key default gen_random_uuid(),
  category           text,                    -- Supplier Payment|Salaries|Rent|Government Fees|...
  supplier           text,
  amount             numeric default 0,         -- NET amount (excluding VAT) — used for project profitability
  vat_rate           numeric default 0,         -- VAT rate: 0 | 0.05 | 0.10 | 0.15 (VAT amount computed = amount * rate)
  vat_amount         numeric default 0,         -- (legacy) VAT amount; now derived from amount * vat_rate
  currency           text default 'SAR',
  due_date           date,
  priority           text default 'Medium',   -- Critical|High|Medium|Low
  qty                numeric,
  project_link       text,
  can_delay          boolean default false,
  paid               boolean default false,
  actual_payment_date date,
  owner              text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ------------------------------------------------------------
--  INVENTORY & STOCK
-- ------------------------------------------------------------
create table if not exists inventory (
  id              uuid primary key default gen_random_uuid(),
  category        text,
  brand_supplier  text,
  item            text,
  qty             numeric default 0,
  unit_cost       numeric default 0,
  sell_price      numeric default 0,
  currency        text default 'SAR',
  stock_location  text,
  funding_source  text,
  linked_project  text,
  stock_risk      text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
--  SUPPLIER LEDGER
-- ------------------------------------------------------------
create table if not exists supplier_ledger (
  id                uuid primary key default gen_random_uuid(),
  supplier          text not null,
  currency          text default 'SAR',
  po                numeric default 0,
  invoiced_amount   numeric default 0,
  paid_amount       numeric default 0,
  negotiation_action text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ------------------------------------------------------------
--  CUSTOMER LEDGER
-- ------------------------------------------------------------
create table if not exists customer_ledger (
  id              uuid primary key default gen_random_uuid(),
  project_name    text,
  project_id      text,
  currency        text default 'SAR',
  so              numeric default 0,       -- sales order (pre-VAT)
  invoiced_amount numeric default 0,
  paid_amount     numeric default 0,
  project_status  text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
--  AR AGING
-- ------------------------------------------------------------
create table if not exists ar_aging (
  id              uuid primary key default gen_random_uuid(),
  customer        text not null,
  current_amt     numeric default 0,
  d1_30           numeric default 0,
  d31_60          numeric default 0,
  d61_90          numeric default 0,
  d90_plus        numeric default 0,
  collection_owner text,
  action_required text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
--  SCENARIOS (stress test assumptions)
-- ------------------------------------------------------------
create table if not exists scenarios (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  delay_days    numeric default 0,
  reliability_pct numeric default 1.0,     -- 0..1
  notes         text,
  sort_order    int default 0
);

-- ------------------------------------------------------------
--  AUDIT LOG  (who changed what)
-- ------------------------------------------------------------
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_email  text,
  action      text,        -- create | update | delete
  entity      text,        -- table name
  entity_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================
--  SEED DATA
-- ============================================================

-- Default settings row
insert into company_settings (id) values (1) on conflict (id) do nothing;
insert into reserve_fund (id, target_reserve, reserve_pct, min_operating_cash)
  values (1, 150000, 0.05, 300000) on conflict (id) do nothing;

-- Exchange rates (edit to live rates)
insert into exchange_rates (currency, rate_to_sar) values
  ('SAR', 1.00),
  ('AED', 1.02),
  ('USD', 3.75),
  ('EUR', 4.05)
on conflict (currency) do nothing;

-- Scenarios (from the Excel "Scenario" sheet)
insert into scenarios (name, delay_days, reliability_pct, notes, sort_order) values
  ('Base Case',    0,  1.0, 'As expected',    1),
  ('Conservative', 14, 0.8, 'Some clients delayed', 2),
  ('Stress',       30, 0.6, 'Major delay',    3),
  ('Severe',       45, 0.4, 'Critical stress', 4)
on conflict do nothing;

-- Default admin user
--   email:    admin@gmail.com
--   password: admin@123!     (bcrypt hash below — CHANGE after first login)
insert into users (email, password_hash, full_name, role, language)
values (
  'admin@gmail.com',
  '$2a$10$AkYR3vxFY1KlqxxQ5hgA7uF1pOPycC4F/O9bAh7y7CrSZxFp7K/fi',
  'System Admin',
  'admin',
  'en'
) on conflict (email) do nothing;
