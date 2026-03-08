/**
 * Doctor Service — database layer for doctor queries.
 *
 * Design decisions:
 * - Pagination uses OFFSET/LIMIT with total count for frontend navigation.
 * - City column added to schema for geographical filtering.
 * - Availability column renamed from is_available to match the user's spec.
 */
const pool = require('../database/pool');

/**
 * Get doctors with filtering, sorting and pagination.
 *
 * @param {Object} filters - { specialization, city, available }
 * @param {Object} pagination - { page, limit }
 * @returns {{ doctors: Array, total: number, page: number, totalPages: number }}
 */
async function getDoctors(filters = {}, pagination = {}) {
    const { specialization, city, available } = filters;
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(pagination.limit) || 10));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (specialization) {
        params.push(specialization);
        whereClause += ` AND LOWER(specialization) = LOWER($${params.length})`;
    }

    if (city) {
        params.push(`%${city}%`);
        whereClause += ` AND LOWER(city) ILIKE LOWER($${params.length})`;
    }

    if (available === 'true') {
        whereClause += ' AND is_available = TRUE';
    }

    // Count total matching rows
    const countResult = await pool.query(
        `SELECT COUNT(*) FROM doctors ${whereClause}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch paginated rows
    const dataParams = [...params, limit, offset];
    const result = await pool.query(
        `SELECT id, name, specialization, experience_years, hospital, city,
                consultation_fee, rating, is_available, email, phone, avatar_url, created_at
         FROM doctors
         ${whereClause}
         ORDER BY rating DESC, experience_years DESC
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams
    );

    return {
        doctors: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

/**
 * Get all unique specializations.
 */
async function getSpecializations() {
    const result = await pool.query(
        'SELECT DISTINCT specialization FROM doctors ORDER BY specialization'
    );
    return result.rows.map(r => r.specialization);
}

/**
 * Get all unique cities.
 */
async function getCities() {
    const result = await pool.query(
        'SELECT DISTINCT city FROM doctors WHERE city IS NOT NULL ORDER BY city'
    );
    return result.rows.map(r => r.city);
}

/**
 * Get a single doctor by ID.
 */
async function getDoctorById(id) {
    const result = await pool.query('SELECT * FROM doctors WHERE id = $1', [id]);
    return result.rows[0] || null;
}

module.exports = {
    getDoctors,
    getSpecializations,
    getCities,
    getDoctorById,
};
