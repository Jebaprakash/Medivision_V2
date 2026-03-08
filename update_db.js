const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: '../server/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runSchema() {
    try {
        const schema = fs.readFileSync('database/update_schema.sql', 'utf8');
        console.log('Running update_schema.sql...');
        await pool.query(schema);
        console.log('✅ Schema updated successfully!');
    } catch (err) {
        console.error('❌ Failed to update schema:', err.message);
    } finally {
        await pool.end();
    }
}

runSchema();
