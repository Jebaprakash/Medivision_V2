const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runSchema() {
    try {
        const schemaPath = path.join(__dirname, '..', 'database', 'update_schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error('Update schema file not found at: ' + schemaPath);
        }
        const schema = fs.readFileSync(schemaPath, 'utf8');
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
