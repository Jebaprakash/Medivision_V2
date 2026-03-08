/**
 * Hospital Routes — real-time hospital data from OpenStreetMap Overpass API.
 *
 * Design decision: Replaced static database query with live Overpass API integration.
 * The controller handles validation, the service handles API calls and caching.
 */
const express = require('express');
const { getHospitals } = require('../controllers/hospitalController');

const router = express.Router();

// GET /api/hospitals?lat=12.97&lng=80.27&radius=5
router.get('/', getHospitals);

module.exports = router;
