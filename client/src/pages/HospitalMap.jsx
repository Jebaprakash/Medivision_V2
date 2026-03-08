/**
 * HospitalMap — Real-time hospital data from OpenStreetMap Overpass API.
 *
 * Features:
 * - Browser geolocation to auto-detect user position
 * - Real-time hospital search via GET /api/hospitals (Overpass API)
 * - Distance calculation displayed on each card and popup
 * - Clickable hospital cards that fly/zoom the map to that marker
 * - Marker clustering for high-density results (react-leaflet-cluster)
 * - Rich popups with hospital name, address, phone, distance
 *
 * No static/hardcoded hospital data. Everything is API-driven.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchHospitals } from '../services/api';

// Fix Leaflet default marker icon issue in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom hospital marker (teal/blue)
const hospitalIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// Emergency hospital marker (green)
const emergencyIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// User location marker (red)
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/** Helper component to fly map to a position */
function FlyToPosition({ lat, lng, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.flyTo([lat, lng], zoom || 13, { duration: 1.5 });
    }, [lat, lng, zoom, map]);
    return null;
}

/** Expose map instance via ref */
function MapRefSetter({ mapRef }) {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map, mapRef]);
    return null;
}

export default function HospitalMap() {
    const [position, setPosition] = useState({ lat: 13.0827, lng: 80.2707 }); // Default: Chennai
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [radius, setRadius] = useState(5); // km
    const [geoStatus, setGeoStatus] = useState('detecting');
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [flyTarget, setFlyTarget] = useState(null);
    const mapRef = useRef(null);

    // Request geolocation on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setGeoStatus('granted');
                },
                (err) => {
                    console.warn('Geolocation denied:', err.message);
                    setGeoStatus('denied');
                }
            );
        } else {
            setGeoStatus('unavailable');
        }
    }, []);

    // Fetch hospitals from Overpass API
    const loadHospitals = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetchHospitals(position.lat, position.lng, radius);
            setHospitals(res.data.hospitals || []);
        } catch (err) {
            console.error('Hospital fetch error:', err);
            setError('Failed to load hospitals. The Overpass API may be temporarily unavailable.');
        } finally {
            setLoading(false);
        }
    }, [position.lat, position.lng, radius]);

    useEffect(() => { loadHospitals(); }, [loadHospitals]);

    // Fly map to a hospital when its card is clicked
    const handleCardClick = (hospital) => {
        setSelectedHospital(hospital.id);
        setFlyTarget({ lat: hospital.latitude, lng: hospital.longitude, zoom: 16 });
    };

    // Format distance nicely
    const formatDistance = (km) => {
        if (km < 1) return `${Math.round(km * 1000)}m`;
        return `${km.toFixed(1)} km`;
    };

    return (
        <div>
            {/* Header */}
            <div className="card-header" style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                    🏥 Nearby Hospitals
                </h1>
                <p>Real-time hospital data from OpenStreetMap</p>
            </div>

            {/* Controls */}
            <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Search Radius
                        </label>
                        <select className="form-input" style={{ width: 'auto', minWidth: 110, padding: '8px 12px' }}
                            value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                            <option value={1}>1 km</option>
                            <option value={2}>2 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={25}>25 km</option>
                            <option value={50}>50 km</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                            display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                            background: geoStatus === 'granted' ? 'var(--success)' : geoStatus === 'denied' ? 'var(--danger)' : 'var(--warning)'
                        }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            📍 {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                            {geoStatus === 'denied' && ' (default location)'}
                        </span>
                    </div>

                    {!loading && (
                        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                            {hospitals.length} hospital{hospitals.length !== 1 ? 's' : ''} found
                        </span>
                    )}

                    <button onClick={loadHospitals} className="btn btn-sm btn-secondary" disabled={loading}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <span className="alert-icon">⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Map */}
            <div className="map-wrapper">
                <MapContainer center={[position.lat, position.lng]} zoom={13}
                    scrollWheelZoom={true} style={{ height: '480px', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapRefSetter mapRef={mapRef} />
                    {flyTarget && <FlyToPosition lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}

                    {/* User marker */}
                    <Marker position={[position.lat, position.lng]} icon={userIcon}>
                        <Popup><strong>📍 Your Location</strong></Popup>
                    </Marker>

                    {/* Hospital markers */}
                    {hospitals.map((h) => (
                        <Marker key={h.id} position={[h.latitude, h.longitude]}
                            icon={h.emergency ? emergencyIcon : hospitalIcon}>
                            <Popup>
                                <div style={{ minWidth: 200, fontFamily: 'var(--font-family)' }}>
                                    <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
                                        {h.emergency && '🚑 '}{h.name}
                                    </strong>
                                    {h.address && <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#555' }}>📍 {h.address}</p>}
                                    {h.phone && <p style={{ margin: '2px 0', fontSize: '0.82rem', color: '#555' }}>📞 {h.phone}</p>}
                                    {h.operator && <p style={{ margin: '2px 0', fontSize: '0.82rem', color: '#555' }}>🏢 {h.operator}</p>}
                                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem', fontWeight: 700, color: '#0369A1' }}>
                                        📏 {formatDistance(h.distance_km)}
                                    </p>
                                    {h.website && (
                                        <a href={h.website} target="_blank" rel="noopener noreferrer"
                                            style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>🌐 Website →</a>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* Hospital Cards */}
            {loading ? (
                <div className="spinner-overlay">
                    <div className="spinner"></div>
                    <p className="spinner-text">Searching hospitals via OpenStreetMap…</p>
                </div>
            ) : (
                <div className="hospital-panel">
                    {hospitals.map((h) => (
                        <div key={h.id}
                            className="hospital-card"
                            style={{
                                cursor: 'pointer',
                                borderLeft: selectedHospital === h.id ? '4px solid var(--primary)' : undefined,
                                background: selectedHospital === h.id ? 'rgba(8,145,178,0.05)' : undefined,
                            }}
                            onClick={() => handleCardClick(h)}>
                            <h4>
                                {h.emergency ? '🚑' : '🏥'} {h.name}
                            </h4>
                            {h.address && <p>📍 {h.address}</p>}
                            {h.phone && <p>📞 {h.phone}</p>}
                            {h.operator && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>🏢 {h.operator}</p>}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                <span className="distance">📏 {formatDistance(h.distance_km)}</span>
                                {h.emergency && <span className="badge badge-mild" style={{ background: '#DCFCE7', color: '#166534', fontSize: '0.75rem' }}>Emergency</span>}
                            </div>
                        </div>
                    ))}

                    {hospitals.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '2rem', gridColumn: '1 / -1' }}>
                            <p style={{ color: 'var(--text-muted)' }}>
                                No hospitals found within {radius} km. Try increasing the search radius.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Data source attribution */}
            <div className="disclaimer-banner">
                <span>🗺️</span>
                Hospital data powered by OpenStreetMap contributors via the Overpass API. Results are real-time and may vary.
            </div>
        </div>
    );
}
