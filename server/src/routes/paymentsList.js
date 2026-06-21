import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { derivePayment } from '../utils/calc.js';

// Enriched payments LIST: adds VAT/total (derivePayment) plus the label and
// status of the collection each payment depends on. POST/PUT/DELETE fall
// through to the generic crudRouter mounted after this on the same path.
const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const [pays, cols] = await Promise.all([
    supabase.from('payments').select('*').order('due_date', { ascending: true }),
    supabase.from('collections').select('id,customer,project,amount,expected_date,actual_collection_date'),
  ]);
  if (pays.error) return res.status(500).json({ error: pays.error.message });

  const byId = new Map((cols.data || []).map((c) => [c.id, c]));
  const rows = (pays.data || []).map((p) => {
    const dep = p.depends_on_collection_id ? byId.get(p.depends_on_collection_id) : null;
    return {
      ...derivePayment(p),
      depends_on_label: dep
        ? `${dep.customer || dep.project || 'Collection'} • SAR ${Math.round(Number(dep.amount) || 0).toLocaleString()}`
        : null,
      depends_on_received: dep ? !!dep.actual_collection_date : null,
    };
  });
  res.json(rows);
});

export default router;
