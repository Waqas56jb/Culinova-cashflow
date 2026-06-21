import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import projectsList from './routes/projectsList.js';
import { crudRouter } from './utils/crud.js';
import {
  deriveProject,
  deriveCollection,
  derivePayment,
  deriveInventory,
  deriveSupplierLedger,
  deriveCustomerLedger,
  deriveAging,
} from './utils/calc.js';

const app = express();
const PORT = process.env.PORT || 5000;

const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((s) => s.trim());

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'culinova-api' }));

// Auth & users
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Data resources (CRUD + derived fields)
// Enriched GET list for projects (adds calculated cost & actual GP%); other verbs fall through.
app.use('/api/projects', projectsList);
app.use('/api/projects', crudRouter('projects', { derive: deriveProject, orderBy: 'name', ascending: true }));
app.use('/api/collections', crudRouter('collections', { derive: deriveCollection, orderBy: 'expected_date', ascending: true }));
app.use('/api/payments', crudRouter('payments', { derive: derivePayment, orderBy: 'due_date', ascending: true }));
app.use('/api/inventory', crudRouter('inventory', { derive: deriveInventory }));
app.use('/api/supplier-ledger', crudRouter('supplier_ledger', { derive: (r) => deriveSupplierLedger(r), orderBy: 'supplier', ascending: true }));
app.use('/api/customer-ledger', crudRouter('customer_ledger', { derive: (r) => deriveCustomerLedger(r), orderBy: 'project_name', ascending: true }));
app.use('/api/ar-aging', crudRouter('ar_aging', { derive: deriveAging, orderBy: 'customer', ascending: true }));
app.use('/api/scenarios', crudRouter('scenarios', { orderBy: 'sort_order', ascending: true, writeRoles: ['admin', 'cfo'] }));

// Audit log (read-only, admin/cfo)
app.use('/api/audit', crudRouter('audit_log', { orderBy: 'created_at', ascending: false, writeRoles: ['admin'] }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Local dev: start an HTTP server. On Vercel (serverless) we export the app instead.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  CULINOVA API running on http://localhost:${PORT}`);
    console.log(`  Allowed origins: ${origins.join(', ')}\n`);
  });
}

export default app;
