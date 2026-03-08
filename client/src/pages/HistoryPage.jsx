/**
 * MediVision AI — History Page
 *
 * Displays a paginated table of past diagnoses for the logged-in user.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { fetchHistory } from '../services/api';

export default function HistoryPage({ userId }) {
    const [history, setHistory] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const ITEMS_PER_PAGE = 10;

    const loadHistory = useCallback(
        async (page = 1) => {
            setLoading(true);
            setError('');
            try {
                const res = await fetchHistory(userId, page, ITEMS_PER_PAGE);
                setHistory(res.data.history || []);
                setPagination(res.data.pagination || { page: 1, totalPages: 1, totalItems: 0 });
            } catch (err) {
                setError('Failed to load diagnosis history.');
                console.error('History fetch error:', err);
            } finally {
                setLoading(false);
            }
        },
        [userId]
    );

    useEffect(() => {
        loadHistory(1);
    }, [loadHistory]);

    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.totalPages) {
            loadHistory(page);
        }
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const severityClass = (sev) =>
        ({ mild: 'badge-mild', moderate: 'badge-moderate', severe: 'badge-severe' }[sev] || 'badge-mild');

    return (
        <div>
            {/* Header */}
            <div className="card-header" style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                    📜 Diagnosis History
                </h1>
                <p>
                    View all your past AI diagnoses
                    {pagination.totalItems > 0 && (
                        <span> — {pagination.totalItems} record{pagination.totalItems !== 1 ? 's' : ''}</span>
                    )}
                </p>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <span className="alert-icon">⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="spinner-overlay">
                    <div className="spinner"></div>
                    <p className="spinner-text">Loading history…</p>
                </div>
            ) : history.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>No Diagnoses Yet</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Your diagnosis history will appear here after your first AI analysis.
                    </p>
                </div>
            ) : (
                <>
                    {/* Table */}
                    <div className="card" style={{ padding: '0', overflow: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Condition</th>
                                    <th>Confidence</th>
                                    <th>Severity</th>
                                    <th>Symptoms</th>
                                    <th>Image</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((record) => (
                                    <tr key={record.id}>
                                        <td>{formatDate(record.created_at)}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {record.disease_name || 'Unidentified'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div className="confidence-bar" style={{ width: 80, height: 8 }}>
                                                    <div
                                                        className="confidence-bar-fill"
                                                        style={{ width: `${Math.round(record.confidence_score * 100)}%` }}
                                                    />
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                                    {Math.round(record.confidence_score * 100)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${severityClass(record.severity)}`}>
                                                {record.severity || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            {record.symptoms && record.symptoms.length > 0
                                                ? record.symptoms.join(', ')
                                                : '—'}
                                        </td>
                                        <td>
                                            {record.image_url ? (
                                                <img
                                                    src={record.image_url}
                                                    alt="Diagnosis"
                                                    style={{
                                                        width: 48,
                                                        height: 48,
                                                        objectFit: 'cover',
                                                        borderRadius: 'var(--radius-sm)',
                                                        border: '1px solid var(--border)',
                                                    }}
                                                />
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => goToPage(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                            >
                                ← Prev
                            </button>
                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                .filter((p) => {
                                    // Show max 7 page buttons around current page
                                    return Math.abs(p - pagination.page) <= 3 || p === 1 || p === pagination.totalPages;
                                })
                                .map((p, idx, arr) => (
                                    <React.Fragment key={p}>
                                        {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '0 0.25rem' }}>…</span>}
                                        <button
                                            className={pagination.page === p ? 'active' : ''}
                                            onClick={() => goToPage(p)}
                                        >
                                            {p}
                                        </button>
                                    </React.Fragment>
                                ))}
                            <button
                                onClick={() => goToPage(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
