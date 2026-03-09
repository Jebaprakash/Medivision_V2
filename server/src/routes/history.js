/**
 * Diagnosis history routes — paginated diagnosis history with severity trends.
 * Used by both HistoryPage and ProgressPage (trend chart).
 */
const express = require('express');
const pool    = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/history — get the authenticated user's diagnosis history
 * Query params: page, limit
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM diagnosis_history WHERE user_id = $1',
            [userId]
        );
        const totalItems = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT
                dh.id,
                dh.confidence_score,
                dh.image_url,
                dh.symptoms,
                dh.created_at,
                d.name      AS disease_name,
                d.severity,
                d.precautions,
                d.description
             FROM diagnosis_history dh
             LEFT JOIN diseases d ON d.id = dh.disease_id
             WHERE dh.user_id = $1
             ORDER BY dh.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        res.json({
            history: result.rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
            },
        });
    } catch (err) {
        console.error('[History] Error:', err);
        res.status(500).json({ error: true, message: 'Failed to fetch diagnosis history.' });
    }
});

/**
 * GET /api/history/:userId — legacy route (backward compat)
 * Delegates to same logic but restricts to owner
 */
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.user.id !== userId) {
            return res.status(403).json({ error: true, message: 'Access denied.' });
        }

        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM diagnosis_history WHERE user_id = $1', [userId]
        );
        const totalItems = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT
                dh.id,
                dh.confidence_score,
                dh.image_url,
                dh.symptoms,
                dh.created_at,
                d.name      AS disease_name,
                d.severity,
                d.precautions,
                d.description
             FROM diagnosis_history dh
             LEFT JOIN diseases d ON d.id = dh.disease_id
             WHERE dh.user_id = $1
             ORDER BY dh.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        res.json({
            history: result.rows,
            pagination: {
                page, limit, totalItems,
                totalPages: Math.ceil(totalItems / limit),
            },
        });
    } catch (err) {
        console.error('[History] Error:', err);
        res.status(500).json({ error: true, message: 'Failed to fetch diagnosis history.' });
    }
});

/**
 * GET /api/history/trends — get severity trend summary for the current user
 * Used by ProgressPage chart
 */
router.get('/trends', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT
                dh.id,
                dh.created_at,
                dh.confidence_score,
                dh.image_url,
                d.name     AS disease_name,
                d.severity
             FROM diagnosis_history dh
             LEFT JOIN diseases d ON d.id = dh.disease_id
             WHERE dh.user_id = $1
             ORDER BY dh.created_at ASC
             LIMIT 30`,
            [userId]
        );

        const rows = result.rows;

        // Compute trend label
        let trend = 'Same';
        if (rows.length >= 2) {
            const first = rows[0].severity;
            const last  = rows[rows.length - 1].severity;
            const order = { mild: 1, moderate: 2, severe: 3 };
            const a = order[first] || 1;
            const b = order[last]  || 1;
            if (b < a) trend = 'Improving';
            else if (b > a) trend = 'Worsening';
        }

        res.json({ records: rows, trend, count: rows.length });
    } catch (err) {
        console.error('[History Trends] Error:', err);
        res.status(500).json({ error: true, message: 'Failed to fetch trends.' });
    }
});

module.exports = router;
