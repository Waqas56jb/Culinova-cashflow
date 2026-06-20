import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { deriveProject, computeProjectRollups } from '../utils/calc.js';

// Enriched project LIST: each project includes its calculated cost and
// actual GP / GP% (from Revenue − Cost). POST/PUT/DELETE fall through to the
// generic crudRouter mounted after this on the same path.
const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const [proj, pays, settings, rates] = await Promise.all([
    supabase.from('projects').select('*').order('name', { ascending: true }),
    supabase.from('payments').select('*'),
    supabase.from('company_settings').select('*').eq('id', 1).single(),
    supabase.from('exchange_rates').select('*'),
  ]);
  if (proj.error) return res.status(500).json({ error: proj.error.message });

  const rateMap = {};
  (rates.data || []).forEach((r) => (rateMap[r.currency] = Number(r.rate_to_sar)));

  const rollup = computeProjectRollups({
    projects: proj.data,
    collections: [],
    payments: pays.data || [],
    settings: settings.data || {},
    rates: rateMap,
  });
  const byName = new Map(rollup.projects.map((r) => [r.name, r]));

  const rows = proj.data.map((p) => {
    const r = byName.get(p.name) || {};
    const hasCost = (r.actual_cost || 0) > 0;
    return {
      ...deriveProject(p),
      actual_cost: r.actual_cost ?? 0,
      actual_gp: hasCost ? r.actual_gp : null, // null until project costs are linked
      actual_gp_pct: hasCost ? r.actual_gp_pct : null,
    };
  });
  res.json(rows);
});

export default router;
