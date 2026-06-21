import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { nameTokens, matchProject } from '../utils/calc.js';

// Master lists for dropdowns (projects, suppliers, employees/owners, customers).
// Derived from existing data so dropdowns stay in sync and prevent typos /
// duplicate names that break reporting.
const router = Router();
router.use(requireAuth);

// unique + sorted, de-duplicated case/space-insensitively (one entry per name)
const uniqSorted = (arr) => {
  const map = new Map();
  arr
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean)
    .forEach((v) => {
      const k = v.replace(/\s+/g, ' ').toLowerCase();
      if (!map.has(k)) map.set(k, v);
    });
  return [...map.values()].sort((a, b) => a.localeCompare(b));
};

router.get('/', async (_req, res) => {
  try {
    const [projects, suppLedger, payments, collections, custLedger, aging] = await Promise.all([
      supabase.from('projects').select('name'),
      supabase.from('supplier_ledger').select('supplier'),
      supabase.from('payments').select('supplier,owner'),
      supabase.from('collections').select('id,customer,project,amount,expected_date,owner'),
      supabase.from('customer_ledger').select('project_name'),
      supabase.from('ar_aging').select('customer'),
    ]);

    // Resolve each collection's project text to the canonical project name so the
    // "depends on" dropdown can be filtered to collections of the same project,
    // even when the collection's project was typed differently (e.g. "Prince FAISAL"
    // vs the master "Prince FAISAL Palace").
    const projTok = (projects.data || []).map((p) => ({ p: { name: p.name }, tok: nameTokens(p.name) }));
    const freq = {};
    projTok.forEach(({ tok }) => tok.forEach((t) => (freq[t] = (freq[t] || 0) + 1)));
    const canonical = (text) => {
      const m = matchProject(text, projTok, freq);
      return m ? m.name : text || '';
    };

    const collectionRefs = (collections.data || [])
      .map((c) => ({
        value: c.id,
        project: canonical(c.project),
        label: `${c.customer || c.project || 'Collection'} • SAR ${Math.round(Number(c.amount) || 0).toLocaleString()} • ${c.expected_date || ''}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    res.json({
      projects: uniqSorted((projects.data || []).map((r) => r.name)),
      suppliers: uniqSorted([
        ...(suppLedger.data || []).map((r) => r.supplier),
        ...(payments.data || []).map((r) => r.supplier),
      ]),
      employees: uniqSorted([
        ...(payments.data || []).map((r) => r.owner),
        ...(collections.data || []).map((r) => r.owner),
      ]),
      customers: uniqSorted([
        ...(collections.data || []).map((r) => r.customer),
        ...(custLedger.data || []).map((r) => r.project_name),
        ...(aging.data || []).map((r) => r.customer),
      ]),
      collectionRefs,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
