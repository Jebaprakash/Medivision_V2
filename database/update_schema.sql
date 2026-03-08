-- ============================================================
-- MediVision AI — Schema Update (V2)
-- Adding Progress Tracking and Medicine Reminders
-- ============================================================

-- Progress Tracking Table
CREATE TABLE IF NOT EXISTS progress_tracking (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url   TEXT NOT NULL,
    severity    severity_level NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress_tracking (user_id);
CREATE INDEX IF NOT EXISTS idx_progress_created ON progress_tracking (created_at DESC);

-- Medicine Reminders Table
CREATE TABLE IF NOT EXISTS medicine_reminders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medicine_name   VARCHAR(255) NOT NULL,
    dosage          VARCHAR(100),
    schedule_time   TIME NOT NULL, -- e.g. '09:00:00'
    is_active       BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user ON medicine_reminders (user_id);

-- User Push Subscriptions (for notifications)
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_subscription JSONB;
