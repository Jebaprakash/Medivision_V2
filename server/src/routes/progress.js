const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/auth');

// Get tracking history for user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const result = await pool.query(
            'SELECT * FROM progress_tracking WHERE user_id = $1 ORDER BY created_at ASC',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Progress fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch progress tracking' });
    }
});

// Add new tracking log
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { severity, notes } = req.body;
        
        let imageUrl = null;
        if (req.file) {
            imageUrl = req.file.path.startsWith('http') 
                ? req.file.path 
                : `/uploads/${req.file.filename}`;
        }

        if (!userId || !severity) {
            return res.status(400).json({ error: 'User ID and severity are required' });
        }

        const result = await pool.query(
            'INSERT INTO progress_tracking (user_id, image_url, severity, notes) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, imageUrl, severity, notes]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Progress log error:', error);
        res.status(500).json({ error: 'Failed to save progress log' });
    }
});

module.exports = router;
