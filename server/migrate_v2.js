/**
 * Run database V2 migration using Node.js (bypasses ownership issues).
 * Connects to PostgreSQL as the jeba user and applies schema changes.
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://jeba:medivision123@localhost:5432/medivision'
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Running V2 database migration...\n');

        // 1. Create chatbot_messages (if not exists — already done by SQL migration)
        await client.query(`
            CREATE TABLE IF NOT EXISTS chatbot_messages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                session_id UUID NOT NULL,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                disease_context VARCHAR(200),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        console.log('✅ chatbot_messages table ready');

        // 2. Create doctors table
        await client.query(`
            CREATE TABLE IF NOT EXISTS doctors (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(200) NOT NULL,
                specialization VARCHAR(150) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(30),
                hospital VARCHAR(300),
                experience_years INTEGER DEFAULT 0,
                rating DOUBLE PRECISION DEFAULT 4.0,
                is_available BOOLEAN DEFAULT TRUE,
                avatar_url TEXT,
                consultation_fee DECIMAL(10,2) DEFAULT 500.00,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        console.log('✅ doctors table ready');

        // 3. Create doctor_consultations table
        await client.query(`
            CREATE TABLE IF NOT EXISTS doctor_consultations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
                scheduled_at TIMESTAMPTZ NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
                recording_url TEXT,
                notes TEXT,
                diagnosis_id UUID,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        console.log('✅ doctor_consultations table ready');

        // 4. Create audit_log table
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id BIGSERIAL PRIMARY KEY,
                event_type VARCHAR(80) NOT NULL,
                user_id UUID,
                details JSONB,
                ip_address VARCHAR(45),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        console.log('✅ audit_log table ready');

        // 5. Add columns to medicine_reminders if missing
        const mrCols = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='medicine_reminders'
        `);
        const mrColNames = mrCols.rows.map(r => r.column_name);
        
        if (!mrColNames.includes('frequency')) {
            await client.query(`ALTER TABLE medicine_reminders ADD COLUMN frequency VARCHAR(50) DEFAULT 'daily'`);
            console.log('✅ Added frequency column to medicine_reminders');
        }
        if (!mrColNames.includes('reminder_times')) {
            await client.query(`ALTER TABLE medicine_reminders ADD COLUMN reminder_times TEXT[] DEFAULT '{}'`);
            console.log('✅ Added reminder_times column to medicine_reminders');
        }

        // 6. Add push_subscription to users if missing
        const userCols = await client.query(`
            SELECT column_name FROM information_schema.columns WHERE table_name='users'
        `);
        if (!userCols.rows.map(r => r.column_name).includes('push_subscription')) {
            await client.query(`ALTER TABLE users ADD COLUMN push_subscription TEXT`);
            console.log('✅ Added push_subscription column to users');
        }

        // 7. Create indexes (IF NOT EXISTS not supported for indexes in older PG, use try/catch)
        const indexes = [
            `CREATE INDEX IF NOT EXISTS idx_chatbot_session ON chatbot_messages (session_id)`,
            `CREATE INDEX IF NOT EXISTS idx_chatbot_user ON chatbot_messages (user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_doctors_spec ON doctors (specialization)`,
            `CREATE INDEX IF NOT EXISTS idx_doctors_avail ON doctors (is_available)`,
            `CREATE INDEX IF NOT EXISTS idx_consult_user ON doctor_consultations (user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_consult_doctor ON doctor_consultations (doctor_id)`,
            `CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_log (event_type)`,
            `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_id)`,
        ];
        for (const idx of indexes) {
            try { await client.query(idx); } catch (e) { /* ignore if exists */ }
        }
        console.log('✅ Indexes created');

        // 8. Seed doctors data
        const doctorCount = await client.query('SELECT COUNT(*) FROM doctors');
        if (parseInt(doctorCount.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO doctors (name, specialization, email, phone, hospital, experience_years, rating, consultation_fee) VALUES
                ('Dr. Priya Sharma', 'Dermatology', 'priya.sharma@medivision.ai', '+91-98765-43210', 'Apollo Hospitals, Chennai', 12, 4.8, 800.00),
                ('Dr. Rajesh Kumar', 'Dermatology', 'rajesh.kumar@medivision.ai', '+91-98765-43211', 'Fortis Malar Hospital, Chennai', 8, 4.5, 600.00),
                ('Dr. Ananya Reddy', 'Oncology', 'ananya.reddy@medivision.ai', '+91-98765-43212', 'CMC Vellore', 15, 4.9, 1200.00),
                ('Dr. Vikram Patel', 'General Medicine', 'vikram.patel@medivision.ai', '+91-98765-43213', 'AIIMS Delhi', 20, 4.7, 500.00),
                ('Dr. Meera Nair', 'Dermatology', 'meera.nair@medivision.ai', '+91-98765-43214', 'Manipal Hospital, Bangalore', 10, 4.6, 700.00),
                ('Dr. Suresh Iyer', 'Plastic Surgery', 'suresh.iyer@medivision.ai', '+91-98765-43215', 'Kokilaben Hospital, Mumbai', 18, 4.4, 1500.00)
            `);
            console.log('✅ Seeded 6 sample doctors');
        }

        console.log('\n🎉 V2 migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
