/**
 * MediVision AI — Auth Forms (Login & Register)
 */
import React, { useState } from 'react';
import { login, register } from '../services/api';

export default function AuthForms({ onLogin }) {
    const [tab, setTab] = useState('login'); // 'login' | 'register'
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let res;
            if (tab === 'login') {
                res = await login(form.email, form.password);
            } else {
                if (!form.name.trim()) {
                    setError('Name is required');
                    setLoading(false);
                    return;
                }
                res = await register(form.name, form.email, form.password);
            }

            const { user, token } = res.data;
            onLogin(user, token);
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.messages?.join(', ') ||
                'Something went wrong. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🩺</div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                    Welcome to MediVision AI
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    AI-powered medical image analysis &amp; hospital recommendations
                </p>
            </div>

            {/* Tabs */}
            <div className="auth-tabs">
                <button
                    className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                    onClick={() => { setTab('login'); setError(''); }}
                >
                    Sign In
                </button>
                <button
                    className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
                    onClick={() => { setTab('register'); setError(''); }}
                >
                    Create Account
                </button>
            </div>

            {/* Form */}
            <div className="card">
                <form onSubmit={handleSubmit}>
                    {tab === 'register' && (
                        <div className="form-group">
                            <label htmlFor="auth-name">Full Name</label>
                            <input
                                id="auth-name"
                                className="form-input"
                                type="text"
                                name="name"
                                placeholder="Dr. Jane Smith"
                                value={form.name}
                                onChange={handleChange}
                                autoComplete="name"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="auth-email">Email Address</label>
                        <input
                            id="auth-email"
                            className="form-input"
                            type="email"
                            name="email"
                            placeholder="jane@example.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="auth-password">Password</label>
                        <input
                            id="auth-password"
                            className="form-input"
                            type="password"
                            name="password"
                            placeholder="Min 6 characters"
                            value={form.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                        />
                    </div>

                    {error && (
                        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                            <span className="alert-icon">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
                                {tab === 'login' ? 'Signing in…' : 'Creating account…'}
                            </>
                        ) : (
                            tab === 'login' ? 'Sign In' : 'Create Account'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
