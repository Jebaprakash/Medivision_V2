/**
 * Hospital Controller — handles HTTP request/response for hospital endpoints.
 * Delegates business logic to hospitalService.
 */
const { fetchNearbyHospitals, calculateDistance } = require('../services/hospitalService');

/**
 * GET /api/hospitals?lat=12.97&lng=80.27&radius=5
 *
 * Fetches real-time hospital data from the Overpass API (OpenStreetMap),
 * calculates distance from the user, and returns sorted results.
 *
 * radius is in km (converted to meters for Overpass).
 */
async function getHospitals(req, res, next) {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const radiusKm = parseFloat(req.query.radius) || 5;

        // Validate coordinates
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({
                error: true,
                message: 'Valid lat (-90 to 90) and lng (-180 to 180) query parameters are required',
            });
        }

        // Convert km to meters for the Overpass API
        const radiusMeters = Math.min(radiusKm * 1000, 50000); // cap at 50km for Overpass

        // Fetch from Overpass API (real-time)
        const rawHospitals = await fetchNearbyHospitals(lat, lng, radiusMeters);

        // Calculate distance from user and sort
        const hospitals = rawHospitals.map(h => ({
            id: h.osm_id,
            name: h.name,
            latitude: h.latitude,
            longitude: h.longitude,
            address: h.address,
            phone: h.phone,
            website: h.website,
            emergency: h.emergency,
            operator: h.operator,
            distance_km: calculateDistance(lat, lng, h.latitude, h.longitude),
        }))
        .sort((a, b) => a.distance_km - b.distance_km);

        res.json({
            hospitals,
            meta: {
                total: hospitals.length,
                userLocation: { lat, lng },
                radiusKm,
                source: 'openstreetmap-overpass',
            },
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { getHospitals };
