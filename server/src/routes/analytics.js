import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import {
  computeDashboard,
  computeForecast,
  computeReserve,
  computeScenarios,
} from '../utils/calc.js';

const router = Router();
router.use(requireAuth);

// Load all the raw inputs the engine needs, in parallel.
async function loadContext() {
  const [settings, reserve, ratesRows, collections, payments, scenarios] = await Promise.all([
    supabase.from('company_settings').select('*').eq('id', 1).single(),
    supabase.from('reserve_fund').select('*').eq('id', 1).single(),
    supabase.from('exchange_rates').select('*'),
    supabase.from('collections').select('amount,currency,expected_date'),
    supabase.from('payments').select('amount,currency,due_date'),
    supabase.from('scenarios').select('*'),
  ]);

  const rates = {};
  (ratesRows.data || []).forEach((r) => (rates[r.currency] = Number(r.rate_to_sar)));

  return {
    settings: settings.data || {},
    reserve: reserve.data || {},
    rates,
    collections: collections.data || [],
    payments: payments.data || [],
    scenarios: scenarios.data || [],
  };
}

// GET /api/analytics/overview  -> everything the dashboard needs in one call
router.get('/overview', async (req, res) => {
  try {
    const ctx = await loadContext();
    const weeks = Number(req.query.weeks) || 13;
    const forecast = computeForecast({ ...ctx, weeks });
    const dashboard = computeDashboard({ ...ctx, forecast });
    const reserve = computeReserve({ reserve: ctx.reserve, forecast });
    const scenarios = computeScenarios({ scenarios: ctx.scenarios, dashboard, settings: ctx.settings });
    res.json({ dashboard, forecast, reserve, scenarios });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/analytics/forecast?weeks=13
router.get('/forecast', async (req, res) => {
  try {
    const ctx = await loadContext();
    const weeks = Number(req.query.weeks) || 13;
    res.json(computeForecast({ ...ctx, weeks }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/analytics/scenarios
router.get('/scenarios', async (_req, res) => {
  try {
    const ctx = await loadContext();
    const forecast = computeForecast({ ...ctx });
    const dashboard = computeDashboard({ ...ctx, forecast });
    res.json(computeScenarios({ scenarios: ctx.scenarios, dashboard, settings: ctx.settings }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
