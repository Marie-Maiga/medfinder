-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- ─────────────────────────────────────────
-- RÉFÉRENTIELS
-- ─────────────────────────────────────────

CREATE TABLE neighborhoods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  city         TEXT NOT NULL DEFAULT 'Niamey',
  centroid_lat DOUBLE PRECISION NOT NULL,
  centroid_lng DOUBLE PRECISION NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pharmacies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  whatsapp_phone    TEXT NOT NULL UNIQUE,
  neighborhood_id   UUID REFERENCES neighborhoods(id),
  address           TEXT,
  lat               DOUBLE PRECISION NOT NULL,
  lng               DOUBLE PRECISION NOT NULL,
  is_active         BOOLEAN DEFAULT true,
  avg_response_time INTEGER DEFAULT NULL,
  response_rate     NUMERIC(5,2) DEFAULT NULL,
  availability_rate NUMERIC(5,2) DEFAULT NULL,
  global_score      NUMERIC(5,2) DEFAULT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE medicines (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  aliases    TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- UTILISATEURS
-- ─────────────────────────────────────────

CREATE TABLE user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- DEMANDES
-- ─────────────────────────────────────────

CREATE TABLE requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id              UUID REFERENCES user_profiles(id),
  patient_name             TEXT,
  patient_phone            TEXT NOT NULL,
  patient_neighborhood_id  UUID REFERENCES neighborhoods(id),
  patient_lat              DOUBLE PRECISION,
  patient_lng              DOUBLE PRECISION,
  effective_lat            DOUBLE PRECISION NOT NULL,
  effective_lng            DOUBLE PRECISION NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','sent','partial','completed','failed','cancelled')),
  pharmacies_contacted     INTEGER DEFAULT 0,
  pharmacies_responded     INTEGER DEFAULT 0,
  timeout_at               TIMESTAMPTZ,
  result_sent_at           TIMESTAMPTZ,
  feedback_sent_at         TIMESTAMPTZ,
  patient_feedback         TEXT CHECK (patient_feedback IN ('found', 'not_found')),
  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE request_medicines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id),
  name_raw    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE request_pharmacies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  pharmacy_id       UUID NOT NULL REFERENCES pharmacies(id),
  distance_meters   INTEGER NOT NULL,
  rank              INTEGER NOT NULL,
  whatsapp_msg_id   TEXT,
  sent_at           TIMESTAMPTZ,
  response_status   TEXT DEFAULT 'pending'
                      CHECK (response_status IN ('pending','available','unavailable','timeout','error')),
  responded_at      TIMESTAMPTZ,
  response_time_sec INTEGER,
  pharmacy_note     TEXT,
  UNIQUE(request_id, pharmacy_id)
);

CREATE TABLE request_pharmacy_medicines (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_pharmacy_id  UUID NOT NULL REFERENCES request_pharmacies(id) ON DELETE CASCADE,
  request_medicine_id  UUID NOT NULL REFERENCES request_medicines(id) ON DELETE CASCADE,
  availability         TEXT DEFAULT 'unknown'
                         CHECK (availability IN ('available','unavailable','unknown'))
);

-- ─────────────────────────────────────────
-- LOGS & AUDIT
-- ─────────────────────────────────────────

