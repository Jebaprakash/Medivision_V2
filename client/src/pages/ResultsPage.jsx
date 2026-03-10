/**
 * MediVision AI — Results Page
 * Displays AI diagnosis with emergency detection and action buttons.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmergencyAlert from '../components/EmergencyAlert';

export default function ResultsPage({ result }) {
    const navigate = useNavigate();
    const [showEmergency, setShowEmergency] = useState(true);

    if (!result || !result.diagnosis) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <h2 style={{ marginBottom: '0.5rem' }}>No Diagnosis Results</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Please upload a medical image first to receive AI analysis.
                </p>
                <Link to="/" className="btn btn-primary">← Go to Upload</Link>
            </div>
        );
    }

    const { diagnosis, emergency, disclaimer } = result;
    const {
        condition, confidence_score, severity, description, precautions,
        low_confidence, medicines, image_url,
    } = diagnosis;

    if (condition && condition.toLowerCase() === 'not a skin image') {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                <h2 style={{ marginBottom: '0.5rem', color: '#ef4444' }}>Invalid Image Detected</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
                    {description || 'The uploaded image does not appear to be a human skin image. Please upload a clear medical image of a skin condition.'}
                </p>
                <Link to="/" className="btn btn-primary">Try Again</Link>
            </div>
        );
    }

    const confidencePercent = Math.round(confidence_score * 100);

    const severityClass = {
        mild: 'badge-mild',
        moderate: 'badge-moderate',
        severe: 'badge-severe',
    }[severity] || 'badge-mild';

    return (
        <div>
            {/* Emergency Alert Overlay */}
            {emergency?.isEmergency && (
                <EmergencyAlert
                    isVisible={showEmergency}
                    alertMessage={emergency.alertMessage}
                    recommendedAction={emergency.recommendedAction}
                    onDismiss={() => setShowEmergency(false)}
                    onFindHospitals={() => { setShowEmergency(false); navigate('/hospitals', { state: { emergency: true } }); }}
                />
            )}

            {/* Page Header */}
            <div className="card-header" style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                    📊 Diagnosis Results
                </h1>
                <p>AI-powered analysis of your medical image</p>
            </div>

            {/* Low Confidence Warning */}
            {low_confidence && (
                <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                    <span className="alert-icon">🚨</span>
                    <div>
                        <strong>Low Confidence Detection</strong>
                        <p style={{ marginTop: '0.25rem' }}>
                            Unable to detect the condition accurately. Please consult a doctor for proper diagnosis and treatment.
                        </p>
                    </div>
                </div>
            )}

            {/* Emergency Inline Banner (persists after dismissing overlay) */}
            {emergency?.isEmergency && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))',
                    border: '1px solid rgba(239,68,68,0.4)', borderRadius: '16px',
                    padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
                    display: 'flex', alignItems: 'center', gap: '1rem'
                }}>
                    <span style={{ fontSize: '2rem' }}>🚨</span>
                    <div>
                        <strong style={{ color: '#ef4444', fontSize: '1rem' }}>Emergency: Severe Condition Detected</strong>
                        <p style={{ color: '#fca5a5', fontSize: '0.9rem', margin: '4px 0 0' }}>
                            {emergency.recommendedAction}
                        </p>
                    </div>
                </div>
            )}

            {/* Moderate/Severe Consultation Warning */}
            {(severity === 'moderate' || severity === 'severe') && !low_confidence && !emergency?.isEmergency && (
                <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                    <span className="alert-icon">👨‍⚕️</span>
                    <div>
                        <strong>Doctor Consultation Recommended</strong>
                        <p style={{ marginTop: '0.25rem' }}>
                            The detected condition has <strong>{severity}</strong> severity.
                            We strongly recommend consulting a healthcare professional.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Result Card */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
                    {image_url && (
                        <div style={{ flexShrink: 0 }}>
                            <img src={image_url} alt="Analysed medical image"
                                style={{
                                    width: 180, height: 180, objectFit: 'cover',
                                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
                                }} />
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 250 }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>{condition}</h2>
                        {severity !== 'none' && <span className={`badge ${severityClass}`}>{severity}</span>}
                        {description && <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{description}</p>}
                        <div className="confidence-bar-container" style={{ marginTop: '1.25rem' }}>
                            <div className="confidence-bar-label">
                                <span>AI Confidence</span>
                                <span>{confidencePercent}%</span>
                            </div>
                            <div className="confidence-bar">
                                <div className="confidence-bar-fill" style={{ width: `${confidencePercent}%`, background: low_confidence ? '#ef4444' : 'var(--primary)' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="result-grid">
                <div className="card">
                    <div className="card-header"><h2>💊 Recommended Medicines</h2></div>
                    {medicines && medicines.length > 0 ? (
                        <ul className="medicine-list">
                            {medicines.map((med, i) => (
                                <li key={i} className="medicine-item">
                                    <h4>{med.name}</h4>
                                    {med.dosage && <p>📏 {med.dosage}</p>}
                                    {med.notes && <p>📝 {med.notes}</p>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            No specific medicine recommendations. Please consult a doctor.
                        </p>
                    )}
                </div>
                <div className="card">
                    <div className="card-header"><h2>🛡️ Precautions</h2></div>
                    {precautions && precautions.length > 0 ? (
                        <ul className="precaution-list">
                            {precautions.map((p, i) => (
                                <li key={i} className="precaution-item">{p}</li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No specific precautions listed.</p>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <Link to="/hospitals" state={{ emergency: emergency?.isEmergency || false }} className="btn btn-primary">🏥 Find Nearby Hospitals</Link>
                <Link to="/doctors" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                    👨‍⚕️ Book Doctor Consultation
                </Link>
                <Link to="/chatbot" className="btn btn-secondary">🤖 Ask AI About {condition}</Link>
                <Link to="/" className="btn btn-secondary">🔬 New Analysis</Link>
            </div>

            {/* Disclaimer */}
            <div className="disclaimer-banner">
                <span>ℹ️</span>
                {disclaimer || 'This system provides preliminary health information and should not replace professional medical advice.'}
            </div>
        </div>
    );
}
