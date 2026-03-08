/**
 * DoctorsPage — Fully dynamic, database-driven doctor directory.
 * Features: specialization filter, city filter, pagination, booking modal.
 * No hardcoded doctor arrays — all data fetched from GET /api/doctors.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDoctors, fetchSpecializations, fetchCities, bookConsultation, fetchConsultations } from '../services/api';

export default function DoctorsPage() {
    // --- Data State ---
    const [doctors, setDoctors] = useState([]);
    const [specializations, setSpecializations] = useState([]);
    const [cities, setCities] = useState([]);
    const [consultations, setConsultations] = useState([]);

    // --- Filter State ---
    const [selectedSpec, setSelectedSpec] = useState('');
    const [selectedCity, setSelectedCity] = useState('');

    // --- Pagination State ---
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const LIMIT = 6;

    // --- UI State ---
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('directory');
    const [bookingDoctor, setBookingDoctor] = useState(null);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingNotes, setBookingNotes] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);

    // Load filter options on mount
    useEffect(() => {
        async function loadFilters() {
            try {
                const [specRes, cityRes, consultRes] = await Promise.all([
                    fetchSpecializations(),
                    fetchCities(),
                    fetchConsultations()
                ]);
                setSpecializations(specRes.data.specializations || []);
                setCities(cityRes.data.cities || []);
                setConsultations(consultRes.data.consultations || []);
            } catch (err) {
                console.error('Failed to load filter data:', err);
            }
        }
        loadFilters();
    }, []);

    // Fetch doctors whenever filters or page change
    const loadDoctors = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page, limit: LIMIT, available: 'true',
                ...(selectedSpec && { specialization: selectedSpec }),
                ...(selectedCity && { city: selectedCity }),
            };
            const res = await fetchDoctors(params);
            setDoctors(res.data.doctors || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 1);
        } catch (err) {
            console.error('Failed to load doctors:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedSpec, selectedCity, page]);

    useEffect(() => { loadDoctors(); }, [loadDoctors]);

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1); }, [selectedSpec, selectedCity]);

    const handleBook = async () => {
        if (!bookingDoctor || !bookingDate) return;
        setBookingLoading(true);
        try {
            await bookConsultation({
                doctorId: bookingDoctor.id,
                scheduledAt: new Date(bookingDate).toISOString(),
                notes: bookingNotes
            });
            setBookingDoctor(null);
            setBookingDate('');
            setBookingNotes('');
            const res = await fetchConsultations();
            setConsultations(res.data.consultations || []);
            alert('✅ Consultation booked successfully!');
        } catch (err) {
            alert('Failed to book: ' + (err.response?.data?.error || err.message));
        } finally {
            setBookingLoading(false);
        }
    };

    const statusColor = (status) => ({
        scheduled: '#2563EB', in_progress: '#D97706',
        completed: '#059669', cancelled: '#DC2626'
    }[status] || '#6b7280');

    // Pagination range helper
    const getPageNumbers = () => {
        const pages = [];
        const start = Math.max(1, page - 2);
        const end = Math.min(totalPages, page + 2);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    return (
        <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="card-header">
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        👨‍⚕️ Telemedicine & Consultations
                    </h1>
                    <p>Find doctors, book consultations — all data from our database.</p>
                </div>

                {/* Tab Navigation */}
                <div className="auth-tabs" style={{ maxWidth: '400px', marginBottom: '2rem' }}>
                    <button className={`auth-tab ${activeTab === 'directory' ? 'active' : ''}`}
                        onClick={() => setActiveTab('directory')}>🔍 Doctor Directory</button>
                    <button className={`auth-tab ${activeTab === 'consultations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('consultations')}>📋 My Consultations ({consultations.length})</button>
                </div>

                {/* ======== DOCTOR DIRECTORY TAB ======== */}
                {activeTab === 'directory' && (
                    <>
                        {/* Filters */}
                        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>
                                        Specialization
                                    </label>
                                    <select value={selectedSpec} onChange={e => setSelectedSpec(e.target.value)} className="form-input" style={{ width: 'auto', minWidth: '180px', padding: '8px 12px' }}>
                                        <option value="">All Specializations</option>
                                        {specializations.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>
                                        City
                                    </label>
                                    <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="form-input" style={{ width: 'auto', minWidth: '150px', padding: '8px 12px' }}>
                                        <option value="">All Cities</option>
                                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, paddingTop: '1.2rem' }}>
                                    {total} doctor{total !== 1 ? 's' : ''} found
                                </div>
                            </div>
                        </div>

                        {/* Doctor Grid */}
                        {loading ? (
                            <div className="spinner-overlay"><div className="spinner"></div><span className="spinner-text">Loading doctors...</span></div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                    <AnimatePresence mode="popLayout">
                                        {doctors.map((doctor, i) => (
                                            <motion.div key={doctor.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="card"
                                                whileHover={{ y: -4 }}
                                                style={{ padding: '1.5rem', cursor: 'default' }}>
                                                {/* Doctor avatar + name */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                                    <div style={{
                                                        width: '56px', height: '56px', borderRadius: '16px',
                                                        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '1.3rem', fontWeight: 700, color: 'white', flexShrink: 0
                                                    }}>
                                                        {doctor.name.split(' ').pop()?.charAt(0) || 'D'}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{doctor.name}</h3>
                                                        <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 500 }}>{doctor.specialization}</span>
                                                    </div>
                                                </div>

                                                {/* Badges */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                                    <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>⭐ {doctor.rating}</span>
                                                    <span className="badge" style={{ background: '#E0F2FE', color: '#0369A1' }}>{doctor.experience_years}y exp</span>
                                                    <span className="badge badge-mild">₹{doctor.consultation_fee}</span>
                                                </div>

                                                {/* Hospital & City */}
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 4px' }}>🏥 {doctor.hospital}</p>
                                                {doctor.city && (
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1rem' }}>📍 {doctor.city}</p>
                                                )}

                                                <button onClick={() => setBookingDoctor(doctor)} className="btn btn-primary" style={{ width: '100%' }}>
                                                    📅 Book Consultation
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                {/* Empty State */}
                                {doctors.length === 0 && (
                                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</p>
                                        <p style={{ color: 'var(--text-secondary)' }}>No doctors found matching your criteria.</p>
                                        <button onClick={() => { setSelectedSpec(''); setSelectedCity(''); }} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
                                            Clear Filters
                                        </button>
                                    </div>
                                )}

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="pagination">
                                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                                        {getPageNumbers().map(p => (
                                            <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>
                                                {p}
                                            </button>
                                        ))}
                                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* ======== MY CONSULTATIONS TAB ======== */}
                {activeTab === 'consultations' && (
                    <div>
                        {consultations.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</p>
                                <p style={{ color: 'var(--text-secondary)' }}>No consultations yet. Browse the directory to book one!</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {consultations.map(c => (
                                    <motion.div key={c.id} className="card" style={{ padding: '1.5rem' }}
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 4px', color: 'var(--text-primary)' }}>{c.doctor_name}</h3>
                                                <span style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                                                    {c.specialization} • {c.hospital}{c.city ? `, ${c.city}` : ''}
                                                </span>
                                            </div>
                                            <span className="badge" style={{
                                                background: statusColor(c.status) + '18',
                                                color: statusColor(c.status)
                                            }}>
                                                {c.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                            📅 {new Date(c.scheduled_at).toLocaleString()}
                                        </p>
                                        {c.notes && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', marginTop: 4 }}>📝 {c.notes}</p>}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ======== BOOKING MODAL ======== */}
                <AnimatePresence>
                    {bookingDoctor && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                            }}
                            onClick={(e) => { if (e.target === e.currentTarget) setBookingDoctor(null); }}>
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9 }}
                                className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
                                <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>📅 Book Consultation</h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                    with <strong>{bookingDoctor.name}</strong> — {bookingDoctor.specialization}
                                    <br />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        🏥 {bookingDoctor.hospital}{bookingDoctor.city ? `, ${bookingDoctor.city}` : ''} • ₹{bookingDoctor.consultation_fee}
                                    </span>
                                </p>

                                <div className="form-group">
                                    <label>Appointment Date & Time</label>
                                    <input type="datetime-local" value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                                        className="form-input" min={new Date().toISOString().slice(0, 16)} />
                                </div>
                                <div className="form-group">
                                    <label>Notes (optional)</label>
                                    <textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)}
                                        placeholder="Describe your symptoms or concerns..."
                                        rows={3} className="form-input" style={{ resize: 'vertical' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={handleBook} disabled={!bookingDate || bookingLoading}
                                        className="btn btn-primary" style={{ flex: 1 }}>
                                        {bookingLoading ? 'Booking...' : '✅ Confirm Booking'}
                                    </button>
                                    <button onClick={() => setBookingDoctor(null)} className="btn btn-secondary">Cancel</button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
