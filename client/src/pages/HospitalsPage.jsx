import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchLiveHospitals } from '../services/hospitalService';
import HospitalMap from '../components/HospitalMap';
import HospitalList from '../components/HospitalList';

// Configuration: Default location if GPS fails/denied (e.g. Chennai city center per Medivision v2 schema)
const DEFAULT_LOCATION = [13.0827, 80.2707];

const HospitalsPage = () => {
    // Geolocation and map state
    const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
    const [locationStatus, setLocationStatus] = useState('Detecting location...');
    const [hospitals, setHospitals] = useState([]);
    const [radius, setRadius] = useState(5); // 5km radius default
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Grab emergency state pushed via React Router's state object
    // (e.g. navigate('/hospitals', { state: { emergency: true } }))
    const routeState = useLocation().state;
    const isEmergency = routeState?.emergency || false;

    // Detect User Location on mount
    useEffect(() => {
        detectUserLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch hospitals whenever radius or userLocation changes (and location has been established)
    useEffect(() => {
        if (!loading && locationStatus !== 'Detecting location...') {
            loadHospitals(userLocation.lat, userLocation.lng, radius);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [radius]);

    const detectUserLocation = () => {
        setLoading(true);
        setLocationStatus('Requesting GPS permission...');
        setError(null);

        if (!navigator.geolocation) {
            handleLocationFallback('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                // Explicitly log exactly as requested
                console.log("User location:", latitude, longitude);

                setUserLocation({ lat: latitude, lng: longitude });
                setLocationStatus('Location found! Fetching nearby hospitals...');
                loadHospitals(latitude, longitude, radius);
            },
            (err) => {
                console.error("Location error:", err);
                alert("Please allow location access to see real-time hospitals near you.");
                
                let errorMsg = 'Failed to fetch location.';
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        errorMsg = 'Location permission was denied. Using default city location.';
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMsg = 'Location information is unavailable.';
                        break;
                    case err.TIMEOUT:
                        errorMsg = 'Location request timed out.';
                        break;
                    default:
                        break;
                }
                handleLocationFallback(errorMsg);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleLocationFallback = (errorMsg) => {
        console.warn('Fallback triggered:', errorMsg);
        setError(errorMsg);
        setUserLocation({ lat: DEFAULT_LOCATION[0], lng: DEFAULT_LOCATION[1] });
        setLocationStatus('Using default location (Chennai).');
        loadHospitals(DEFAULT_LOCATION[0], DEFAULT_LOCATION[1], radius);
    };

    const loadHospitals = async (lat, lng, rad) => {
        try {
            setLoading(true);
            const data = await fetchLiveHospitals(lat, lng, rad);
            setHospitals(data.hospitals || []);
            setLoading(false);
            setLocationStatus('Live updates enabled.');
        } catch (err) {
            console.error('API Fetch error:', err);
            setError('Failed to load live hospital data from OpenStreetMap. Please try again later.');
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
            
            {/* Header section */}
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    🏥 Find Hospitals
                </h1>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                    Discover nearby medical facilities powered by OpenStreetMap Overpass.
                </p>
                {isEmergency && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem 1.5rem',
                        background: 'rgba(220, 38, 38, 0.1)',
                        border: '1px solid var(--danger)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--danger)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>🚨</span>
                        Possible serious condition detected. Please consult a doctor immediately at any of these facilities.
                    </div>
                )}
            </header>

            {/* Quick Actions & Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                        onClick={() => detectUserLocation()} 
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        📍 Refresh Location
                    </button>
                    
                    <div>
                        <label htmlFor="radiusSelect" style={{ marginRight: '0.5rem', fontWeight: 600 }}>Radius:</label>
                        <select 
                            id="radiusSelect" 
                            className="form-control" 
                            value={radius} 
                            onChange={(e) => setRadius(Number(e.target.value))} 
                            disabled={loading}
                            style={{ display: 'inline-block', width: 'auto' }}
                        >
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={25}>25 km</option>
                        </select>
                    </div>
                </div>

                <div style={{
                    color: 'var(--text-secondary)',
                    fontWeight: 500
                }}>
                    {loading ? (
                        <span>{locationStatus}</span>
                    ) : (
                        <span>Found <strong>{hospitals.length}</strong> hospital{hospitals.length === 1 ? '' : 's'} nearby</span>
                    )}
                </div>
            </div>

            {error && !loading && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid var(--warning)',
                    color: '#B45309',
                    borderRadius: 'var(--radius-md)'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Main Content Area */}
            {loading ? (
                <div className="spinner-overlay" style={{ minHeight: '400px', background: 'transparent' }}>
                    <div className="spinner"></div>
                    <p className="spinner-text">Fetching live data over the network...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 4fr)', gap: '2rem', alignItems: 'flex-start' }}>
                    
                    {/* Interactive Map */}
                    <div style={{ position: 'sticky', top: '2rem' }}>
                        <HospitalMap 
                            userLocation={[userLocation.lat, userLocation.lng]} 
                            hospitals={hospitals} 
                            isEmergency={isEmergency}
                        />
                    </div>

                    {/* Data List */}
                    <div style={{ overflowY: 'auto', maxHeight: '600px', paddingRight: '0.5rem' }}>
                        <HospitalList 
                            hospitals={hospitals} 
                            isEmergency={isEmergency} 
                        />
                    </div>
                </div>
            )}

        </div>
    );
};

export default HospitalsPage;
