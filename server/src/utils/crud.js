import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

async function logAudit(req, action, entity, entityId, details) {
  try {
    await supabase.from('audit_log').insert({
      user_email: req.user?.email,
      action,
      entity,
      entity_id: entityId ? String(entityId) : null,
      details,
    });
  } catch {
    /* audit failures must never break the request */
  }
}

/**
 * Build a standard REST resource router.
 * @param {string} table           Supabase table name
 * @param {object} opts
 *   - derive(row)        optional function to add computed fields on read
 *   - orderBy            default order column
 *   - writeRoles         roles allowed to create/update/delete
 *   - allowedFields      whitelist of writable columns
 */
export function crudRouter(table, opts = {}) {
  const {
    derive = (r) => r,
    orderBy = 'created_at',
    ascending = false,
    writeRoles = ['admin', 'cfo', 'sales'],
    allowedFields = null,
  } = opts;

  const router = Router();
  router.use(requireAuth);

  const clean = (body) => {
    if (!allowedFields) return body;
    const out = {};
    for (const k of allowedFields) if (k in body) out[k] = body[k];
    return out;
  };

  // LIST
  router.get('/', async (req, res) => {
    let q = supabase.from(table).select('*');
    if (orderBy) q = q.order(orderBy, { ascending });
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map(derive));
  });

  // GET one
  router.get('/:id', async (req, res) => {
    const { data, error } = await supabase.from(table).select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Not found' });
    res.json(derive(data));
  });

  // CREATE
  router.post('/', requireRole(...writeRoles), async (req, res) => {
    const payload = clean(req.body);
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) return res.status(400).json({ error: error.message });
    logAudit(req, 'create', table, data.id, payload);
    res.status(201).json(derive(data));
  });

  // UPDATE
  router.put('/:id', requireRole(...writeRoles), async (req, res) => {
    const payload = { ...clean(req.body), updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    logAudit(req, 'update', table, req.params.id, payload);
    res.json(derive(data));
  });

  // DELETE
  router.delete('/:id', requireRole('admin', 'cfo'), async (req, res) => {
    const { error } = await supabase.from(table).delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    logAudit(req, 'delete', table, req.params.id, null);
    res.json({ ok: true });
  });

  return router;
}
