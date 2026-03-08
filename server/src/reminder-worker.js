const cron = require('node-cron');
const webpush = require('web-push');
const pool = require('./db');

/**
 * Background worker to check and send medicine reminders.
 * Runs every minute to see if any reminder is due.
 */
function initReminderCron() {
    console.log('⏰ Initializing Medicine Reminder Cron Job...');

    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

            // Join reminders with user subscription
            const result = await pool.query(`
                SELECT r.*, u.push_subscription 
                FROM medicine_reminders r
                JOIN users u ON r.user_id = u.id
                WHERE r.is_active = TRUE 
                AND r.schedule_time::text LIKE $1 || '%'
            `, [currentTime]);

            if (result.rows.length === 0) return;

            console.log(`[Cron] Found ${result.rows.length} reminders due for ${currentTime}`);

            for (const row of result.rows) {
                if (row.push_subscription) {
                    const payload = JSON.stringify({
                        title: 'Medicine Reminder',
                        body: `Time to take your ${row.medicine_name} (${row.dosage || 'Standard dose'})`,
                        icon: '/logo192.png'
                    });

                    try {
                        await webpush.sendNotification(JSON.parse(row.push_subscription), payload);

                        // Update last notified
                        await pool.query(
                            'UPDATE medicine_reminders SET last_notified_at = NOW() WHERE id = $1',
                            [row.id]
                        );
                    } catch (err) {
                        if (err.statusCode === 410) {
                            console.log(`Subscription expired for user ${row.user_id}`);
                            await pool.query('UPDATE users SET push_subscription = NULL WHERE id = $1', [row.user_id]);
                        } else {
                            console.error('Push notification error:', err);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Reminder cron error:', error);
        }
    });
}

module.exports = { initReminderCron };
