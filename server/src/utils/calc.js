// ============================================================
//  CULINOVA — Calculation Engine
//  Faithful re-implementation of the Excel workbook logic.
//  Every number on the dashboard / forecast / scenario comes
//  from a pure function here, so results are always consistent.
// ============================================================

const DAY = 24 * 60 * 60 * 1000;

/* ---------- date helpers ---------- */
export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d, n) {
  return new Date(startOfDay(d).getTime() + n * DAY);
}
export function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : startOfDay(d);
}
// Monday of the week containing `d`
export function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // days since Monday
  return addDays(x, -diff);
}

/* ---------- currency ---------- */
// rates: { SAR:1, AED:1.02, USD:3.75, EUR:4.05 }  (1 unit = ? base)
export function toBase(amount, currency, rates, base = 'SAR') {
  const a = Number(amount) || 0;
  if (!currency || currency === base) return a;
  const r = rates?.[currency];
  return r ? a * r : a; // fall back to raw amount if rate unknown
}

/* ---------- cash status (Excel rule, shared everywhere) ----------
   Green   > green       (default 300,000)
   Yellow  yellow..green  (150k..300k)
   Red     red..yellow    (100k..150k)
   Critical < red         (<100k)                                   */
export function cashStatus(value, t = { green: 300000, yellow: 150000, red: 100000 }) {
  if (value < t.red) return 'Critical';
  if (value < t.yellow) return 'Red';
  if (value < t.green) return 'Yellow';
  return 'Green';
}

/* ============================================================
   DASHBOARD KPIs
   ============================================================ */
export function computeDashboard({
  settings,
  reserve,
  collections,
  payments,
  rates,
  forecast,
}) {
  const base = settings?.base_currency || 'SAR';
  const today = startOfDay(new Date());
  const in30 = addDays(today, 30);

  const sumWindow = (rows, dateField) =>
    rows.reduce((acc, r) => {
      const d = parseDate(r[dateField]);
      if (d && d >= today && d <= in30)
        return acc + toBase(r.amount, r.currency, rates, base);
      return acc;
    }, 0);

  const bank = Number(settings?.current_bank_balance) || 0;
  const expectedCollections = sumWindow(collections, 'expected_date');
  const expectedPayments = sumWindow(payments, 'due_date');
  const netCashPosition = bank + expectedCollections - expectedPayments;

  const thresholds = {
    green: Number(settings?.status_green ?? 300000),
    yellow: Number(settings?.status_yellow ?? 150000),
    red: Number(settings?.status_red ?? 100000),
  };

  const reserveBalance = Number(reserve?.current_balance) || 0;
  const targetReserve = Number(reserve?.target_reserve) || 0;
  const reserveGap = Math.max(targetReserve - reserveBalance, 0);

  const closings = (forecast?.weeks || []).map((w) => w.closing);
  const minClosing = closings.length ? Math.min(...closings) : 0;
  const criticalWeek =
    forecast?.weeks?.find((w) => w.closing === minClosing)?.week_start || null;

  return {
    base_currency: base,
    current_bank_balance: bank,
    expected_collections_30d: round2(expectedCollections),
    expected_payments_30d: round2(expectedPayments),
    net_cash_position_30d: round2(netCashPosition),
    cash_status: cashStatus(netCashPosition, thresholds),
    reserve_fund_balance: reserveBalance,
    target_reserve: targetReserve,
    reserve_gap: round2(reserveGap),
    min_closing_13w: round2(minClosing),
    critical_week: criticalWeek,
    thresholds,
  };
}

/* ============================================================
   13-WEEK (extendable) CASH FLOW FORECAST
   Mirrors the "13 Week Forecast" sheet engine.
   ============================================================ */
export function computeForecast({
  settings,
  collections,
  payments,
  rates,
  weeks = 13,
  startDate,
}) {
  const base = settings?.base_currency || 'SAR';
  const thresholds = {
    green: Number(settings?.status_green ?? 300000),
    yellow: Number(settings?.status_yellow ?? 150000),
    red: Number(settings?.status_red ?? 100000),
  };
  const start = startOfWeek(parseDate(startDate || settings?.forecast_start_date) || new Date());
  let opening = Number(settings?.current_bank_balance) || 0;

  const weekRows = [];
  for (let i = 0; i < weeks; i++) {
    const ws = addDays(start, i * 7);
    const we = addDays(ws, 7);

    const inflows = collections.reduce((acc, r) => {
      const d = parseDate(r.expected_date);
      return d && d >= ws && d < we ? acc + toBase(r.amount, r.currency, rates, base) : acc;
    }, 0);
    const outflows = payments.reduce((acc, r) => {
      const d = parseDate(r.due_date);
      return d && d >= ws && d < we ? acc + toBase(r.amount, r.currency, rates, base) : acc;
    }, 0);

    const net = inflows - outflows;
    // Reserve transfer rule (Excel H): if opening+net > 300k -> min(10% of surplus, 50k)
    const reserveTransfer =
      opening + net > 300000 ? Math.min((opening + net - 300000) * 0.1, 50000) : 0;
    const closing = opening + net - reserveTransfer;

    weekRows.push({
      index: i + 1,
      week_start: ws.toISOString().slice(0, 10),
      opening: round2(opening),
      inflows: round2(inflows),
      outflows: round2(outflows),
      net: round2(net),
      reserve_transfer: round2(reserveTransfer),
      closing: round2(closing),
      status: cashStatus(closing, thresholds),
    });
    opening = closing;
  }
  return { weeks: weekRows };
}

