import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin')); // user management = admin only

const PUBLIC = 'id,email,full_name,role,language,is_active,created_at';

// LIST users
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select(PUBLIC)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// CREATE user
router.post('/', async (req, res) => {
  const { email, password, full_name, role = 'viewer', language = 'en' } = req.body || {};
  if (!email || !password || !full_name)
    return res.status(400).json({ error: 'email, password, full_name required' });
  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('users')
    .insert({ email: email.toLowerCase().trim(), password_hash, full_name, role, language })
    .select(PUBLIC)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// UPDATE user (role, active, name, language, optional new password)
router.put('/:id', async (req, res) => {
  const { full_name, role, language, is_active, password } = req.body || {};
  const patch = { updated_at: new Date().toISOString() };
  if (full_name !== undefined) patch.full_name = full_name;
  if (role !== undefined) patch.role = role;
  if (language !== undefined) patch.language = language;
  if (is_active !== undefined) patch.is_active = is_active;
  if (password) patch.password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', req.params.id)
    .select(PUBLIC)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE user
router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'You cannot delete your own account' });
  const { error } = await supabase.from('users').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
