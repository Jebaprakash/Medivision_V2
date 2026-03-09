/**
 * ProgressPage — Disease Progress Tracking
 *
 * Fetches real diagnosis history from /api/history (authenticated endpoint).
 * Shows:
 *  - Severity over time trend chart (Chart.js)
 *  - Trend label: Improving / Same / Worsening
 *  - Comparison journal with images
 *  - Upload a new manual progress log
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Plus, TrendingUp, History, Image as ImageIcon, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { fetchMyHistory } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const SEV_ORDER = { mild: 1, moderate: 2, severe: 3 };

function computeTrend(records) {
    if (records.length < 2) return 'Same';
    const first = SEV_ORDER[records[0].severity]  || 1;
    const last  = SEV_ORDER[records[records.length - 1].severity] || 1;
    if (last < first) return 'Improving';
    if (last > first) return 'Worsening';
    return 'Same';
}

const TrendIcon = ({ trend }) => {
    if (trend === 'Improving') return <ArrowDown color="#10B981" size={20} />;
    if (trend === 'Worsening') return <ArrowUp color="#EF4444" size={20} />;
    return <Minus color="#F59E0B" size={20} />;
};

const ProgressPage = () => {
    const [historyData, setHistoryData] = useState([]);
    const [isLoading,   setIsLoading]   = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadData,  setUploadData]  = useState({ severity: 'mild', notes: '', image: null });
    const [previewUrl,  setPreviewUrl]  = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error,       setError]       = useState('');

    const token = localStorage.getItem('medivision_token');

    useEffect(() => { fetchHistory(); }, []);

    const fetchHistory = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetchMyHistory(1, 30);
            const rows = res.data.history || [];
            // Sort ascending for chart
            setHistoryData([...rows].reverse());
        } catch (err) {
            console.error('Fetch history error:', err);
            setError('Failed to load your diagnosis history.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadData({ ...uploadData, image: file });
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadData.image) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('severity', uploadData.severity);
        formData.append('notes', uploadData.notes);
        formData.append('image', uploadData.image);

        try {
            await axios.post('http://localhost:5000/api/progress', formData, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setUploadData({ severity: 'mild', notes: '', image: null });
            setPreviewUrl(null);
            setIsModalOpen(false);
            fetchHistory();
        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to save progress log. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    // Severity → numeric for chart
    const trend = computeTrend(historyData);

    const chartData = {
        labels: historyData.map(d => new Date(d.created_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short'
        })),
        datasets: [{
            label: 'Severity Level',
            data: historyData.map(d => SEV_ORDER[d.severity] || 1),
            borderColor: 'rgb(8, 145, 178)',
            backgroundColor: 'rgba(8, 145, 178, 0.1)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: historyData.map(d => {
                if (d.severity === 'severe')   return '#EF4444';
                if (d.severity === 'moderate') return '#F59E0B';
                return '#10B981';
            }),
            pointRadius: 6,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => {
                        const labels = ['', 'Mild', 'Moderate', 'Severe'];
                        return ` Severity: ${labels[ctx.parsed.y] || ctx.parsed.y}`;
                    },
                },
            },
        },
        scales: {
            y: {
                min: 0, max: 4,
                ticks: {
                    stepSize: 1,
                    callback: v => ['', 'Mild', 'Moderate', 'Severe', ''][v] || '',
                },
                grid: { color: 'rgba(0,0,0,0.05)' },
            },
            x: { grid: { display: false } },
        },
    };

    const trendColor = trend === 'Improving' ? '#10B981' : trend === 'Worsening' ? '#EF4444' : '#F59E0B';
    const trendBg    = trend === 'Improving' ? 'rgba(16,185,129,0.1)' : trend === 'Worsening' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)';

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2rem', margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>
                        <TrendingUp color="var(--primary)" size={32} />
                        Disease Progress Tracking
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Monitor your skin condition improvement over time based on your diagnosis history.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={20} /> Log Progress
                </button>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                    <span className="alert-icon">⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {isLoading ? (
                <div className="spinner-overlay">
                    <div className="spinner"></div>
                    <p className="spinner-text">Loading your progress...</p>
                </div>
            ) : (
                <>
                    {/* Trend Summary Cards */}
                    {historyData.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Diagnoses</p>
                                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{historyData.length}</p>
                            </div>
                            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Latest Condition</p>
                                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {historyData[historyData.length - 1]?.disease_name || 'N/A'}
                                </p>
                            </div>
                            <div className="card" style={{ padding: '1.25rem', textAlign: 'center', background: trendBg, borderColor: trendColor }}>
                                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Trend</p>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <TrendIcon trend={trend} />
                                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: trendColor }}>{trend}</p>
                                </div>
                            </div>
                            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Confidence</p>
                                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
                                    {historyData.length > 0
                                        ? `${Math.round(historyData.reduce((s, d) => s + (d.confidence_score || 0), 0) / historyData.length * 100)}%`
                                        : '—'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>

                        {/* Chart Panel */}
                        <div className="card" style={{ padding: '2rem' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
                                <TrendingUp color="var(--primary)" size={24} />
                                Severity Over Time
                            </h2>
                            {historyData.length >= 2 ? (
                                <div style={{ height: '360px' }}>
                                    <Line data={chartData} options={chartOptions} />
                                </div>
                            ) : (
                                <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border)' }}>
                                    <TrendingUp size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p style={{ fontWeight: 500 }}>
                                        {historyData.length === 0 ? 'No diagnosis history yet. Run your first analysis!' : 'Upload at least 2 diagnoses to see your progress graph.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Journal Panel */}
                        <div className="card" style={{ padding: '2rem' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
                                <History color="var(--text-secondary)" size={24} />
                                Diagnosis Journal
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '480px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                {[...historyData].reverse().map((record, idx) => (
                                    <div key={record.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        <div style={{ width: '64px', height: '64px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            {record.image_url ? (
                                                <img
                                                    src={`http://localhost:5000${record.image_url}`}
                                                    alt="Diagnosis"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--border)' }}>
                                                    <ImageIcon color="var(--text-muted)" size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {record.disease_name || 'Unidentified'}
                                                </span>
                                                <span className={`badge ${record.severity === 'severe' ? 'badge-severe' : record.severity === 'moderate' ? 'badge-moderate' : 'badge-mild'}`} style={{ flexShrink: 0 }}>
                                                    {record.severity || 'N/A'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                                                {new Date(record.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--primary)', margin: '0.1rem 0 0 0', fontWeight: 600 }}>
                                                {Math.round((record.confidence_score || 0) * 100)}% confidence
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {historyData.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                                        <History size={40} style={{ opacity: 0.2, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                                        <p>No diagnoses yet. Run your first analysis!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Progress Log Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '480px', padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Log Progress Entry</h3>
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                Upload a photo to manually track your skin condition today.
                            </p>
                        </div>

                        <form onSubmit={handleUpload} style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                    Photo <span style={{ color: 'var(--danger)' }}>*</span>
                                </label>
                                <div
                                    onClick={() => document.getElementById('log-image-file').click()}
                                    style={{
                                        height: '160px',
                                        border: `2px dashed ${previewUrl ? 'var(--primary)' : 'var(--border)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', transition: 'var(--transition)',
                                    }}
                                >
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', padding: '0.5rem' }} />
                                    ) : (
                                        <>
                                            <Camera color="var(--primary)" size={32} style={{ marginBottom: '0.5rem' }} />
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Click to upload photo</span>
                                        </>
                                    )}
                                    <input id="log-image-file" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Severity</label>
                                <select className="form-control" value={uploadData.severity} onChange={e => setUploadData({ ...uploadData, severity: e.target.value })}>
                                    <option value="mild">🟢 Mild</option>
                                    <option value="moderate">🟡 Moderate</option>
                                    <option value="severe">🔴 Severe</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Notes</label>
                                <textarea
                                    className="form-control"
                                    style={{ minHeight: '80px', resize: 'vertical' }}
                                    placeholder="How does it feel today? Any changes?"
                                    value={uploadData.notes}
                                    onChange={e => setUploadData({ ...uploadData, notes: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isUploading || !uploadData.image} className="btn btn-primary" style={{ flex: 1, opacity: (isUploading || !uploadData.image) ? 0.5 : 1 }}>
                                    {isUploading ? 'Saving...' : 'Save Log'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgressPage;
