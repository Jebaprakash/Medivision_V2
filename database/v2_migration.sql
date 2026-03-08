-- ============================================================
-- MediVision AI V2 — Database Migration
-- Run: psql -h localhost -U jeba -d medivision -f database/v2_migration.sql
-- ============================================================

-- Enable UUID generation (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- CHATBOT MESSAGES TABLE — conversation history per session
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS chatbot_messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID          NOT NULL,
    user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20)   NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content     TEXT          NOT NULL,
    disease_context VARCHAR(200), -- disease name injected as context
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_session ON chatbot_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_user    ON chatbot_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_created ON chatbot_messages (created_at DESC);

-- --------------------------------------------------------
-- DOCTORS TABLE — doctor directory
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    specialization  VARCHAR(150) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(30),
    hospital        VARCHAR(300),
    experience_years INTEGER DEFAULT 0,
    rating          DOUBLE PRECISION DEFAULT 4.0 CHECK (rating >= 0 AND rating <= 5),
    is_available    BOOLEAN DEFAULT TRUE,
    avatar_url      TEXT,
    consultation_fee DECIMAL(10,2) DEFAULT 500.00,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_spec ON doctors (specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_avail ON doctors (is_available);

-- --------------------------------------------------------
-- DOCTOR CONSULTATIONS TABLE — booking records
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctor_consultations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id       UUID          NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    scheduled_at    TIMESTAMPTZ   NOT NULL,
    status          VARCHAR(30)   NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    recording_url   TEXT,
    notes           TEXT,
    diagnosis_id    UUID          REFERENCES diagnosis_history(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consult_user   ON doctor_consultations (user_id);
CREATE INDEX IF NOT EXISTS idx_consult_doctor ON doctor_consultations (doctor_id);
CREATE INDEX IF NOT EXISTS idx_consult_status ON doctor_consultations (status);

-- --------------------------------------------------------
-- AUDIT LOG TABLE — system event logging
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    event_type  VARCHAR(80)  NOT NULL,
    user_id     UUID,
    details     JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_type    ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);

-- --------------------------------------------------------
-- ALTER diagnosis_history — add status for progress tracking
-- --------------------------------------------------------
DO $$
BEGIN
    -- Add prediction column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='diagnosis_history' AND column_name='prediction') THEN
        ALTER TABLE diagnosis_history ADD COLUMN prediction VARCHAR(200);
    END IF;

    -- Add status column if missing (Improving / Same / Worsening)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='diagnosis_history' AND column_name='status') THEN
        ALTER TABLE diagnosis_history ADD COLUMN status VARCHAR(30) DEFAULT 'initial';
    END IF;

    -- Add severity text column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='diagnosis_history' AND column_name='severity_text') THEN
        ALTER TABLE diagnosis_history ADD COLUMN severity_text VARCHAR(20);
    END IF;
END $$;

-- --------------------------------------------------------
-- ALTER medicine_reminders — add frequency and reminder_times
-- --------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='medicine_reminders' AND column_name='frequency') THEN
        ALTER TABLE medicine_reminders ADD COLUMN frequency VARCHAR(50) DEFAULT 'daily';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='medicine_reminders' AND column_name='reminder_times') THEN
        ALTER TABLE medicine_reminders ADD COLUMN reminder_times TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- --------------------------------------------------------
-- ALTER users — add push_subscription if not exists
-- --------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='push_subscription') THEN
        ALTER TABLE users ADD COLUMN push_subscription TEXT;
    END IF;
END $$;

-- --------------------------------------------------------
-- SEED DATA — Sample doctors for demo
-- --------------------------------------------------------
INSERT INTO doctors (name, specialization, email, phone, hospital, experience_years, rating, consultation_fee) VALUES
('Dr. Priya Sharma',     'Dermatology',    'priya.sharma@medivision.ai', '+91-98765-43210', 'Apollo Hospitals, Chennai',        12, 4.8, 800.00),
('Dr. Rajesh Kumar',     'Dermatology',    'rajesh.kumar@medivision.ai', '+91-98765-43211', 'Fortis Malar Hospital, Chennai',   8,  4.5, 600.00),
('Dr. Ananya Reddy',     'Oncology',       'ananya.reddy@medivision.ai', '+91-98765-43212', 'CMC Vellore',                      15, 4.9, 1200.00),
('Dr. Vikram Patel',     'General Medicine','vikram.patel@medivision.ai', '+91-98765-43213', 'AIIMS Delhi',                      20, 4.7, 500.00),
('Dr. Meera Nair',       'Dermatology',    'meera.nair@medivision.ai',   '+91-98765-43214', 'Manipal Hospital, Bangalore',      10, 4.6, 700.00),
('Dr. Suresh Iyer',      'Plastic Surgery','suresh.iyer@medivision.ai',  '+91-98765-43215', 'Kokilaben Hospital, Mumbai',       18, 4.4, 1500.00)
ON CONFLICT DO NOTHING;