CREATE TABLE whatsapp_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction     TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  from_phone    TEXT NOT NULL,
  to_phone      TEXT NOT NULL,
  wa_message_id TEXT UNIQUE,
  message_type  TEXT,
  template_name TEXT,
  body_preview  TEXT,
  status        TEXT,
  request_id    UUID REFERENCES requests(id),
  pharmacy_id   UUID REFERENCES pharmacies(id),
  raw_payload   JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES user_profiles(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- INDEX
-- ─────────────────────────────────────────

CREATE INDEX idx_requests_status        ON requests(status);
CREATE INDEX idx_requests_created_at    ON requests(created_at DESC);
CREATE INDEX idx_requests_operator      ON requests(operator_id);
CREATE INDEX idx_request_pharmacies_req ON request_pharmacies(request_id);
CREATE INDEX idx_request_pharmacies_sta ON request_pharmacies(response_status);
CREATE INDEX idx_pharmacies_active      ON pharmacies(is_active) WHERE is_active = true;
CREATE INDEX idx_wa_messages_request    ON whatsapp_messages(request_id);
CREATE INDEX idx_wa_messages_wa_id      ON whatsapp_messages(wa_message_id);
CREATE INDEX idx_audit_entity           ON audit_logs(entity_type, entity_id);

-- ─────────────────────────────────────────
-- FUNCTION: update updated_at
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pharmacies_updated_at
  BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- FUNCTION: recalculate pharmacy scores
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION recalculate_pharmacy_scores(p_pharmacy_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE pharmacies p
  SET
    avg_response_time = (
      SELECT AVG(rph.response_time_sec)::INTEGER
      FROM request_pharmacies rph
      WHERE rph.pharmacy_id = p.id
        AND rph.response_time_sec IS NOT NULL
    ),
    response_rate = (
      SELECT
        CASE WHEN COUNT(*) = 0 THEN NULL
        ELSE ROUND(
          COUNT(*) FILTER (WHERE rph.response_status IN ('available','unavailable')) * 100.0 / COUNT(*),
          2
        )
        END
      FROM request_pharmacies rph
      WHERE rph.pharmacy_id = p.id
        AND rph.sent_at IS NOT NULL
    ),
    availability_rate = (
      SELECT
        CASE WHEN COUNT(*) FILTER (WHERE rph.response_status IN ('available','unavailable')) = 0 THEN NULL
        ELSE ROUND(
          COUNT(*) FILTER (WHERE rph.response_status = 'available') * 100.0
          / COUNT(*) FILTER (WHERE rph.response_status IN ('available','unavailable')),
          2
        )
        END
      FROM request_pharmacies rph
      WHERE rph.pharmacy_id = p.id
    ),
    global_score = (
      SELECT ROUND(
        COALESCE(
          (
            0.5 * COALESCE(
              COUNT(*) FILTER (WHERE rph.response_status = 'available') * 100.0
              / NULLIF(COUNT(*) FILTER (WHERE rph.response_status IN ('available','unavailable')), 0),
              50
            ) / 100
            +
            0.3 * GREATEST(0, 1 - COALESCE(AVG(rph.response_time_sec), 450) / 900.0)
            +
            0.2 * COALESCE(
              COUNT(*) FILTER (WHERE rph.response_status IN ('available','unavailable')) * 1.0
              / NULLIF(COUNT(*), 0),
              0.5
            )
          ),
          0
        ) * 100,
        2
      )
      FROM request_pharmacies rph
      WHERE rph.pharmacy_id = p.id
        AND rph.sent_at IS NOT NULL
    ),
    updated_at = now()
  WHERE (p_pharmacy_id IS NULL OR p.id = p_pharmacy_id);
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────
-- FUNCTION: nearby pharmacies
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_nearby_pharmacies(
  p_lat         DOUBLE PRECISION,
  p_lng         DOUBLE PRECISION,
  p_limit       INTEGER DEFAULT 10,
  p_max_meters  INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id                UUID,
  name              TEXT,
  whatsapp_phone    TEXT,
  neighborhood_id   UUID,
  address           TEXT,
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  is_active         BOOLEAN,
  avg_response_time INTEGER,
  response_rate     NUMERIC,
  availability_rate NUMERIC,
  global_score      NUMERIC,
  distance_meters   INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ph.id,
    ph.name,
    ph.whatsapp_phone,
    ph.neighborhood_id,
    ph.address,
    ph.lat,
    ph.lng,
    ph.is_active,
    ph.avg_response_time,
    ph.response_rate,
    ph.availability_rate,
    ph.global_score,
    earth_distance(
      ll_to_earth(p_lat, p_lng),
      ll_to_earth(ph.lat, ph.lng)
    )::INTEGER AS distance_meters
  FROM pharmacies ph
  WHERE
    ph.is_active = true
    AND (
      p_max_meters IS NULL
      OR earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(ph.lat, ph.lng)) <= p_max_meters
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_medicines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_pharmacies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods         ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines             ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- user_profiles
CREATE POLICY "users can read own profile"
  ON user_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "admins can manage all profiles"
  ON user_profiles FOR ALL USING (current_user_role() = 'admin');

-- neighborhoods & medicines: readable by all authenticated users
CREATE POLICY "authenticated read neighborhoods"
  ON neighborhoods FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage neighborhoods"
  ON neighborhoods FOR ALL USING (current_user_role() = 'admin');

CREATE POLICY "authenticated read medicines"
  ON medicines FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage medicines"
  ON medicines FOR ALL USING (current_user_role() = 'admin');

-- pharmacies
CREATE POLICY "authenticated read pharmacies"
  ON pharmacies FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage pharmacies"
  ON pharmacies FOR ALL USING (current_user_role() = 'admin');

-- requests: operators see own, admins see all
CREATE POLICY "operators read own requests"
  ON requests FOR SELECT USING (
    operator_id = auth.uid() OR current_user_role() = 'admin'
  );
CREATE POLICY "operators create requests"
  ON requests FOR INSERT WITH CHECK (
    operator_id = auth.uid() OR current_user_role() = 'admin'
  );
CREATE POLICY "operators update own requests"
  ON requests FOR UPDATE USING (
    operator_id = auth.uid() OR current_user_role() = 'admin'
  );

-- request_medicines / request_pharmacies: join via request access
CREATE POLICY "read request medicines"
  ON request_medicines FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_id
        AND (r.operator_id = auth.uid() OR current_user_role() = 'admin')
    )
  );

CREATE POLICY "read request pharmacies"
  ON request_pharmacies FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_id
        AND (r.operator_id = auth.uid() OR current_user_role() = 'admin')
    )
  );

-- whatsapp_messages & audit_logs: admins only
CREATE POLICY "admins read wa messages"
  ON whatsapp_messages FOR SELECT USING (current_user_role() = 'admin');
CREATE POLICY "admins read audit logs"
  ON audit_logs FOR SELECT USING (current_user_role() = 'admin');
