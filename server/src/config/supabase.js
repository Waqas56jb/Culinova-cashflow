import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn(
    '\x1b[33m[WARN]\x1b[0m SUPABASE_URL / SUPABASE_SERVICE_KEY missing in .env — ' +
      'API calls to the database will fail until you set them.'
  );
}

export const supabase = createClient(
  SUPABASE_URL || 'http://localhost',
  SUPABASE_SERVICE_KEY || 'missing',
  { auth: { persistSession: false } }
);
