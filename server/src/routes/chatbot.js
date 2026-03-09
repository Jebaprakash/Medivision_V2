/**
 * Chatbot Route — AI medical chatbot powered by Google Gemini.
 *
 * Architecture:
 * POST /api/chatbot/message → calls Gemini 2.5 Flash directly
 *                           → persists conversation in PostgreSQL
 *
 * Context-aware: When diseaseContext is provided (from a completed diagnosis),
 * it is injected into the system prompt so Gemini gives personalised advice.
 */
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool    = require('../db');
const authMiddleware = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Use chat API key for chatbot interactions
const GEMINI_CHAT_KEY = process.env.GEMINI_CHAT_API_KEY || process.env.GEMINI_VISION_API_KEY;
const CHAT_MODEL      = 'gemini-2.5-flash-lite';

let genAI = null;
function getGenAI() {
    if (!genAI && GEMINI_CHAT_KEY) {
        genAI = new GoogleGenerativeAI(GEMINI_CHAT_KEY);
    }
    return genAI;
}

/**
 * Build the system instruction for the chatbot.
 * Personalised with disease context if available.
 */
function buildSystemInstruction(diseaseContext) {
    let instruction = `You are MediVision AI Medical Assistant, a professional, empathetic healthcare chatbot 
specializing in dermatology and skin health. 

Your responsibilities:
- Answer questions about skin diseases, symptoms, causes, and treatments
- Provide precaution advice and lifestyle recommendations
- Suggest common over-the-counter medicines with clear dosage info where appropriate
- Recommend when to see a specialist (always encourage professional consultation)
- Respond in clear, simple language suitable for patients (not highly technical)

Rules:
- Always end responses with a brief disclaimer recommending professional medical advice
- Never diagnose definitively — always say "may indicate" or "could suggest"
- Keep responses focused and under 250 words unless asked for detail
- Use bullet points for lists of symptoms, precautions, or medicines`;

    if (diseaseContext && diseaseContext.trim()) {
        instruction += `\n\nIMPORTANT CONTEXT: The patient has recently been diagnosed or is inquiring about: "${diseaseContext}". 
Tailor all responses to be relevant to this condition. Provide specific, personalized advice related to ${diseaseContext}.`;
    }

    return instruction;
}

// ----------------------------------------------------------------
// POST /api/chatbot/message — Primary chat endpoint
// ----------------------------------------------------------------
router.post('/message', authMiddleware, async (req, res) => {
    try {
        const { message, sessionId, diseaseContext } = req.body;
        const userId = req.user.id;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const currentSessionId = sessionId || uuidv4();

        // Save user message to DB
        try {
            await pool.query(
                `INSERT INTO chatbot_messages (session_id, user_id, role, content, disease_context)
                 VALUES ($1, $2, 'user', $3, $4)`,
                [currentSessionId, userId, message.trim(), diseaseContext || null]
            );
        } catch (dbErr) {
            console.error('[Chatbot] Failed to persist user message:', dbErr.message);
        }

        // Fetch conversation history for context (last 10 messages)
        let conversationHistory = [];
        try {
            const histResult = await pool.query(
                `SELECT role, content FROM chatbot_messages
                 WHERE session_id = $1 AND user_id = $2
                 ORDER BY created_at DESC LIMIT 10`,
                [currentSessionId, userId]
            );
            // Reverse to chronological order, exclude the current message
            conversationHistory = histResult.rows.reverse().slice(0, -1);
        } catch (dbErr) {
            console.error('[Chatbot] Failed to fetch history:', dbErr.message);
        }

        // Call Gemini directly
        let reply = 'I am temporarily unable to process your request. Please try again in a moment.';

        try {
            const ai = getGenAI();
            if (!ai) {
                reply = 'AI chat is not configured. Please contact support.';
            } else {
                const model = ai.getGenerativeModel({
                    model: CHAT_MODEL,
                    systemInstruction: buildSystemInstruction(diseaseContext),
                });

                // Build history in Gemini format
                const geminiHistory = conversationHistory.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }],
                }));

                const chat = model.startChat({ history: geminiHistory });
                const result = await chat.sendMessage(message.trim());
                reply = result.response.text();
            }
        } catch (aiErr) {
            console.error('[Chatbot] Gemini API error:', aiErr.message);
            // Don't expose raw errors to client
        }

        // Save assistant reply to DB
        try {
            await pool.query(
                `INSERT INTO chatbot_messages (session_id, user_id, role, content, disease_context)
                 VALUES ($1, $2, 'assistant', $3, $4)`,
                [currentSessionId, userId, reply, diseaseContext || null]
            );
        } catch (dbErr) {
            console.error('[Chatbot] Failed to persist assistant reply:', dbErr.message);
        }

        return res.json({ reply, sessionId: currentSessionId });

    } catch (error) {
        console.error('[Chatbot] Route error:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
});

// ----------------------------------------------------------------
// GET /api/chatbot/history/:sessionId
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
        console.error('[Chatbot] History error:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// ----------------------------------------------------------------
// GET /api/chatbot/sessions
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
        console.error('[Chatbot] Sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Legacy compatibility
router.post('/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    try {
        const ai = getGenAI();
        if (!ai) return res.json({ reply: 'AI chat not configured.' });

        const model = ai.getGenerativeModel({ model: CHAT_MODEL, systemInstruction: buildSystemInstruction(null) });
        const result = await model.generateContent(message);
        res.json({ reply: result.response.text() });
    } catch (err) {
        console.error('[Chatbot] Legacy chat error:', err.message);
        res.json({ reply: 'I am temporarily unable to respond. Please try again.' });
    }
});

module.exports = router;
