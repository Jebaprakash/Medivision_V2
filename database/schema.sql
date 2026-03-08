-- ============================================================
-- MediVision AI — PostgreSQL Database Schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- ENUM TYPES
-- --------------------------------------------------------
CREATE TYPE severity_level AS ENUM ('mild', 'moderate', 'severe');

-- --------------------------------------------------------
-- USERS TABLE
-- --------------------------------------------------------
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(120)  NOT NULL,
    email       VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- --------------------------------------------------------
-- DISEASES TABLE
-- --------------------------------------------------------
CREATE TABLE diseases (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200)  NOT NULL UNIQUE,
    description TEXT,
    severity    severity_level NOT NULL DEFAULT 'mild',
    precautions TEXT[]        -- stored as a PostgreSQL array
);

CREATE INDEX idx_diseases_name ON diseases (name);

-- --------------------------------------------------------
-- MEDICINES TABLE
-- --------------------------------------------------------
CREATE TABLE medicines (
    id         SERIAL PRIMARY KEY,
    disease_id INTEGER       NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    name       VARCHAR(200)  NOT NULL,
    dosage     VARCHAR(200),
    notes      TEXT
);

CREATE INDEX idx_medicines_disease ON medicines (disease_id);

-- --------------------------------------------------------
-- HOSPITALS TABLE
-- --------------------------------------------------------
CREATE TABLE hospitals (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(300)  NOT NULL,
    phone     VARCHAR(30),
    latitude  DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address   TEXT
);

-- Spatial-like index for bounding-box queries (pure SQL approach)
CREATE INDEX idx_hospitals_lat  ON hospitals (latitude);
CREATE INDEX idx_hospitals_lng  ON hospitals (longitude);

-- --------------------------------------------------------
-- DIAGNOSIS HISTORY TABLE
-- --------------------------------------------------------
CREATE TABLE diagnosis_history (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    disease_id       INTEGER       REFERENCES diseases(id) ON DELETE SET NULL,
    confidence_score DOUBLE PRECISION NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    image_url        TEXT,
    symptoms         TEXT[],       -- stored as a PostgreSQL array
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_user       ON diagnosis_history (user_id);
CREATE INDEX idx_history_created    ON diagnosis_history (created_at DESC);

-- --------------------------------------------------------
-- SEED DATA — Sample hospitals (for demo / development)
-- --------------------------------------------------------
INSERT INTO hospitals (name, phone, latitude, longitude, address) VALUES
('Apollo Hospitals',           '+91-44-28290200', 13.0604, 80.2496, 'Greams Road, Chennai, Tamil Nadu'),
('Fortis Malar Hospital',     '+91-44-42891000', 13.0359, 80.2568, 'Adyar, Chennai, Tamil Nadu'),
('AIIMS Delhi',               '+91-11-26588500', 28.5672, 77.2100, 'Ansari Nagar, New Delhi'),
('Manipal Hospital',          '+91-80-25024444', 12.9585, 77.6484, 'HAL Airport Road, Bangalore'),
('Medanta — The Medicity',    '+91-124-4141414', 28.4395, 77.0421, 'Sector 38, Gurugram, Haryana'),
('Narayana Health',           '+91-80-71222222', 12.8992, 77.5981, 'Bommasandra, Bangalore'),
('Max Super Speciality',      '+91-11-26515050', 28.5689, 77.2065, 'Saket, New Delhi'),
('Kokilaben Dhirubhai Ambani','+91-22-30999999', 19.1310, 72.8275, 'Andheri West, Mumbai'),
('CMC Vellore',               '+91-416-2281000', 12.9249, 79.1325, 'Vellore, Tamil Nadu'),
('Ruby Hall Clinic',          '+91-20-26163391', 18.5326, 73.8800, 'Pune, Maharashtra');

-- --------------------------------------------------------
-- SEED DATA — Sample diseases & medicines (for demo)
-- --------------------------------------------------------
INSERT INTO diseases (name, description, severity, precautions) VALUES
('Eczema',     'Chronic inflammatory skin condition causing itchy, red patches.', 'moderate',
 ARRAY['Moisturize regularly', 'Avoid harsh soaps', 'Wear soft fabrics', 'Keep nails short']),
('Psoriasis',  'Autoimmune condition causing rapid skin cell build-up forming scales.', 'moderate',
 ARRAY['Use prescribed topicals', 'Avoid skin injuries', 'Manage stress', 'Limit alcohol']),
('Melanoma',   'Serious form of skin cancer arising from pigment-producing cells.', 'severe',
 ARRAY['Seek immediate oncology consultation', 'Avoid sun exposure', 'Monitor mole changes', 'SPF 50+ sunscreen']),
('Acne',       'Common skin condition with pimples, usually on the face.', 'mild',
 ARRAY['Cleanse gently', 'Avoid touching face', 'Use non-comedogenic products', 'Stay hydrated']),
('Ringworm',   'Fungal infection causing circular, red, itchy patches on the skin.', 'mild',
 ARRAY['Keep area dry', 'Avoid sharing towels', 'Wash clothes in hot water', 'Complete full antifungal course']);

INSERT INTO medicines (disease_id, name, dosage, notes) VALUES
(1, 'Hydrocortisone Cream 1%',   'Apply thin layer twice daily', 'Short-term use only — max 2 weeks'),
(1, 'Cetirizine 10mg',           '1 tablet daily',              'For itch relief'),
(2, 'Methotrexate 7.5mg',        'Once weekly as prescribed',   'Requires regular blood tests'),
(2, 'Calcipotriol Ointment',     'Apply twice daily',           'Vitamin D analogue'),
(3, 'Pembrolizumab (Keytruda)',   'Per oncologist schedule',     'Immunotherapy — specialist only'),
(4, 'Benzoyl Peroxide 5% Gel',   'Apply once at night',         'May cause dryness'),
(4, 'Adapalene 0.1% Gel',        'Apply once at night',         'Retinoid — avoid sun exposure'),
(5, 'Clotrimazole Cream 1%',     'Apply twice daily for 4 weeks','Antifungal'),
(5, 'Terbinafine 250mg',         '1 tablet daily for 2 weeks',  'Oral antifungal for severe cases');
