/**
 * MediVision AI V3 — Node.js API Gateway
 * Clean architecture with controllers/services/database pattern.
 * Includes Morgan request logging and centralized error handling.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const diagnoseRoutes = require('./routes/diagnose');
const hospitalRoutes = require('./routes/hospitals');
const historyRoutes = require('./routes/history');
const chatbotRoutes = require('./routes/chatbot');
const progressRoutes = require('./routes/progress');
const reminderRoutes = require('./routes/reminders');
const doctorRoutes = require('./routes/doctors');
const { initReminderCron } = require('./reminder-worker');
const { initSignalingServer } = require('./signaling');

const app = express();
const PORT = process.env.NODE_PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging (Morgan) — concise dev format
app.use(morgan(':method :url :status :response-time ms'));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --------------- Routes ---------------
app.use('/api/auth', authRoutes);
app.use('/api/diagnose', diagnoseRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/doctors', doctorRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'medivision-gateway-v3',
    timestamp: new Date().toISOString(),
    architecture: 'controllers/services/database',
  });
});

// --------------- Centralized Error Handler ---------------
// All errors flow here via next(error) in controllers
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  console.error(`[ERROR] ${req.method} ${req.path} → ${status}: ${message}`);
  if (status === 500) console.error(err.stack);

  res.status(status).json({
    error: true,
    message: status === 500 ? 'Internal server error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// --------------- Start ---------------
server.listen(PORT, () => {
  console.log(`✅ MediVision API Gateway V3 running on http://localhost:${PORT}`);
  console.log(`📁 Architecture: controllers → services → database`);
  console.log(`🗺️  Hospitals: Real-time via Overpass API (OpenStreetMap)`);
  console.log(`👨‍⚕️ Doctors: Database-driven with pagination`);

  // Initialize WebRTC signaling server
  initSignalingServer(server);

  // Start background workers
  initReminderCron();
});
