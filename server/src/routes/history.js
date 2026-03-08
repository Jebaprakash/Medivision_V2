/**
 * Diagnosis history routes — paginated history for a user.
 */
const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/history/:userId?page=1&limit=10
 *
 * Returns paginated diagnosis history for the given user.
 * Joins with diseases table to include disease name and severity.
 */
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        // Security: users can only view their own history
        if (req.user.id !== userId) {
            return res.status(403).json({ error: true, message: 'Access denied.' });
        }

        // Total count for pagination metadata
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM diagnosis_history WHERE user_id = $1',
            [userId]
        );
        const totalItems = parseInt(countResult.rows[0].count);

        // Fetch paginated records
        const result = await pool.query(
            `SELECT dh.id, dh.confidence_score, dh.image_url, dh.symptoms, dh.created_at,
              d.name AS disease_name, d.severity, d.precautions
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
        console.error('History route error:', err);
        res.status(500).json({ error: true, message: 'Failed to fetch diagnosis history.' });
    }
});

module.exports = router;
