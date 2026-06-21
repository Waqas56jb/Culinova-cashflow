// Manually merge spelling variants of a name into one canonical name across
// all relevant tables (for cases auto-normalisation can't detect, e.g.
// "ENDALAUS" vs "ENDALUS", or "APL" vs "Advanced Power Logistics Services").
//
// Usage:
//   node db/merge-name.js supplier "ENDALAUS" "ENDALUS" "Endalas"
//   node db/merge-name.js customer "SSC" "S.S.C" "ssc co"
//   node db/merge-name.js owner    "Mohammed" "Mohamed" "mohammad"
//
// First arg = field (supplier | customer | owner). Second = canonical name.
// Remaining = variants to replace (matched case-insensitively).
import { supabase } from '../src/config/supabase.js';

const FIELDS = {
  supplier: [['payments', 'supplier'], ['supplier_ledger', 'supplier']],
  customer: [['collections', 'customer']],
  owner: [['payments', 'owner'], ['collections', 'owner']],
};

const [field, canonical, ...variants] = process.argv.slice(2);

if (!field || !FIELDS[field] || !canonical || variants.length === 0) {
  console.log('Usage: node db/merge-name.js <supplier|customer|owner> "<Canonical>" "<variant1>" ["<variant2>"...]');
  process.exit(1);
}

async function run() {
  let total = 0;
  for (const [table, column] of FIELDS[field]) {
    for (const v of variants) {
      // case-insensitive exact match (ilike with no wildcards)
      const { data, error } = await supabase
        .from(table)
        .update({ [column]: canonical })
        .ilike(column, v)
        .select('id');
      if (error) console.log(`  ${table}.${column} "${v}": ERROR ${error.message}`);
      else if (data.length) {
        console.log(`  ${table}.${column}: "${v}" → "${canonical}" (${data.length} row(s))`);
        total += data.length;
      }
    }
  }
  console.log(`\nDone. ${total} record(s) merged into "${canonical}".`);
}

run().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
