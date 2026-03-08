/**
 * MediVision AI V3 — Centralized API Service
 * All API calls managed in one place with auth token handling.
 * No hardcoded data — everything is database or API driven.
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 60000,
});

// ---- Attach JWT token to every request ----
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('medivision_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ---- Global response error handler ----
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('medivision_token');
            localStorage.removeItem('medivision_user');
            window.location.href = '/auth';
        }
        return Promise.reject(error);
    }
);

// ================================================================
// Auth
// ================================================================
export const register = (name, email, password) =>
    api.post('/auth/register', { name, email, password });

export const login = (email, password) =>
    api.post('/auth/login', { email, password });

// ================================================================
// Diagnosis
// ================================================================
export const submitDiagnosis = (formData) =>
    api.post('/diagnose', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// ================================================================
// Hospitals (Real-time via Overpass API)
// ================================================================
export const fetchHospitals = (lat, lng, radius = 5) =>
    api.get('/hospitals', { params: { lat, lng, radius } });

// ================================================================
// History
// ================================================================
export const fetchHistory = (userId, page = 1, limit = 10) =>
    api.get(`/history/${userId}`, { params: { page, limit } });

// ================================================================
// Chatbot
// ================================================================
export const sendChatMessage = (message, sessionId = null, diseaseContext = null) =>
    api.post('/chatbot/message', { message, sessionId, diseaseContext });

export const getChatHistory = (sessionId) =>
    api.get(`/chatbot/history/${sessionId}`);

export const getChatSessions = () =>
    api.get('/chatbot/sessions');

// ================================================================
// Progress Tracking
// ================================================================
export const fetchProgress = () =>
    api.get('/progress');

export const addProgressLog = (formData) =>
    api.post('/progress', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// ================================================================
// Medicine Reminders
// ================================================================
export const fetchReminders = () =>
    api.get('/reminders');

export const addReminder = (data) =>
    api.post('/reminders', data);

export const deleteReminder = (id) =>
    api.delete(`/reminders/${id}`);

export const toggleReminder = (id, isActive) =>
    api.patch(`/reminders/${id}`, { isActive });

// ================================================================
// Doctors & Consultations (Database-driven with pagination)
// ================================================================
export const fetchDoctors = (params = {}) =>
    api.get('/doctors', { params });

export const fetchSpecializations = () =>
    api.get('/doctors/specializations');

export const fetchCities = () =>
    api.get('/doctors/cities');

export const fetchDoctorById = (id) =>
    api.get(`/doctors/${id}`);

export const bookConsultation = (data) =>
    api.post('/doctors/consultations/book', data);

export const fetchConsultations = () =>
    api.get('/doctors/consultations/user');

export const updateConsultationStatus = (id, status) =>
    api.patch(`/doctors/consultations/${id}/status`, { status });

export default api;
