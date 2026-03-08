/**
 * EmergencyAlert — Full-screen emergency warning component.
 * Displayed when a severe/dangerous condition is detected.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmergencyAlert({ isVisible, alertMessage, recommendedAction, onDismiss, onFindHospitals }) {
    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="emergency-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(220, 38, 38, 0.95)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem'
                }}
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    style={{
                        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                        borderRadius: '24px', padding: '3rem', maxWidth: '600px', width: '100%',
                        textAlign: 'center', border: '2px solid rgba(239, 68, 68, 0.5)',
                        boxShadow: '0 0 60px rgba(239, 68, 68, 0.3)'
                    }}
                >
                    {/* Pulsing warning icon */}
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{ fontSize: '4rem', marginBottom: '1.5rem' }}
                    >
                        🚨
                    </motion.div>

                    <h1 style={{ color: '#ef4444', fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>
                        ⚠️ Emergency Alert
                    </h1>

                    <p style={{ color: '#fca5a5', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        {alertMessage || 'Possible serious condition detected. Please consult a doctor immediately.'}
                    </p>

                    {recommendedAction && (
                        <p style={{ color: '#fde68a', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>
                            {recommendedAction}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={onFindHospitals}
                            style={{
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: 'white', border: 'none', padding: '14px 28px',
                                borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'transform 0.2s'
                            }}
                            onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                            onMouseOut={e => e.target.style.transform = 'scale(1)'}
                        >
                            🏥 Find Nearest Hospital
                        </button>
                        <button
                            onClick={onDismiss}
                            style={{
                                background: 'rgba(255,255,255,0.1)', color: '#d1d5db',
                                border: '1px solid rgba(255,255,255,0.2)', padding: '14px 28px',
                                borderRadius: '12px', fontSize: '1rem', cursor: 'pointer'
                            }}
                        >
                            I Understand
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
