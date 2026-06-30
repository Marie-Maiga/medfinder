import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const sql = `
CREATE TABLE IF NOT EXISTS app_settings (
  id                          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  response_timeout_sec        INTEGER NOT NULL DEFAULT 900,
  max_pharmacies_per_request  INTEGER NOT NULL DEFAULT 5,
  whatsapp_bot_phone          TEXT DEFAULT NULL,
  updated_at                  TIMESTAMPTZ DEFAULT now(),
  updated_by                  UUID REFERENCES user_profiles(id)
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'authenticated read settings'
  ) THEN
    CREATE POLICY "authenticated read settings"
      ON app_settings FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'admins manage settings'
  ) THEN
    CREATE POLICY "admins manage settings"
      ON app_settings FOR UPDATE TO authenticated
      USING (current_user_role() = 'admin')
      WITH CHECK (current_user_role() = 'admin');
  END IF;
END $$;
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { error } = await (supabase.rpc('exec_sql', { sql }) as any).catch(() => ({ error: 'rpc not available' }))

if (error) {
  // rpc not available — try direct query via REST
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
    body: JSON.stringify({ sql }),
  })
  if (!res.ok) {
    console.error('Cannot run raw SQL via RPC. Please run this SQL manually in the Supabase dashboard SQL editor:')
    console.log(sql)
    process.exit(1)
  }
}

console.log('Migration applied successfully.')
