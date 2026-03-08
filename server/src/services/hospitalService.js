/**
 * Overpass API Service — fetches real-time hospital data from OpenStreetMap.
 *
 * Uses the Overpass QL endpoint to query nodes tagged amenity=hospital
 * within a radius (in meters) of the given coordinates.
 *
 * Design Decision: Querying the Overpass API directly gives us real-time
 * hospital data without maintaining a static database. We add a simple
 * in-memory TTL cache to avoid hitting the public API too aggressively.
 */
const axios = require('axios');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Simple in-memory cache: key → { data, expiry }
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Query the Overpass API for hospitals near a coordinate.
 *
 * @param {number} lat  - Latitude
 * @param {number} lng  - Longitude
 * @param {number} radiusMeters - Search radius in meters (default 5000)
 * @returns {Promise<Array<{name, lat, lng, address, phone, osm_id}>>}
 */
async function fetchNearbyHospitals(lat, lng, radiusMeters = 5000) {
    // Round coords to 3 decimals for cache key (≈ 111m precision)
    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusMeters}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
        console.log(`[Overpass] Cache HIT for ${cacheKey}`);
        return cached.data;
    }

    // Overpass QL: find hospital nodes/ways within radius
    const query = `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:${radiusMeters}, ${lat}, ${lng});
          way["amenity"="hospital"](around:${radiusMeters}, ${lat}, ${lng});
          relation["amenity"="hospital"](around:${radiusMeters}, ${lat}, ${lng});
        );
        out center;
    `;

    console.log(`[Overpass] Querying hospitals around (${lat}, ${lng}), radius=${radiusMeters}m`);

    try {
        const response = await axios.post(
            OVERPASS_URL,
            `data=${encodeURIComponent(query)}`,
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 30000,
            }
        );

        const elements = response.data.elements || [];

        const hospitals = elements.map((el, index) => {
            // For ways/relations, lat/lng comes from the `center` field
            const latitude = el.lat || el.center?.lat;
            const longitude = el.lon || el.center?.lon;

            if (!latitude || !longitude) return null;

            const tags = el.tags || {};
            return {
                osm_id: el.id,
                name: tags.name || tags['name:en'] || `Hospital #${index + 1}`,
                latitude,
                longitude,
                address: buildAddress(tags),
                phone: tags.phone || tags['contact:phone'] || null,
                website: tags.website || tags['contact:website'] || null,
                emergency: tags.emergency === 'yes',
                operator: tags.operator || null,
            };
        }).filter(Boolean);

        console.log(`[Overpass] Found ${hospitals.length} hospitals`);

        // Store in cache
        cache.set(cacheKey, { data: hospitals, expiry: Date.now() + CACHE_TTL_MS });

        return hospitals;
    } catch (error) {
        console.error('[Overpass] API error:', error.message);

        // If Overpass fails, return cached data even if stale
        if (cached) {
            console.log('[Overpass] Returning stale cache as fallback');
            return cached.data;
        }

        throw new Error('Failed to fetch hospital data from OpenStreetMap');
    }
}

/**
 * Build a readable address from OSM tags.
 */
function buildAddress(tags) {
    const parts = [];
    if (tags['addr:street'])      parts.push(tags['addr:street']);
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:suburb'])      parts.push(tags['addr:suburb']);
    if (tags['addr:city'])        parts.push(tags['addr:city']);
    if (tags['addr:postcode'])    parts.push(tags['addr:postcode']);
    if (tags['addr:state'])       parts.push(tags['addr:state']);

    // Fall back to the full addr tag or empty string
    return parts.length > 0 ? parts.join(', ') : (tags['addr:full'] || '');
}

/**
 * Haversine distance between two coordinates (in km).
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

module.exports = {
    fetchNearbyHospitals,
    calculateDistance,
};
