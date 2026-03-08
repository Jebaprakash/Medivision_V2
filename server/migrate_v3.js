/**
 * V3 Migration — Add city column to doctors + seed 15 realistic doctors.
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://jeba:medivision123@localhost:5432/medivision'
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Running V3 database migration...\n');

        // 1. Add city column to doctors if missing
        const cols = await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name='doctors'"
        );
        const colNames = cols.rows.map(r => r.column_name);

        if (!colNames.includes('city')) {
            await client.query("ALTER TABLE doctors ADD COLUMN city VARCHAR(150)");
            console.log('✅ Added city column to doctors');
        }

        // 2. Clear old seed data and insert comprehensive doctors
        await client.query('DELETE FROM doctor_consultations');
        await client.query('DELETE FROM doctors');
        console.log('✅ Cleared old doctor data');

        await client.query(`
            INSERT INTO doctors (name, specialization, experience_years, hospital, city, consultation_fee, rating, is_available, email, phone)
            VALUES
            -- Dermatology (primary specialization for skin disease app)
            ('Dr. Priya Sharma',      'Dermatology',     12, 'Apollo Hospitals',              'Chennai',    800,  4.8, TRUE,  'priya.sharma@apollo.com',     '+91-98765-10001'),
            ('Dr. Rajesh Kumar',      'Dermatology',      8, 'Fortis Malar Hospital',         'Chennai',    600,  4.5, TRUE,  'rajesh.kumar@fortis.com',     '+91-98765-10002'),
            ('Dr. Meera Nair',        'Dermatology',     10, 'Manipal Hospital',              'Bangalore',  700,  4.6, TRUE,  'meera.nair@manipal.com',      '+91-98765-10003'),
            ('Dr. Sanjay Mehta',      'Dermatology',     15, 'Lilavati Hospital',             'Mumbai',     900,  4.9, TRUE,  'sanjay.mehta@lilavati.com',   '+91-98765-10004'),
            ('Dr. Kavitha Rao',       'Dermatology',      6, 'KIMS Hospital',                 'Hyderabad',  500,  4.3, TRUE,  'kavitha.rao@kims.com',        '+91-98765-10005'),
            ('Dr. Arjun Pillai',      'Dermatology',     20, 'Amrita Hospital',               'Kochi',     1000,  4.7, TRUE,  'arjun.pillai@amrita.com',     '+91-98765-10006'),

            -- Oncology
            ('Dr. Ananya Reddy',      'Oncology',        15, 'CMC Vellore',                   'Vellore',   1200,  4.9, TRUE,  'ananya.reddy@cmc.com',        '+91-98765-10007'),
            ('Dr. Rohit Gupta',       'Oncology',        12, 'Tata Memorial Hospital',        'Mumbai',    1500,  4.8, TRUE,  'rohit.gupta@tata.com',        '+91-98765-10008'),

            -- General Medicine
            ('Dr. Vikram Patel',      'General Medicine', 20, 'AIIMS Delhi',                   'Delhi',      500,  4.7, TRUE,  'vikram.patel@aiims.com',      '+91-98765-10009'),
            ('Dr. Sneha Iyer',        'General Medicine', 10, 'Kauvery Hospital',              'Chennai',    400,  4.4, TRUE,  'sneha.iyer@kauvery.com',      '+91-98765-10010'),

            -- Plastic Surgery
            ('Dr. Suresh Iyer',       'Plastic Surgery',  18, 'Kokilaben Hospital',            'Mumbai',    1500,  4.4, TRUE,  'suresh.iyer@kokilaben.com',   '+91-98765-10011'),

            -- Allergy & Immunology
            ('Dr. Divya Krishnan',    'Allergy & Immunology', 8, 'Aster Medcity',             'Kochi',      650,  4.5, TRUE,  'divya.k@aster.com',           '+91-98765-10012'),

            -- Pediatric Dermatology
            ('Dr. Nandini Das',       'Pediatric Dermatology', 11, 'Rainbow Hospitals',        'Hyderabad',  750,  4.6, TRUE,  'nandini.das@rainbow.com',     '+91-98765-10013'),

            -- Cosmetic Dermatology
            ('Dr. Aakash Singh',      'Cosmetic Dermatology', 9, 'Max Super Specialty',       'Delhi',     1100,  4.3, TRUE,  'aakash.singh@max.com',        '+91-98765-10014'),
            ('Dr. Ritu Verma',        'Cosmetic Dermatology', 14, 'Nanavati Hospital',        'Mumbai',    1300,  4.7, FALSE, 'ritu.verma@nanavati.com',     '+91-98765-10015')
        `);
        console.log('✅ Seeded 15 doctors across 7 specializations');

        console.log('\n🎉 V3 migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
