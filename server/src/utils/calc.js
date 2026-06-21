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
// Parse a date deterministically as a LOCAL calendar day, so date bucketing
// is identical whether the server runs in UTC (Vercel) or any other timezone.
export function parseDate(v) {
  if (!v) return null;
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(v);
  return isNaN(d) ? null : startOfDay(d);
}

// Format a Date as local YYYY-MM-DD (never via toISOString, which shifts to UTC).
export function ymd(d) {
  const x = new Date(d);
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${mm}-${dd}`;
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

// VAT amount of a payment = net amount × VAT rate (rate: 0 | 0.05 | 0.10 | 0.15).
export function vatOf(p) {
  return (Number(p.amount) || 0) * (Number(p.vat_rate) || 0);
}
// A payment's NET amount (excl. VAT) — used for profitability.
export function payNet(p, rates, base = 'SAR') {
  return toBase(Number(p.amount) || 0, p.currency, rates, base);
}
// A payment's GROSS cash amount (net + VAT) — used for cash flow.
export function payGross(p, rates, base = 'SAR') {
  return toBase((Number(p.amount) || 0) + vatOf(p), p.currency, rates, base);
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

  const inWindow = (r, dateField) => {
    const d = parseDate(r[dateField]);
    return d && d >= today && d <= in30;
  };

  const bank = Number(settings?.current_bank_balance) || 0;
  const expectedCollections = collections.reduce(
    (acc, r) => (inWindow(r, 'expected_date') ? acc + toBase(r.amount, r.currency, rates, base) : acc),
    0
  );
  // Payments are a cash outflow → use GROSS (net + VAT)
  const expectedPayments = payments.reduce(
    (acc, r) => (inWindow(r, 'due_date') ? acc + payGross(r, rates, base) : acc),
    0
  );
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
    current_bank_balance: round2(bank),
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
      return d && d >= ws && d < we ? acc + payGross(r, rates, base) : acc; // gross cash out
    }, 0);

    const net = inflows - outflows;
    // Reserve transfer rule (Excel H): if opening+net > 300k -> min(10% of surplus, 50k)
    const reserveTransfer =
      opening + net > 300000 ? Math.min((opening + net - 300000) * 0.1, 50000) : 0;
    const closing = opening + net - reserveTransfer;

    weekRows.push({
      index: i + 1,
      week_start: ymd(ws),
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
export function derivePayment(p) {
  const net = Number(p.amount) || 0;
  const vat = net * (Number(p.vat_rate) || 0);
  return { ...p, vat_amount: round2(vat), total_amount: round2(net + vat) }; // VAT auto-calculated from rate
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

/* ============================================================
   DECISION-SUPPORT / AUTOMATION LAYER
   These turn the raw forecast into management decisions:
   "what to buy, when to buy, when to collect, when to delay".
   ============================================================ */

/* ---- Available cash vs Committed cash ----
   Available  = liquid cash in bank right now.
   Committed  = payments already owed but not yet paid (commitments).
   Free       = what is genuinely safe to spend after commitments + reserve. */
export function computeCommitments({ settings, reserve, payments, collections, rates }) {
  const base = settings?.base_currency || 'SAR';
  const today = startOfDay(new Date());
  const in30 = addDays(today, 30);
  const bank = Number(settings?.current_bank_balance) || 0;
  const minOperating = Number(reserve?.min_operating_cash) || 0;

  const unpaid = payments.filter((p) => !p.paid);
  const committedTotal = unpaid.reduce((a, p) => a + payGross(p, rates, base), 0);
  const committed30 = unpaid.reduce((a, p) => {
    const d = parseDate(p.due_date);
    return d && d >= today && d <= in30 ? a + payGross(p, rates, base) : a;
  }, 0);
  const expectedColl30 = collections.reduce((a, c) => {
    const d = parseDate(c.expected_date);
    return d && d >= today && d <= in30 ? a + toBase(c.amount, c.currency, rates, base) : a;
  }, 0);

  // Free cash = bank - near-term commitments - the reserve we must keep
  const uncommitted = bank - committed30;
  const freeToSpend = bank - committed30 - minOperating;

  return {
    available_cash: round2(bank),
    committed_total: round2(committedTotal),
    committed_30d: round2(committed30),
    expected_collections_30d: round2(expectedColl30),
    min_operating_cash: round2(minOperating),
    uncommitted_cash: round2(uncommitted),
    free_to_spend: round2(freeToSpend),
    coverage_ratio: committed30 ? round2((bank + expectedColl30) / committed30) : null,
  };
}

/* ---- Cash-impact simulation for a proposed purchase order ----
   Re-runs the forecast WITH a hypothetical payment and reports the
   damage + a clear procurement recommendation. */
export function simulatePurchase({ settings, reserve, collections, payments, rates, po }) {
  const amount = Number(po?.amount) || 0;
  const date = po?.due_date;
  const weeks = Number(po?.weeks) || 13;
  const minOperating = Number(reserve?.min_operating_cash) || 0;
  const redLine = Number(settings?.status_red ?? 100000);

  const before = computeForecast({ settings, collections, payments, rates, weeks });
  const synthetic = { amount, currency: settings?.base_currency || 'SAR', due_date: date, paid: false };
  const after = computeForecast({
    settings,
    collections,
    payments: [...payments, synthetic],
    rates,
    weeks,
  });

  const minBefore = Math.min(...before.weeks.map((w) => w.closing));
  const minAfter = Math.min(...after.weeks.map((w) => w.closing));
  const worstWeek = after.weeks.reduce((m, w) => (w.closing < m.closing ? w : m), after.weeks[0]);

  // Did the PO push any week below the red line or into negative that wasn't before?
  const newlyBreached = after.weeks.filter((w, i) => w.closing < redLine && before.weeks[i].closing >= redLine);

  // Earliest week where issuing the PO would still leave cash above the red line.
  let recommendedDate = null;
  for (const w of before.weeks) {
    if (w.closing - amount >= redLine) {
      recommendedDate = w.week_start;
      break;
    }
  }

  let decision, reason;
  if (minAfter >= minOperating) {
    decision = 'SAFE';
    reason = 'Cash stays above the minimum operating level for the whole horizon.';
  } else if (minAfter >= redLine) {
    decision = 'CAUTION';
    reason = 'Cash stays positive but dips below the safe reserve. Proceed only if collections are on track.';
  } else if (minAfter >= 0) {
    decision = 'DELAY';
    reason = 'This purchase pushes cash below the critical line. Delay or split it, or secure a collection first.';
  } else {
    decision = 'AVOID';
    reason = 'This purchase makes cash go negative. Do not issue until cash recovers.';
  }

  return {
    amount: round2(amount),
    due_date: date,
    decision,
    reason,
    min_closing_before: round2(minBefore),
    min_closing_after: round2(minAfter),
    impact: round2(minAfter - minBefore),
    worst_week: worstWeek ? { week_start: worstWeek.week_start, closing: worstWeek.closing, status: worstWeek.status } : null,
    newly_breached_weeks: newlyBreached.map((w) => ({ week_start: w.week_start, closing: w.closing })),
    recommended_earliest_date: recommendedDate,
    weeks_before: before.weeks,
    weeks_after: after.weeks,
  };
}

/* ============================================================
   PROJECT-LEVEL MANAGEMENT ROLLUPS
   Links payments to projects and rolls up profitability, health,
   control-tower metrics and procurement readiness per project.
   ============================================================ */

// Only true generic connectors — NOT words that identify a project
// (e.g. "Schools", "Hospital", "Hotel" can be the actual project name/identity).
const NAME_STOP = new Set(['THE', 'AND', 'FOR', 'WITH', 'NEW', 'LTD', 'COMPANY', 'PROJECT']);

function nameTokens(name) {
  const words = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const filtered = words.filter((w) => w.length >= 3 && !NAME_STOP.has(w));
  // never leave a project with zero tokens (e.g. single-word "SCHOOLS")
  return filtered.length ? filtered : words.filter((w) => w.length >= 3);
}

// Pick the project a payment link refers to. Distinctive tokens (that appear
// in only one project) outweigh shared ones like "HOSPITAL" or "PALACE".
function matchProject(segment, projTok, freq) {
  const nm = String(segment || '').toUpperCase();
  let best = null;
  let bestScore = 0;
  for (const { p, tok } of projTok) {
    let score = 0;
    for (const t of tok) {
      if (nm.includes(t)) score += (freq[t] === 1 ? 10 : 1) * t.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore > 0 ? best : null;
}

// Map each project's status to an approximate delivery / installation %.
const STATUS_PROGRESS = {
  Signed: { delivery: 10, installation: 0 },
  'In Progress': { delivery: 50, installation: 25 },
  Delivered: { delivery: 100, installation: 75 },
  Invoiced: { delivery: 100, installation: 100 },
  Collected: { delivery: 100, installation: 100 },
  'On Hold': { delivery: 20, installation: 10 },
};

function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

// RULE (client): ANY expense assigned to a project is a project cost — this
// includes supplier payments, logistics, installation, SABER/customs/port fees,
// certification, inspection, storage, local transport, etc. The only always-
// company-overhead categories (never a project cost, even if mis-linked) are
// payroll and rent. Everything else: linked to a project → project cost;
// not linked to any project → company overhead (OPEX).
const ALWAYS_OVERHEAD = new Set(['Salaries', 'Rent']);

// A payment is company overhead if it is payroll/rent, or it isn't linked
// to any project.
function isOverheadPayment(p, projTok, freq) {
  if (ALWAYS_OVERHEAD.has(p.category)) return true;
  return !parseAllocations(p.project_link, projTok, freq);
}

// Parse a payment's Project Link into weighted allocations across projects.
//   "BARAYA"              -> 100% to Baraya
//   "ZUHA/PRINCE"         -> 50% / 50% (equal split)
//   "BARAYA:70, ZUHA:30"  -> 70% / 30% (explicit percentages)
// Returns [{ name, weight }] (weights sum to 1) or null if no project matched.
function parseAllocations(link, projTok, freq) {
  const segs = String(link || '').split(/[,/]+/).map((s) => s.trim()).filter(Boolean);
  if (!segs.length) return null;
  const parsed = [];
  for (const seg of segs) {
    const m = seg.match(/^(.*?)[:=]\s*([\d.]+)\s*%?$/);
    const nm = (m ? m[1] : seg).trim();
    const weight = m ? Number(m[2]) : null;
    const proj = matchProject(nm, projTok, freq);
    if (proj && !parsed.find((x) => x.name === proj.name)) {
      parsed.push({ name: proj.name, weight });
    }
  }
  if (!parsed.length) return null;
  const hasWeights = parsed.some((x) => x.weight != null);
  if (hasWeights) {
    const total = parsed.reduce((a, x) => a + (x.weight || 0), 0) || 1;
    return parsed.map((x) => ({ name: x.name, weight: (x.weight || 0) / total }));
  }
  return parsed.map((x) => ({ name: x.name, weight: 1 / parsed.length }));
}

export function computeProjectRollups({ projects, collections, payments, settings, rates }) {
  const base = settings?.base_currency || 'SAR';
  const projTok = projects.map((p) => ({ p, tok: nameTokens(p.name) }));
  // token frequency across projects → distinctive tokens get priority in matching
  const freq = {};
  projTok.forEach(({ tok }) => tok.forEach((t) => (freq[t] = (freq[t] || 0) + 1)));

  // Accumulate DIRECT project cost per project (overhead excluded), with
  // multi-project allocation. Track total vs paid; capture company overhead.
  const cost = new Map(projects.map((p) => [p.name, { total: 0, paid: 0 }]));
  let totalOverhead = 0;
  let totalVat = 0;
  for (const pay of payments) {
    totalVat += toBase(vatOf(pay), pay.currency, rates, base); // VAT tracked separately (net × rate)
    const amt = toBase(pay.amount, pay.currency, rates, base); // NET (excl. VAT) for profitability
    if (ALWAYS_OVERHEAD.has(pay.category)) {
      totalOverhead += amt; // payroll / rent → always company overhead
      continue;
    }
    const allocs = parseAllocations(pay.project_link, projTok, freq);
    if (!allocs) {
      totalOverhead += amt; // not linked to a project → company overhead (OPEX)
      continue;
    }
    // linked to a project → counts as that project's cost (any expense type)
    for (const a of allocs) {
      const c = cost.get(a.name);
      if (!c) continue;
      const portion = amt * a.weight;
      c.total += portion;
      if (pay.paid) c.paid += portion;
    }
  }

  const rollups = projects.map((p) => {
    const contract = Number(p.contract_value) || 0;
    const collected = Number(p.collected_to_date) || 0;
    const gpPct = Number(p.gross_profit_pct) || 0;
    const remainingAr = contract - collected;
    const expectedGp = contract * gpPct;
    const budgetCost = contract - expectedGp;

    const c = cost.get(p.name) || { total: 0, paid: 0 };
    const supplierCommitments = c.total; // direct project cost committed
    const paidCommitments = c.paid;
    const actualCost = supplierCommitments;
    const outstanding = supplierCommitments - paidCommitments;
    const actualGp = contract - actualCost; // GP = Contract Value − Project Costs
    const actualGpPct = contract ? actualGp / contract : 0;

    // ---- health score components (0..100), all from actual project data ----
    // Collections: how much of the contract has been collected
    const collectionPct = contract ? clamp((collected / contract) * 100) : 0;
    // Procurement: how much of the budgeted cost is already committed to suppliers
    const procurementPct = budgetCost > 0 ? clamp((supplierCommitments / budgetCost) * 100) : 0;
    // Delivery: management-entered progress %, else estimated from real progress
    // signals (how far collections and procurement have actually advanced).
    const hasProgress = p.progress_pct !== null && p.progress_pct !== undefined && p.progress_pct !== '';
    const progressProxy = clamp((collectionPct + procurementPct) / 2);
    const deliveryPct = hasProgress ? clamp(Number(p.progress_pct)) : progressProxy;
    const installationPct = hasProgress ? clamp(Number(p.progress_pct) * 0.85) : clamp(progressProxy * 0.85);
    // Profitability: actual gross margin % (Revenue − Cost) / Revenue.
    // Neutral 50 when no supplier cost is linked yet (can't be assessed).
    const sProfit = actualCost > 0 ? clamp(actualGpPct * 100) : 50;

    const sCollections = collectionPct;
    const sProcurement = procurementPct;
    const sDelivery = deliveryPct;
    const overall = Math.round(
      sCollections * 0.3 + sProfit * 0.3 + sDelivery * 0.2 + sProcurement * 0.2
    );
    const band = (v) => (v >= 70 ? 'good' : v >= 40 ? 'warn' : 'risk');

    // ---- procurement readiness ----
    let readiness, reason;
    if (supplierCommitments === 0) {
      readiness = 'READY';
      reason = 'No supplier commitments linked yet — safe to plan procurement.';
    } else {
      const coverage = outstanding > 0 ? remainingAr / outstanding : Infinity;
      if (collectionPct >= 50 && coverage >= 1) {
        readiness = 'READY';
        reason = 'Expected receivables cover outstanding supplier commitments.';
      } else if (coverage >= 0.6) {
        readiness = 'CAUTION';
        reason = 'Receivables partially cover commitments — proceed only on confirmed collections.';
      } else {
        readiness = 'HOLD';
        reason = 'Outstanding commitments exceed expected collections — wait for cash to arrive.';
      }
    }

    return {
      name: p.name,
      status: p.status,
      contract_value: round2(contract),
      collected: round2(collected),
      remaining_ar: round2(remainingAr),
      gp_pct: round4(gpPct),
      expected_gp: round2(expectedGp),
      budget_cost: round2(budgetCost),
      actual_cost: round2(actualCost),
      actual_gp: round2(actualGp),
      actual_gp_pct: round4(actualGpPct),
      supplier_commitments: round2(supplierCommitments),
      paid_commitments: round2(paidCommitments),
      outstanding_commitments: round2(outstanding),
      collection_pct: Math.round(collectionPct),
      procurement_pct: Math.round(procurementPct),
      delivery_pct: Math.round(deliveryPct),
      installation_pct: Math.round(installationPct),
      health: {
        overall,
        band: band(overall),
        collections: { score: Math.round(sCollections), band: band(sCollections) },
        procurement: { score: Math.round(sProcurement), band: band(sProcurement) },
        delivery: { score: Math.round(sDelivery), band: band(sDelivery) },
        profitability: { score: Math.round(sProfit), band: band(sProfit) },
      },
      readiness,
      readiness_reason: reason,
      cash_impact: round2(outstanding),
    };
  });

  const totalContract = rollups.reduce((a, r) => a + r.contract_value, 0);
  const totalProjectCost = rollups.reduce((a, r) => a + r.actual_cost, 0);
  const grossProfit = totalContract - totalProjectCost; // company gross profit (Rule 4)
  const netProfit = grossProfit - totalOverhead; // Rule 5: GP − overhead (OPEX)

  const totals = {
    contract_value: round2(totalContract),
    expected_gp: round2(rollups.reduce((a, r) => a + r.expected_gp, 0)),
    project_cost: round2(totalProjectCost),
    total_direct_cost: round2(totalProjectCost),
    overhead_opex: round2(totalOverhead),
    vat_total: round2(totalVat),
    gross_profit: round2(grossProfit),
    net_profit: round2(netProfit),
    remaining_ar: round2(rollups.reduce((a, r) => a + r.remaining_ar, 0)),
    supplier_commitments: round2(rollups.reduce((a, r) => a + r.supplier_commitments, 0)),
  };
  return { projects: rollups, totals };
}

/* ---- Monthly financial forecast: revenue / GP / OPEX / net profit ---- */
export function computeMonthlyForecast({ projects, collections, payments, settings, rates, months = 6 }) {
  const base = settings?.base_currency || 'SAR';
  // overhead = payments not linked to a project (or payroll/rent)
  const projTok = projects.map((p) => ({ p, tok: nameTokens(p.name) }));
  const freq = {};
  projTok.forEach(({ tok }) => tok.forEach((t) => (freq[t] = (freq[t] || 0) + 1)));
  const totalContract = projects.reduce((a, p) => a + (Number(p.contract_value) || 0), 0);
  const totalExpGp = projects.reduce(
    (a, p) => a + (Number(p.contract_value) || 0) * (Number(p.gross_profit_pct) || 0),
    0
  );
  const blendedGp = totalContract ? totalExpGp / totalContract : 0.2;

  const start = startOfDay(parseDate(settings?.forecast_start_date) || new Date());
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const buckets = [];
  for (let i = 0; i < months; i++) {
    const m = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const inRange = (d) => d && d >= m && d < next;

    const revenue = collections.reduce((a, c) => {
      const d = parseDate(c.expected_date);
      return inRange(d) ? a + toBase(c.amount, c.currency, rates, base) : a;
    }, 0);
    const opex = payments.reduce((a, p) => {
      const d = parseDate(p.due_date);
      return inRange(d) && isOverheadPayment(p, projTok, freq)
        ? a + toBase(p.amount, p.currency, rates, base)
        : a;
    }, 0);
    const grossProfit = revenue * blendedGp;
    buckets.push({
      month: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`,
      revenue: round2(revenue),
      gross_profit: round2(grossProfit),
      opex: round2(opex),
      net_profit: round2(grossProfit - opex),
    });
  }
  return { blended_gp_pct: round4(blendedGp), months: buckets };
}

