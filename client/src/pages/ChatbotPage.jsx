/**
 * ChatbotPage — AI Medical Chatbot with persistent conversation history.
 * Uses light theme consistent with the app's CSS variables.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { sendChatMessage, getChatSessions } from '../services/api';

export default function ChatbotPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [diseaseContext, setDiseaseContext] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        setMessages([{
            role: 'assistant',
            content: 'Hello! I\'m your MediVision AI Medical Assistant. I can answer questions about skin conditions, explain symptoms, suggest precautions, and advise when to see a doctor.\n\nTry asking me something like:\n• "What causes eczema?"\n• "Is acne dangerous?"\n• "What precautions should I take for psoriasis?"'
        }]);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
        setInput('');
        setLoading(true);

        try {
            const res = await sendChatMessage(trimmed, sessionId, diseaseContext || null);
            setSessionId(res.data.sessionId);
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'I apologize, but I\'m temporarily unavailable. Please try again or consult a healthcare professional.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const startNewSession = () => {
        setSessionId(null);
        setMessages([{ role: 'assistant', content: 'New conversation started. How can I help you today?' }]);
    };

    const quickQuestions = [
        'What causes eczema?',
        'Is acne dangerous?',
        'What precautions for psoriasis?',
        'When should I see a doctor?'
    ];

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            🤖 AI Medical Assistant
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.9rem' }}>
                            Ask questions about skin conditions, symptoms, and precautions
                        </p>
                    </div>
                    <button onClick={startNewSession} className="btn btn-secondary btn-sm">✨ New Chat</button>
                </div>

                {/* Disease Context Selector */}
                <div className="card" style={{ padding: '0.8rem 1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>🔬 Disease Context:</span>
                    <input
                        type="text" value={diseaseContext} onChange={e => setDiseaseContext(e.target.value)}
                        placeholder="e.g. Eczema, Psoriasis (optional)"
                        className="form-input"
                        style={{ flex: 1, minWidth: '200px', padding: '6px 12px', fontSize: '0.85rem' }}
                    />
                </div>

                {/* Chat Messages */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        height: '450px', overflowY: 'auto', padding: '1.5rem',
                        display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}>
                        {messages.map((msg, idx) => (
                            <motion.div key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '80%', padding: '12px 16px',
                                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, var(--primary), var(--accent))'
                                        : '#f1f5f9',
                                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                                    fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap'
                                }}>
                                    {msg.content}
                                </div>
                            </motion.div>
                        ))}

                        {loading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    padding: '12px 20px', borderRadius: '16px 16px 16px 4px',
                                    background: '#f1f5f9', color: 'var(--text-muted)'
                                }}>
                                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}>
                                        Thinking...
                                    </motion.span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Questions */}
                    {messages.length <= 1 && (
                        <div style={{ padding: '0 1.5rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {quickQuestions.map((q, i) => (
                                <button key={i} onClick={() => setInput(q)}
                                    style={{
                                        padding: '6px 14px', borderRadius: '20px',
                                        border: '1px solid var(--primary)', background: 'rgba(8,145,178,0.08)',
                                        color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer'
                                    }}>
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Bar */}
                    <div style={{
                        display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem',
                        borderTop: '1px solid var(--border)', background: '#fafafa'
                    }}>
                        <input
                            type="text" value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown} placeholder="Ask about skin conditions..."
                            disabled={loading}
                            className="form-input"
                            style={{ flex: 1, padding: '12px 16px' }}
                        />
                        <button onClick={handleSend} disabled={!input.trim() || loading}
                            className="btn btn-primary" style={{ padding: '12px 20px' }}>
                            Send
                        </button>
                    </div>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem', fontStyle: 'italic' }}>
                    ⚕️ This AI provides general health information only. Always consult a qualified healthcare professional for medical advice.
                </p>
            </motion.div>
        </div>
    );
}
