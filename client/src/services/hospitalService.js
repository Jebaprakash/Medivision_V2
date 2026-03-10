import api from './api';

/**
 * Fetch hospitals from the Node.js backend.
 * The backend proxies to the Overpass API to get live data.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Radius in km
 * @returns {Promise<Array>} - List of hospitals
 */
export const fetchLiveHospitals = async (lat, lng, radius) => {
    try {
        const response = await api.get('/hospitals', {
            params: { lat, lng, radius }
        });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch live hospitals:', error);
        throw error;
    }
};

/**
 * Haversine formula to calculate the straight-line distance in km
 * between two coordinates.
 *
 * (Note: the backend also computes this, but we provide it here
 * as a robust utility to fulfill the frontend Haversine requirement)
 *
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Earth radius in km

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};
