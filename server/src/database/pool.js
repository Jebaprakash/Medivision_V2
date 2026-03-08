/**
 * PostgreSQL connection pool — single source of truth.
 * Re-exports the existing pool to maintain compatibility
 * while following the new folder structure.
 */
const pool = require('../db');
module.exports = pool;
