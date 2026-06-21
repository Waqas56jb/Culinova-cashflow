// Consolidates duplicate names that differ only by case/spacing (e.g.
// "ENDALUS" vs "Endalus", "DIAMOND GLARE" vs "Diamond Glare") into a single
// canonical name across the data, so each supplier/customer/owner appears once.
//
// Canonical = the most-frequently-used variant (tie → mixed-case, then longest).
//
// Usage:  node db/normalize-names.js          (dry run, shows what it would do)
//         node db/normalize-names.js --apply   (actually update the records)
import { supabase } from '../src/config/supabase.js';

const APPLY = process.argv.includes('--apply');
const key = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase(); // case/space-insensitive key

function pickCanonical(counts) {
  // counts: { variant: occurrences }
  const entries = Object.entries(counts);
  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // most frequent first
    const aMixed = /[a-z]/.test(a[0]) && /[A-Z]/.test(a[0]);
    const bMixed = /[a-z]/.test(b[0]) && /[A-Z]/.test(b[0]);
    if (aMixed !== bMixed) return bMixed ? 1 : -1; // prefer mixed case
    return b[0].length - a[0].length; // then longer
  });
  return entries[0][0];
}

async function normalizeColumn(table, column) {
  const { data, error } = await supabase.from(table).select(`id,${column}`);
  if (error) {
    console.log(`  ${table}.${column}: ERROR ${error.message}`);
    return 0;
  }
  // group variants
  const groups = {};
  data.forEach((r) => {
    const v = r[column];
    if (v == null || String(v).trim() === '') return;
    const k = key(v);
    groups[k] = groups[k] || {};
    groups[k][v] = (groups[k][v] || 0) + 1;
  });

  let updates = 0;
  for (const k of Object.keys(groups)) {
    const variants = groups[k];
    if (Object.keys(variants).length < 2) continue; // no duplicates
    const canonical = pickCanonical(variants);
    const others = Object.keys(variants).filter((v) => v !== canonical);
    console.log(`  ${table}.${column}: "${canonical}" ← ${others.map((o) => `"${o}"`).join(', ')}`);
    if (APPLY) {
      for (const o of others) {
        const { error: e2 } = await supabase.from(table).update({ [column]: canonical }).eq(column, o);
        if (e2) console.log(`     update failed for "${o}": ${e2.message}`);
        else updates++;
      }
    }
  }
  return updates;
}

async function run() {
  console.log(APPLY ? '== APPLYING normalization ==' : '== DRY RUN (use --apply to update) ==');
  let total = 0;
  total += await normalizeColumn('payments', 'supplier');
  total += await normalizeColumn('supplier_ledger', 'supplier');
  total += await normalizeColumn('collections', 'customer');
  total += await normalizeColumn('payments', 'owner');
  total += await normalizeColumn('collections', 'owner');
  console.log(APPLY ? `\nDone. ${total} record(s) updated.` : '\nDry run complete. Re-run with --apply to update.');
}

run().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
