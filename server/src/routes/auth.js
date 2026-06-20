import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  // Database not set up yet (tables missing) → give a clear message, not "invalid credentials"
  if (error?.code === 'PGRST205' || /schema cache|does not exist/i.test(error?.message || '')) {
    return res
      .status(503)
      .json({ error: 'Database not initialized. Run the schema migration first (server/db).' });
  }
  if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      language: user.language,
    },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id,email,full_name,role,language,is_active')
    .eq('id', req.user.id)
    .single();
  if (error) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

// PUT /api/auth/me  (update own profile / language / password)
router.put('/me', requireAuth, async (req, res) => {
  const { full_name, language, password } = req.body || {};
  const patch = { updated_at: new Date().toISOString() };
  if (full_name) patch.full_name = full_name;
  if (language) patch.language = language;
  if (password) patch.password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', req.user.id)
    .select('id,email,full_name,role,language')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
