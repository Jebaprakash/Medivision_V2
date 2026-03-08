/**
 * Chatbot Route — AI medical chatbot with conversation history.
 * Delegates AI processing to Java Vision Service, persists messages in PostgreSQL.
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:8080';

// ----------------------------------------------------------------
// POST /api/chatbot/message — send a message and get AI response
// ----------------------------------------------------------------
router.post('/message', authMiddleware, async (req, res) => {
    try {
        const { message, sessionId, diseaseContext } = req.body;
        const userId = req.user.id;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Use existing session or create new one
        const currentSessionId = sessionId || uuidv4();

        // Persist user message
        await pool.query(
            `INSERT INTO chatbot_messages (session_id, user_id, role, content, disease_context)
             VALUES ($1, $2, 'user', $3, $4)`,
            [currentSessionId, userId, message.trim(), diseaseContext || null]
        );

        // Build context from recent conversation history (last 10 messages)
        const historyResult = await pool.query(
            `SELECT role, content FROM chatbot_messages
             WHERE session_id = $1 ORDER BY created_at DESC LIMIT 10`,
            [currentSessionId]
        );
        const conversationHistory = historyResult.rows.reverse();

        // Delegate to Java Vision Service for AI processing
        let reply;
        try {
            const response = await axios.post(`${VISION_SERVICE_URL}/chat`, {
                message: message.trim(),
                diseaseContext: diseaseContext || null,
                conversationHistory: conversationHistory
            }, { timeout: 30000 });
            reply = response.data.reply;
        } catch (apiErr) {
            console.error('Vision service chat error:', apiErr.response?.data || apiErr.message);
            reply = 'I apologize, but I am temporarily unable to process your request. Please try again in a moment, or consult a healthcare professional for urgent concerns.';
        }

        // Persist assistant response
        await pool.query(
            `INSERT INTO chatbot_messages (session_id, user_id, role, content, disease_context)
             VALUES ($1, $2, 'assistant', $3, $4)`,
            [currentSessionId, userId, reply, diseaseContext || null]
        );

        res.json({
            reply,
            sessionId: currentSessionId
        });
    } catch (error) {
        console.error('Chatbot route error:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
});

// ----------------------------------------------------------------
// GET /api/chatbot/history/:sessionId — get conversation history
// ----------------------------------------------------------------
router.get('/history/:sessionId', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT id, role, content, disease_context, created_at
             FROM chatbot_messages
             WHERE session_id = $1 AND user_id = $2
             ORDER BY created_at ASC`,
            [sessionId, userId]
        );

        res.json({ messages: result.rows, sessionId });
    } catch (error) {
        console.error('Chat history error:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// ----------------------------------------------------------------
// GET /api/chatbot/sessions — get all sessions for a user
// ----------------------------------------------------------------
router.get('/sessions', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT session_id, disease_context,
                    MIN(created_at) as started_at,
                    MAX(created_at) as last_message_at,
                    COUNT(*) as message_count
             FROM chatbot_messages
             WHERE user_id = $1
             GROUP BY session_id, disease_context
             ORDER BY MAX(created_at) DESC
             LIMIT 20`,
            [userId]
        );

        res.json({ sessions: result.rows });
    } catch (error) {
        console.error('Sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Keep legacy route for backward compatibility
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const response = await axios.post(`${VISION_SERVICE_URL}/chat`, { message }, { timeout: 30000 });
        res.json({ reply: response.data.reply });
    } catch (error) {
        console.error('Legacy chat error:', error.message);
        res.status(500).json({
            reply: 'I apologize, but I am unable to process your request at the moment.'
        });
    }
});

module.exports = router;
