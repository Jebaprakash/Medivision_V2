/**
 * Authentication routes — register and login.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

// ----------------------------------------------------------------
// POST /api/auth/register
// ----------------------------------------------------------------
router.post(
    '/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: true, messages: errors.array().map((e) => e.msg) });
        }

        const { name, email, password } = req.body;

        try {
            // Check if user already exists
            const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: true, message: 'Email is already registered.' });
            }

            const passwordHash = await bcrypt.hash(password, 12);
            const result = await pool.query(
                'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
                [name, email, passwordHash]
            );

            const user = result.rows[0];
            const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
                expiresIn: '7d',
            });

            res.status(201).json({ user, token });
        } catch (err) {
            console.error('Register error:', err);
            res.status(500).json({ error: true, message: 'Registration failed. Please try again.' });
        }
    }
);

// ----------------------------------------------------------------
// POST /api/auth/login
// ----------------------------------------------------------------
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: true, messages: errors.array().map((e) => e.msg) });
        }

        const { email, password } = req.body;

        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: true, message: 'Invalid email or password.' });
            }

            const user = result.rows[0];
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                return res.status(401).json({ error: true, message: 'Invalid email or password.' });
            }

            const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
                expiresIn: '7d',
            });

            res.json({
                user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
                token,
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ error: true, message: 'Login failed. Please try again.' });
        }
    }
);

module.exports = router;
