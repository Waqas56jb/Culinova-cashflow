import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

/* ---------- Company settings (single row id=1) ---------- */
router.get('/company', async (_req, res) => {
  const { data, error } = await supabase.from('company_settings').select('*').eq('id', 1).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
router.put('/company', requireRole('admin', 'cfo'), async (req, res) => {
  const patch = { ...req.body, id: 1, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('company_settings')
    .upsert(patch)
    .eq('id', 1)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/* ---------- Reserve fund config (single row id=1) ---------- */
router.get('/reserve', async (_req, res) => {
  const { data, error } = await supabase.from('reserve_fund').select('*').eq('id', 1).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
router.put('/reserve', requireRole('admin', 'cfo'), async (req, res) => {
  const patch = { ...req.body, id: 1 };
  const { data, error } = await supabase
    .from('reserve_fund')
    .upsert(patch)
    .eq('id', 1)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/* ---------- Exchange rates ---------- */
router.get('/rates', async (_req, res) => {
  const { data, error } = await supabase.from('exchange_rates').select('*').order('currency');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
router.put('/rates/:currency', requireRole('admin', 'cfo'), async (req, res) => {
  const { rate_to_sar } = req.body || {};
  const { data, error } = await supabase
    .from('exchange_rates')
    .upsert({ currency: req.params.currency.toUpperCase(), rate_to_sar, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
