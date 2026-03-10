/**
 * MediVision AI V2 — App Component
 * Handles routing, auth state, and top-level layout.
 */
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';
import HospitalsPage from './pages/HospitalsPage';
import HistoryPage from './pages/HistoryPage';
import AuthForms from './pages/AuthForms';
import ChatbotPage from './pages/ChatbotPage';
import ProgressPage from './pages/ProgressPage';
import ReminderPage from './pages/ReminderPage';
import DoctorsPage from './pages/DoctorsPage';

function App() {
    const [user, setUser] = useState(null);
    const [diagnosisResult, setDiagnosisResult] = useState(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('medivision_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('medivision_user');
            }
        }
    }, []);

    const handleLogin = (userData, token) => {
        setUser(userData);
        localStorage.setItem('medivision_user', JSON.stringify(userData));
        localStorage.setItem('medivision_token', token);
    };

    const handleLogout = () => {
        setUser(null);
        setDiagnosisResult(null);
        localStorage.removeItem('medivision_user');
        localStorage.removeItem('medivision_token');
    };

    return (
        <Router>
            <div className="app-wrapper">
                <Navbar user={user} onLogout={handleLogout} />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={
                            user ? <UploadPage onResult={setDiagnosisResult} /> : <Navigate to="/auth" replace />
                        } />
                        <Route path="/results" element={
                            user ? <ResultsPage result={diagnosisResult} /> : <Navigate to="/auth" replace />
                        } />
                        <Route path="/hospitals" element={
                            user ? <HospitalsPage /> : <Navigate to="/auth" replace />
                        } />
                        <Route path="/history" element={
                            user ? <HistoryPage userId={user.id} /> : <Navigate to="/auth" replace />
                        } />
                        <Route path="/auth" element={
                            user ? <Navigate to="/" replace /> : <AuthForms onLogin={handleLogin} />
                        } />
                        <Route path="/chatbot" element={
                            user ? <ChatbotPage /> : <Navigate to="/auth" replace />
                        } />
                        <Route path="/progress" element={
                            user ? <ProgressPage /> : <Navigate to="/auth" replace />
                        } />
                        <Route path="/reminders" element={
                            user ? <ReminderPage /> : <Navigate to="/auth" replace />
                        } />
                        <Route path="/doctors" element={
                            user ? <DoctorsPage /> : <Navigate to="/auth" replace />
                        } />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

/** Navigation bar with active link highlighting */
function Navbar({ user, onLogout }) {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (path) => location.pathname === path ? 'active' : '';

    const navLinks = [
        { to: '/', label: 'Diagnose', key: 'diagnose' },
        { to: '/chatbot', label: 'AI Chat', key: 'chatbot' },
        { to: '/doctors', label: 'Doctors', key: 'doctors' },
        { to: '/progress', label: 'Tracking', key: 'progress' },
        { to: '/reminders', label: 'Reminders', key: 'reminders' },
        { to: '/hospitals', label: 'Hospitals', key: 'hospitals' },
        { to: '/history', label: 'History', key: 'history' },
    ];

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                <span className="logo-icon">🩺</span>
                MediVision AI
            </Link>
            <div className="navbar-links">
                {user ? (
                    <>
                        {navLinks.map(link => (
                            <Link key={link.key} to={link.to} className={isActive(link.to)}>
                                {link.label}
                            </Link>
                        ))}
                        <button onClick={onLogout}>Logout</button>
                    </>
                ) : (
                    <Link to="/auth" className={isActive('/auth')}>Sign In</Link>
                )}
            </div>
        </nav>
    );
}

export default App;
