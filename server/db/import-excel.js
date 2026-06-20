// ============================================================
//  FULL Excel import — replaces all demo/mock data with the
//  complete real data from CULINOVA_CashFlow_CFO.xlsx.
//  Reads server/db/excel_import.json (produced by parse-excel.py).
//
//  Usage:  node db/import-excel.js
// ============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../src/config/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'excel_import.json'), 'utf8'));

const TABLES = [
  'collections',
  'payments',
  'projects',
  'inventory',
  'supplier_ledger',
  'customer_ledger',
  'ar_aging',
];

async function run() {
  // 1) Bank balance + forecast start (Dashboard / 13-Week Forecast)
  const s = await supabase
    .from('company_settings')
    .update({
      current_bank_balance: 133835.21,
      forecast_start_date: '2026-06-15',
      base_currency: 'SAR',
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
  console.log('company_settings (bank 133,835.21):', s.error ? 'ERR ' + s.error.message : 'OK');

  // 2) Clear every data table (keep users / settings / reserve / scenarios / rates)
  for (const t of TABLES) {
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.log('clear', t, 'ERR', error.message);
  }
  // also clear audit noise from imports
  await supabase.from('audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 3) Insert all real rows, table by table
  let ok = true;
  for (const t of TABLES) {
    const rows = data[t] || [];
    if (rows.length === 0) {
      console.log(`${t.padEnd(18)} 0 rows (nothing to insert)`);
      continue;
    }
    const { data: inserted, error } = await supabase.from(t).insert(rows).select('id');
    if (error) {
      ok = false;
      console.log(`${t.padEnd(18)} ERROR: ${error.message}`);
    } else {
      console.log(`${t.padEnd(18)} inserted ${inserted.length} / ${rows.length}`);
    }
  }

  console.log(ok ? '\n  ✓ Full Excel import complete.' : '\n  ✗ Import had errors (see above).');
}

run().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
