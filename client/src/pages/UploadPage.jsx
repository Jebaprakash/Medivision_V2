/**
 * MediVision AI — Upload Page
 *
 * Drag-and-drop image upload with preview, symptom checkboxes,
 * and diagnosis submission.
 */
import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitDiagnosis } from '../services/api';

const SYMPTOM_OPTIONS = [
    { id: 'itching', label: 'Itching' },
    { id: 'redness', label: 'Redness' },
    { id: 'swelling', label: 'Swelling' },
    { id: 'pain', label: 'Pain' },
    { id: 'discharge', label: 'Discharge' },
    { id: 'discoloration', label: 'Discoloration' },
];

export default function UploadPage({ onResult }) {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [symptoms, setSymptoms] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ---- File Handling ----
    const handleFile = useCallback((selectedFile) => {
        if (!selectedFile) return;

        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(selectedFile.type)) {
            setError('Invalid file type. Please upload a JPG, PNG, or WebP image.');
            return;
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File is too large. Maximum size is 10 MB.');
            return;
        }

        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
        setError('');
    }, []);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            setDragOver(false);
            const droppedFile = e.dataTransfer.files[0];
            handleFile(droppedFile);
        },
        [handleFile]
    );

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    // ---- Symptom toggle ----
    const toggleSymptom = (id) => {
        setSymptoms((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );
    };

    // ---- Remove selected image ----
    const removeImage = () => {
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ---- Submit ----
    const handleSubmit = async () => {
        if (!file) {
            setError('Please upload a medical image before submitting.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('symptoms', symptoms.join(','));

            const res = await submitDiagnosis(formData);
            onResult(res.data);
            navigate('/results');
        } catch (err) {
            const msg =
                err.response?.data?.message || 'Analysis failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="card-header" style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                    🔬 Medical Image Analysis
                </h1>
                <p>Upload a clear medical image and select your symptoms for AI-powered diagnosis.</p>
            </div>

            {/* Upload Card */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <h2>📷 Upload Medical Image</h2>
                    <p>Supported formats: JPG, PNG, WebP — Max 10 MB</p>
                </div>

                {!preview ? (
                    <div
                        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span className="upload-icon">📤</span>
                        <p className="upload-text">
                            Drag & drop your image here, or <strong>click to browse</strong>
                        </p>
                        <p className="upload-hint">JPG, PNG, or WebP up to 10 MB</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFile(e.target.files[0])}
                        />
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <img src={preview} alt="Medical image preview" className="image-preview" />
                        <div style={{ marginTop: '0.75rem' }}>
                            <button className="btn btn-secondary btn-sm" onClick={removeImage}>
                                ✕ Remove Image
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Symptom Card */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <h2>🩹 Select Symptoms</h2>
                    <p>Check all symptoms that apply to your condition.</p>
                </div>

                <div className="checkbox-grid">
                    {SYMPTOM_OPTIONS.map((symptom) => (
                        <label
                            key={symptom.id}
                            className={`checkbox-item ${symptoms.includes(symptom.id) ? 'checked' : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={symptoms.includes(symptom.id)}
                                onChange={() => toggleSymptom(symptom.id)}
                            />
                            {symptom.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <span className="alert-icon">⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Submit */}
            {loading ? (
                <div className="spinner-overlay">
                    <div className="spinner"></div>
                    <p className="spinner-text">Analysing your image with AI… This may take a moment.</p>
                </div>
            ) : (
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '1rem' }}
                    onClick={handleSubmit}
                    disabled={!file}
                >
                    🧠 Analyse with AI
                </button>
            )}

            {/* Disclaimer */}
            <div className="disclaimer-banner">
                <span>ℹ️</span>
                This system provides preliminary health information and should not replace professional medical advice.
            </div>
        </div>
    );
}
