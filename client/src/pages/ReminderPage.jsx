/**
 * ReminderPage — Medicine reminder dashboard with frequency and daily schedule.
 * Uses light theme consistent with the app's CSS variables.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchReminders, addReminder, deleteReminder, toggleReminder } from '../services/api';

export default function ReminderPage() {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        medicineName: '', dosage: '', scheduleTime: '',
        frequency: 'daily', reminderTimes: []
    });

    useEffect(() => { loadReminders(); }, []);

    const loadReminders = async () => {
        try {
            const res = await fetchReminders();
            setReminders(res.data.reminders || []);
        } catch (err) { console.error('Load reminders error:', err); }
        finally { setLoading(false); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.medicineName || !form.scheduleTime) return;
        try {
            await addReminder(form);
            setForm({ medicineName: '', dosage: '', scheduleTime: '', frequency: 'daily', reminderTimes: [] });
            setShowForm(false);
            loadReminders();
        } catch (err) {
            alert('Failed to add reminder: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this reminder?')) return;
        try { await deleteReminder(id); loadReminders(); }
        catch (err) { console.error('Delete error:', err); }
    };

    const groupByTime = () => {
        const now = new Date();
        const upcoming = [], completed = [];
        reminders.forEach(r => {
            if (r.is_active !== false) {
                const [h, m] = (r.schedule_time || '00:00').split(':');
                const rt = new Date();
                rt.setHours(parseInt(h), parseInt(m), 0);
                (rt > now ? upcoming : completed).push(r);
            }
        });
        return { upcoming, completed };
    };

    const { upcoming, completed } = groupByTime();

    const frequencyLabels = {
        daily: '📅 Daily', twice_daily: '🔄 Twice Daily',
        weekly: '📆 Weekly', as_needed: '🕐 As Needed'
    };

    if (loading) return (
        <div className="spinner-overlay"><div className="spinner"></div><span className="spinner-text">Loading reminders...</span></div>
    );

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="card-header" style={{ marginBottom: 0 }}>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>💊 Medicine Reminders</h1>
                        <p>Track your medication schedule</p>
                    </div>
                    <button onClick={() => setShowForm(!showForm)} className={`btn ${showForm ? 'btn-danger' : 'btn-primary'}`}>
                        {showForm ? '✕ Close' : '+ Add Reminder'}
                    </button>
                </div>

                {/* Add Reminder Form */}
                <AnimatePresence>
                    {showForm && (
                        <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', overflow: 'hidden' }}
                            onSubmit={handleAdd}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Medicine Name *</label>
                                    <input type="text" value={form.medicineName} onChange={e => setForm({...form, medicineName: e.target.value})}
                                        placeholder="e.g. Hydrocortisone Cream" required className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label>Dosage</label>
                                    <input type="text" value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})}
                                        placeholder="e.g. 10mg, 1 tablet" className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label>Reminder Time *</label>
                                    <input type="time" value={form.scheduleTime} onChange={e => setForm({...form, scheduleTime: e.target.value})}
                                        required className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label>Frequency</label>
                                    <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} className="form-input">
                                        <option value="daily">Daily</option>
                                        <option value="twice_daily">Twice Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="as_needed">As Needed</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                💾 Save Reminder
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* Daily Schedule View */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Upcoming */}
                    <div>
                        <h3 style={{ color: '#D97706', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700 }}>
                            ⏰ Upcoming ({upcoming.length})
                        </h3>
                        {upcoming.map(r => (
                            <motion.div key={r.id} className="card" whileHover={{ y: -2 }}
                                style={{ padding: '1.2rem', marginBottom: '0.8rem', borderLeft: '4px solid #F59E0B' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--text-primary)' }}>💊 {r.medicine_name}</h4>
                                        {r.dosage && <p style={{ color: 'var(--text-secondary)', margin: '0 0 6px', fontSize: '0.85rem' }}>{r.dosage}</p>}
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span className="badge badge-moderate">🕐 {r.schedule_time}</span>
                                            <span className="badge" style={{ background: '#E0F2FE', color: '#0369A1' }}>
                                                {frequencyLabels[r.frequency] || r.frequency}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(r.id)} className="btn btn-sm btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>🗑️</button>
                                </div>
                            </motion.div>
                        ))}
                        {upcoming.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No upcoming reminders</p>}
                    </div>

                    {/* Completed */}
                    <div>
                        <h3 style={{ color: '#059669', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700 }}>
                            ✅ Past / Completed ({completed.length})
                        </h3>
                        {completed.map(r => (
                            <motion.div key={r.id} className="card"
                                style={{ padding: '1.2rem', marginBottom: '0.8rem', borderLeft: '4px solid var(--success)', opacity: 0.7 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                            💊 {r.medicine_name}
                                        </h4>
                                        <span className="badge badge-mild">🕐 {r.schedule_time}</span>
                                    </div>
                                    <button onClick={() => handleDelete(r.id)} className="btn btn-sm btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>🗑️</button>
                                </div>
                            </motion.div>
                        ))}
                        {completed.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No completed reminders today</p>}
                    </div>
                </div>

                {reminders.length === 0 && !showForm && (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>💊</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No medicine reminders yet</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click "Add Reminder" to set up your medication schedule</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