/* ============================================================
   RESERVE FUND
   ============================================================ */
export function computeReserve({ reserve, forecast }) {
  const target = Number(reserve?.target_reserve) || 0;
  const balance = Number(reserve?.current_balance) || 0;
  const gap = Math.max(target - balance, 0);
  const firstWeekTransfer = forecast?.weeks?.[0]?.reserve_transfer || 0;
  return {
    current_balance: balance,
    target_reserve: target,
    reserve_pct: Number(reserve?.reserve_pct) || 0,
    min_operating_cash: Number(reserve?.min_operating_cash) || 0,
    reserve_gap: round2(gap),
    suggested_transfer_this_week: round2(Math.min(firstWeekTransfer, gap)),
  };
}

/* ============================================================
   SCENARIO ANALYSIS — impact of delayed / unreliable collections
   ============================================================ */
export function computeScenarios({ scenarios, dashboard, settings }) {
  const thresholds = dashboard.thresholds;
  const bank = dashboard.current_bank_balance;
  const baseCollections = dashboard.expected_collections_30d;
  const payments30 = dashboard.expected_payments_30d;

  return scenarios
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((s) => {
      const reliability = Number(s.reliability_pct) || 0;
      const adjusted = baseCollections * reliability;
      const projected = bank + adjusted - payments30;
      return {
        name: s.name,
        delay_days: Number(s.delay_days) || 0,
        reliability_pct: reliability,
        notes: s.notes || '',
        adjusted_collections_30d: round2(adjusted),
        payments_30d: round2(payments30),
        starting_bank: round2(bank),
        projected_cash: round2(projected),
        status: cashStatus(projected, thresholds),
      };
    });
}

/* ============================================================
   PER-ROW DERIVED FIELDS (ledgers, projects, inventory, aging)
   ============================================================ */
export function deriveProject(p) {
  const cv = Number(p.contract_value) || 0;
  const col = Number(p.collected_to_date) || 0;
  return {
    ...p,
    remaining_ar: round2(cv - col),
    expected_gross_profit: round2(cv * (Number(p.gross_profit_pct) || 0)),
  };
}
export function deriveCollection(c) {
  const exp = parseDate(c.expected_date);
  const act = parseDate(c.actual_collection_date);
  let delayDays = null;
  if (exp) {
    const ref = act || startOfDay(new Date());
    delayDays = Math.round((ref - exp) / DAY);
  }
  return { ...c, delay_days: delayDays };
}
export function deriveInventory(i) {
  const qty = Number(i.qty) || 0;
  const totalCost = qty * (Number(i.unit_cost) || 0);
  const potentialRevenue = qty * (Number(i.sell_price) || 0);
  return {
    ...i,
    total_cost: round2(totalCost),
    potential_revenue: round2(potentialRevenue),
    expected_gross_profit: round2(potentialRevenue - totalCost),
  };
}
export function deriveSupplierLedger(s, vatRate = 0.15) {
  const po = Number(s.po) || 0;
  const poVat = po * (1 + vatRate);
  const invoiced = Number(s.invoiced_amount) || 0;
  const paid = Number(s.paid_amount) || 0;
  return {
    ...s,
    po_plus_vat: round2(poVat),
    invoice_balance: round2(invoiced - paid),
    closing_balance: round2(poVat - paid),
  };
}
export function deriveCustomerLedger(c, vatRate = 0.15) {
  const so = Number(c.so) || 0;
  const soVat = so * (1 + vatRate);
  const invoiced = Number(c.invoiced_amount) || 0;
  const paid = Number(c.paid_amount) || 0;
  return {
    ...c,
    so_plus_vat: round2(soVat),
    collection_pct: soVat ? round4(paid / soVat) : 0,
    invoice_minus_paid: round2(paid - invoiced),
    remaining_total: round2(soVat - paid),
  };
}
export function deriveAging(a) {
  const total =
    (Number(a.current_amt) || 0) +
    (Number(a.d1_30) || 0) +
    (Number(a.d31_60) || 0) +
    (Number(a.d61_90) || 0) +
    (Number(a.d90_plus) || 0);
  return { ...a, total: round2(total) };
}

/* ---------- rounding ---------- */
export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
export function round4(n) {
  return Math.round((Number(n) + Number.EPSILON) * 10000) / 10000;
}