/* ---- Action Center: prioritized management actions ----
   Turns the current cash picture into a ranked to-do list. */
export function buildActionCenter({ settings, reserve, dashboard, forecast, collections, payments, rates, rollups }) {
  const base = settings?.base_currency || 'SAR';
  const today = startOfDay(new Date());
  const in14 = addDays(today, 14);
  const actions = [];
  const sev = { critical: 3, high: 2, medium: 1 };

  // 1) Forecast weeks that go critical / negative
  forecast.weeks.forEach((w) => {
    if (w.status === 'Critical' || w.closing < 0) {
      actions.push({
        severity: w.closing < 0 ? 'critical' : 'high',
        type: 'cash_shortfall',
        title: `Projected cash shortfall — week of ${w.week_start}`,
        detail: `Closing balance falls to ${round2(w.closing)} ${base}.`,
        recommendation: 'Delay non-critical payments this week and accelerate top receivables.',
        date: w.week_start,
        amount: round2(w.closing),
      });
    }
  });

  // 2) Overdue collections (expected in the past, not yet collected)
  collections.forEach((c) => {
    const d = parseDate(c.expected_date);
    if (d && d < today && !c.actual_collection_date) {
      const days = Math.round((today - d) / (24 * 60 * 60 * 1000));
      actions.push({
        severity: days > 30 ? 'critical' : 'high',
        type: 'overdue_collection',
        title: `Overdue collection — ${c.customer || c.project || 'customer'}`,
        detail: `${round2(toBase(c.amount, c.currency, rates, base))} ${base} expected ${c.expected_date} (${days} days overdue).`,
        recommendation: 'Call the customer / send a payment reminder today.',
        owner: c.owner,
        date: c.expected_date,
        amount: round2(toBase(c.amount, c.currency, rates, base)),
      });
    }
  });

  // 3) Large upcoming payments in the next 14 days
  payments.forEach((p) => {
    if (p.paid) return;
    const d = parseDate(p.due_date);
    const amt = toBase(p.amount, p.currency, rates, base);
    if (d && d >= today && d <= in14 && amt >= 50000) {
      actions.push({
        severity: p.priority === 'Critical' ? 'critical' : 'high',
        type: 'upcoming_payment',
        title: `Large payment due soon — ${p.supplier || 'supplier'}`,
        detail: `${round2(amt)} ${base} due ${p.due_date} (${p.category || 'payment'}).`,
        recommendation: p.can_delay
          ? 'Can be delayed if cash is tight this week.'
          : 'Ensure funds are available; confirm before issuing.',
        owner: p.owner,
        date: p.due_date,
        amount: round2(amt),
      });
    }
  });

  // 4) Collection-dependency: weeks whose outflows exceed the opening balance
  //    (i.e. the week only survives if expected collections actually land)
  forecast.weeks.forEach((w) => {
    if (w.outflows > w.opening && w.inflows > 0) {
      actions.push({
        severity: 'medium',
        type: 'collection_dependency',
        title: `Payments depend on collections — week of ${w.week_start}`,
        detail: `Outflows ${round2(w.outflows)} exceed opening ${round2(w.opening)}; the week relies on ${round2(w.inflows)} ${base} of expected collections.`,
        recommendation: 'Confirm these collections before committing the week’s payments.',
        date: w.week_start,
        amount: round2(w.inflows),
      });
    }
  });

  // 4b) Explicit payment → collection dependencies (planned payment waiting on a receipt)
  const colById = new Map(collections.map((c) => [c.id, c]));
  payments.forEach((p) => {
    if (p.paid || !p.depends_on_collection_id) return;
    const dep = colById.get(p.depends_on_collection_id);
    if (dep && !dep.actual_collection_date) {
      actions.push({
        severity: 'high',
        type: 'payment_dependency',
        title: `Payment depends on a pending collection — ${p.supplier || 'supplier'}`,
        detail: `${round2(payGross(p, rates, base))} ${base} (${p.due_date || 'no date'}) is funded by collection from ${dep.customer || dep.project || 'customer'} (${round2(toBase(dep.amount, dep.currency, rates, base))} ${base}, due ${dep.expected_date || '—'}) which is not yet received.`,
        recommendation: 'Confirm the collection is received before releasing this payment.',
        owner: p.owner,
        date: p.due_date,
        amount: round2(payGross(p, rates, base)),
      });
    }
  });

  // 5) Reserve gap
  if (dashboard.reserve_gap > 0) {
    actions.push({
      severity: 'medium',
      type: 'reserve_gap',
      title: 'Reserve fund below target',
      detail: `Reserve gap of ${dashboard.reserve_gap} ${base} vs target.`,
      recommendation: 'Transfer surplus to the reserve in weeks with healthy closing balances.',
      amount: dashboard.reserve_gap,
    });
  }

  // 6) Project-level management actions (procurement decisions, risk, profitability)
  (rollups?.projects || []).forEach((r) => {
    if (r.readiness === 'HOLD') {
      actions.push({
        severity: 'high',
        type: 'procurement_decision',
        title: `Procurement decision needed — ${r.name}`,
        detail: `Outstanding supplier commitments ${r.outstanding_commitments} ${base} vs remaining receivables ${r.remaining_ar} ${base}.`,
        recommendation: 'Hold procurement until collections arrive, or secure a confirmed receipt first.',
        amount: r.outstanding_commitments,
      });
    }
    if (r.health.overall < 40) {
      actions.push({
        severity: 'high',
        type: 'high_risk_project',
        title: `High-risk project — ${r.name}`,
        detail: `Health score ${r.health.overall}/100 (collections ${r.collection_pct}%, delivery ${r.delivery_pct}%).`,
        recommendation: 'Review collections, delivery and cost exposure with the project owner.',
        amount: r.remaining_ar,
      });
    }
    if (r.gp_pct > 0 && r.actual_gp_pct < r.gp_pct * 0.5) {
      actions.push({
        severity: 'medium',
        type: 'profitability_warning',
        title: `Profitability warning — ${r.name}`,
        detail: `Actual GP ${(r.actual_gp_pct * 100).toFixed(0)}% vs target ${(r.gp_pct * 100).toFixed(0)}% (cost overrun risk).`,
        recommendation: 'Review supplier costs and scope; renegotiate or reprice if possible.',
        amount: r.actual_gp,
      });
    }
  });

  actions.sort((a, b) => sev[b.severity] - sev[a.severity]);
  const summary = {
    total: actions.length,
    critical: actions.filter((a) => a.severity === 'critical').length,
    high: actions.filter((a) => a.severity === 'high').length,
    medium: actions.filter((a) => a.severity === 'medium').length,
  };
  return { summary, actions };
}
