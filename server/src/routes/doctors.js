/**
 * Doctor Routes — database-driven directory with pagination, filtering, and booking.
 *
 * Design: Thin routes delegate to doctorController, which delegates to doctorService.
 * All data comes from PostgreSQL — no hardcoded arrays.
 */
const express = require('express');
const authMiddleware = require('../middleware/auth');
const doctorCtrl = require('../controllers/doctorController');

const router = express.Router();

// Public endpoints (no auth required for browsing)
router.get('/',                doctorCtrl.listDoctors);
router.get('/specializations', doctorCtrl.listSpecializations);
router.get('/cities',          doctorCtrl.listCities);
router.get('/:id',             doctorCtrl.getDoctorById);

// Protected endpoints (require login)
router.post('/consultations/book',         authMiddleware, doctorCtrl.bookConsultation);
router.get('/consultations/user',          authMiddleware, doctorCtrl.getUserConsultations);
router.patch('/consultations/:id/status',  authMiddleware, doctorCtrl.updateConsultationStatus);

module.exports = router;
