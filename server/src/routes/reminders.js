/**
 * Medicine Reminder Routes — CRUD with frequency and multiple reminder times.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const webpush = require('web-push');

// Set VAPID keys (should be in .env)
const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(
        'mailto:support@medivision.ai',
        publicVapidKey,
        privateVapidKey
    );
}

// ----------------------------------------------------------------
// GET /api/reminders — get all reminders for the authenticated user
// ----------------------------------------------------------------
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT id, medicine_name, dosage, schedule_time, frequency, reminder_times, is_active, created_at
             FROM medicine_reminders WHERE user_id = $1 ORDER BY schedule_time ASC`,
            [userId]
        );
        res.json({ reminders: result.rows });
    } catch (error) {
        console.error('Fetch reminders error:', error);
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
});

// ----------------------------------------------------------------
// POST /api/reminders — add a new reminder
// ----------------------------------------------------------------
router.post('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { medicineName, dosage, scheduleTime, frequency, reminderTimes } = req.body;

        if (!medicineName || !scheduleTime) {
            return res.status(400).json({ error: 'Medicine name and schedule time are required' });
        }

        const result = await pool.query(
            `INSERT INTO medicine_reminders (user_id, medicine_name, dosage, schedule_time, frequency, reminder_times)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [userId, medicineName, dosage || null, scheduleTime, frequency || 'daily', reminderTimes || []]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add reminder error:', error);
        res.status(500).json({ error: 'Failed to add reminder' });
    }
});

// ----------------------------------------------------------------
// PATCH /api/reminders/:id — toggle active status
// ----------------------------------------------------------------
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const result = await pool.query(
            'UPDATE medicine_reminders SET is_active = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [isActive, id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reminder not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update reminder error:', error);
        res.status(500).json({ error: 'Failed to update reminder' });
    }
});

// ----------------------------------------------------------------
// DELETE /api/reminders/:id — delete a reminder
// ----------------------------------------------------------------
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM medicine_reminders WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reminder not found' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Delete reminder error:', error);
        res.status(500).json({ error: 'Failed to delete reminder' });
    }
});

// ----------------------------------------------------------------
// POST /api/reminders/subscribe — subscribe to push notifications
// ----------------------------------------------------------------
router.post('/subscribe', authMiddleware, async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.id;

        if (!subscription) return res.status(400).json({ error: 'Invalid subscription payload' });

        await pool.query(
            'UPDATE users SET push_subscription = $1 WHERE id = $2',
            [JSON.stringify(subscription), userId]
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

module.exports = router;
