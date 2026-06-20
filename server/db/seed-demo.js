// ============================================================
//  Demo seed — REAL sample data taken from CULINOVA_CashFlow_CFO.xlsx
//  Two real projects (Baraya & ZUHA) with their actual collections
//  and supplier payments, so the full workflow can be demonstrated:
//  project value -> collections -> payments -> remaining AR ->
//  cash-flow impact -> dashboard -> 13-week forecast.
//
//  Usage:  node db/seed-demo.js
//  (clears projects/collections/payments first, then inserts)
// ============================================================
import { supabase } from '../src/config/supabase.js';

const projects = [
  {
    name: 'Baraya – Extended Care Center',
    customer: 'SSC',
    contract_value: 730383.98,
    collected_to_date: 300000,
    gross_profit_pct: 0.2,
    status: 'In Progress',
    next_billing: 'Delivery',
    notes: 'Real project from Excel — demo',
  },
  {
    name: 'ZUHA HOTEL',
    customer: 'مؤسسة جمال عبدالرحمن الزامل',
    contract_value: 2928124.84,
    collected_to_date: 2304436.96,
    gross_profit_pct: 0.2,
    status: 'In Progress',
    next_billing: 'Delivery',
    notes: 'Real project from Excel — demo',
  },
];

const collections = [
  {
    project: 'Baraya – Extended Care Center',
    customer: 'SSC',
    amount: 284850.0,
    expected_date: '2026-07-01',
    probability_pct: 90,
    probability_status: 'High Probability',
    confirmed: false,
    owner: 'Ahmed',
    notes: 'From Excel Collections sheet',
  },
  {
    project: 'ZUHA HOTEL',
    customer: 'مؤسسة جمال عبدالرحمن الزامل',
    amount: 76890.15,
    expected_date: '2026-07-01',
    probability_pct: 95,
    probability_status: 'High Probability',
    confirmed: true,
    owner: 'Ahmed',
    notes: 'From Excel Collections sheet',
  },
];

const P = (category, supplier, amount, due_date, priority, project_link, notes) => ({
  category,
  supplier,
  amount,
  due_date,
  priority,
  project_link,
  notes,
  paid: false,
  owner: 'Mohammed',
});

const payments = [
  // ---- Baraya & ZUHA supplier payments (real, from Excel Payments sheet) ----
  // NOTE: multi-project shared rows (e.g. "ZUHA/PRINCE", "PRINCE/HIGH CARE/BARAYA")
  // were excluded so this demo stays strictly within the two demo projects.
  P('Supplier Payment', 'SICO', 16857.6, '2026-06-20', 'Medium', 'BARAYA', '1ST PAYMENT'),
  P('Supplier Payment', 'ENDALUS', 9242.55, '2026-06-25', 'High', 'BARAYA', 'PAYMENTS TERMS'),
  P('Supplier Payment', 'BURLODGE', 55379.89, '2026-06-26', 'Medium', 'BARAYA', '2ND PAYMENT'),
  P('Government Fees', 'GOVERNMENT', 4000.0, '2026-07-01', 'High', 'BARAYA', 'SAPER/CUSTOMS/PORT CHARGE'),
  P('Supplier Payment', 'ABU ALI', 15000.0, '2026-07-01', 'High', 'BARAYA', '1ST PAYMENT'),
  P('Supplier Payment', 'FASTCO', 81823.0, '2026-07-06', 'High', 'BARAYA', 'PAYMENTS TERMS'),
  P('Supplier Payment', 'SICO', 16857.6, '2026-07-05', 'Medium', 'BARAYA', '2ND PAYMENT'),
  P('Supplier Payment', 'LOCAL', 229144.0, '2026-07-05', 'High', 'ZUHA', '1ST PAYMENT'),
  P('Logistics & Transportation', 'POWER CARGO/LOADMAN', 4800.0, '2026-07-10', 'High', 'BARAYA', 'SHIPPING BARTCHER'),
  P('Supplier Payment', 'TUV', 1150.0, '2026-07-15', 'Medium', 'BARAYA', ''),
  P('Supplier Payment', 'LOCAL', 8560.0, '2026-07-20', 'High', 'BARAYA', 'PANININ, DEEM, INSECT KILLER'),
  P('Supplier Payment', 'Fathi Al-Mohtaseb Trading', 9694.0, '2026-07-20', 'High', 'BARAYA', 'CAN BE REPLACED WITH BARTSCHER'),
  P('Supplier Payment', 'ASANTI', 13800.0, '2026-07-20', 'High', 'BARAYA', 'menumaster 5 pcs'),
  P('Supplier Payment', 'ABU ALI', 15000.0, '2026-07-20', 'High', 'BARAYA', '2ND PAYMENT'),
  P('Supplier Payment', 'DIAMOND GLARE', 21710.0, '2026-07-20', 'High', 'BARAYA', 'ICE MAKER'),
  P('Supplier Payment', 'HASSAN', 27428.0, '2026-07-20', 'High', 'BARAYA', 'TORUNOUS + PROJECT'),
];

async function run() {
  // 1) Bank balance + forecast start (from Excel Dashboard / 13-Week Forecast)
  const { error: sErr } = await supabase
    .from('company_settings')
    .update({
      current_bank_balance: 133835.21,
      forecast_start_date: '2026-06-15',
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
  console.log('settings (bank balance 133,835.21):', sErr ? 'ERR ' + sErr.message : 'OK');

  // 2) Clear existing demo records (keep users / settings / scenarios)
  for (const t of ['collections', 'payments', 'projects']) {
    await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  // 3) Insert real sample data
  const pr = await supabase.from('projects').insert(projects).select('id');
  console.log('projects inserted:', pr.error ? 'ERR ' + pr.error.message : pr.data.length);
  const co = await supabase.from('collections').insert(collections).select('id');
  console.log('collections inserted:', co.error ? 'ERR ' + co.error.message : co.data.length);
  const pa = await supabase.from('payments').insert(payments).select('id');
  console.log('payments inserted:', pa.error ? 'ERR ' + pa.error.message : pa.data.length);

  console.log('\n  Demo data ready. Bank: 133,835.21 SAR | 2 projects | 2 collections | 16 payments (Baraya & ZUHA only)');
}

run().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
