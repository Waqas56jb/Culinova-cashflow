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
// Re-derive the opening baseline so the entered "Current Bank Balance" is the
// LIVE balance NOW: opening = current + (already-paid payments) − (already-received
// collections). This way the payments already marked Paid are NOT deducted again,
// and only future Paid-marking moves the balance.
async function openingFromCurrent(current) {
  const [pays, cols] = await Promise.all([
    supabase.from('payments').select('amount,vat_rate,paid'),
    supabase.from('collections').select('amount,actual_collection_date'),
  ]);
  const paidGross = (pays.data || [])
    .filter((p) => p.paid)
    .reduce((a, p) => a + (Number(p.amount) || 0) * (1 + (Number(p.vat_rate) || 0)), 0);
  const received = (cols.data || [])
    .filter((c) => c.actual_collection_date)
    .reduce((a, c) => a + (Number(c.amount) || 0), 0);
  return Number(current) + paidGross - received;
}

router.put('/company', requireRole('admin', 'cfo'), async (req, res) => {
  const patch = { ...req.body, id: 1, updated_at: new Date().toISOString() };
  // If the user set the Current Bank Balance, store the matching opening baseline.
  if (req.body.current_bank_balance != null) {
    patch.opening_bank_balance = await openingFromCurrent(req.body.current_bank_balance);
  }
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
