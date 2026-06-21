import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

// Master lists for dropdowns (projects, suppliers, employees/owners, customers).
// Derived from existing data so dropdowns stay in sync and prevent typos /
// duplicate names that break reporting.
const router = Router();
router.use(requireAuth);

const uniqSorted = (arr) =>
  [...new Set(arr.map((x) => (x == null ? '' : String(x).trim())).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

router.get('/', async (_req, res) => {
  try {
    const [projects, suppLedger, payments, collections, custLedger, aging] = await Promise.all([
      supabase.from('projects').select('name'),
      supabase.from('supplier_ledger').select('supplier'),
      supabase.from('payments').select('supplier,owner'),
      supabase.from('collections').select('customer,owner'),
      supabase.from('customer_ledger').select('project_name'),
      supabase.from('ar_aging').select('customer'),
    ]);

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
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
