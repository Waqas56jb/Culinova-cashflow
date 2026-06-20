import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import {
  computeDashboard,
  computeForecast,
  computeReserve,
  computeScenarios,
  computeCommitments,
  simulatePurchase,
  buildActionCenter,
  computeProjectRollups,
  computeMonthlyForecast,
} from '../utils/calc.js';

const router = Router();
router.use(requireAuth);

// Load all the raw inputs the engine needs, in parallel.
async function loadContext() {
  const [settings, reserve, ratesRows, collections, payments, scenarios, projects] = await Promise.all([
    supabase.from('company_settings').select('*').eq('id', 1).single(),
    supabase.from('reserve_fund').select('*').eq('id', 1).single(),
    supabase.from('exchange_rates').select('*'),
    supabase.from('collections').select('*'),
    supabase.from('payments').select('*'),
    supabase.from('scenarios').select('*'),
    supabase.from('projects').select('*'),
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
    projects: projects.data || [],
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

// GET /api/analytics/commitments  -> available vs committed cash
router.get('/commitments', async (_req, res) => {
  try {
    const ctx = await loadContext();
    res.json(computeCommitments(ctx));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/analytics/simulate  -> cash impact of a proposed purchase order
//   body: { amount, due_date, weeks? }
router.post('/simulate', async (req, res) => {
  try {
    const ctx = await loadContext();
    const { amount, due_date, weeks } = req.body || {};
    if (!amount || !due_date)
      return res.status(400).json({ error: 'amount and due_date are required' });
    res.json(simulatePurchase({ ...ctx, po: { amount, due_date, weeks } }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/analytics/action-center  -> prioritized management actions
router.get('/action-center', async (_req, res) => {
  try {
    const ctx = await loadContext();
    const forecast = computeForecast({ ...ctx });
    const dashboard = computeDashboard({ ...ctx, forecast });
    const rollups = computeProjectRollups(ctx);
    res.json(buildActionCenter({ ...ctx, dashboard, forecast, rollups }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/analytics/projects360  -> per-project rollups (profitability,
//   control tower, health score, procurement readiness — one rich payload)
router.get('/projects360', async (_req, res) => {
  try {
    const ctx = await loadContext();
    res.json(computeProjectRollups(ctx));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/analytics/monthly-forecast?months=6
router.get('/monthly-forecast', async (req, res) => {
  try {
    const ctx = await loadContext();
    const months = Number(req.query.months) || 6;
    res.json(computeMonthlyForecast({ ...ctx, months }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
