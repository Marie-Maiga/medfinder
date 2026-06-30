-- Singleton config table (always exactly one row, id = 1)
CREATE TABLE app_settings (
  id                          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  response_timeout_sec        INTEGER NOT NULL DEFAULT 900,   -- 15 min
  max_pharmacies_per_request  INTEGER NOT NULL DEFAULT 5,
  whatsapp_bot_phone          TEXT DEFAULT NULL,
  updated_at                  TIMESTAMPTZ DEFAULT now(),
  updated_by                  UUID REFERENCES user_profiles(id)
);

-- Insert default row
INSERT INTO app_settings (id) VALUES (1);

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins manage settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');
