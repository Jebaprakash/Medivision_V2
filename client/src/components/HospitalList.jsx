import React from 'react';

const HospitalList = ({ hospitals, isEmergency }) => {
    if (!hospitals || hospitals.length === 0) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem', opacity: 0.5 }}>🏥</span>
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No hospitals found nearby. Try increasing the search radius.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {hospitals.map((hospital, index) => {
                const isNearestAndEmergency = isEmergency && index === 0;
                
                return (
                <div key={hospital.id || hospital.name} className="card" style={{ 
                    padding: '1.5rem', 
                    display: 'flex', 
                    flexDirection: 'column',
                    border: isNearestAndEmergency ? '2px solid var(--danger)' : '1px solid var(--border)',
                    boxShadow: isNearestAndEmergency ? '0 4px 12px rgba(220, 38, 38, 0.15)' : 'none'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                            {hospital.name}
                        </h3>
                        <div style={{ 
                            background: 'var(--bg-secondary)', 
                            padding: '0.25rem 0.75rem', 
                            borderRadius: '1rem',
                            fontWeight: 600,
                            color: 'var(--primary)',
                            whiteSpace: 'nowrap'
                        }}>
                            🚗 {hospital.distance_km?.toFixed(1) || '?'} km
                        </div>
                    </div>

                    {isEmergency && hospital.emergency && (
                        <span style={{ 
                            marginTop: '0.5rem', 
                            color: 'var(--danger)', 
                            fontSize: '0.85rem', 
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}>
                            🚨 Emergency Services Available
                        </span>
                    )}

                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {hospital.address ? (
                            <span style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                📍 {hospital.address}
                            </span>
                        ) : null}
                        
                        {hospital.phone ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                📞 <a href={`tel:${hospital.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{hospital.phone}</a>
                            </span>
                        ) : null}
                    </div>
                </div>
                );
            })}
        </div>
    );
};

export default HospitalList;
