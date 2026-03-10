import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon paths in React (Webpack/Vite issue)
// The default icons from leaflet don't play well out of the box.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// Create custom icons for User and Emergency Hospital
const userIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1004/1004313.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const emergencyIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Helper component to center map when user location changes
const ChangeView = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { animate: true, duration: 1.5 });
        }
    }, [center, zoom, map]);
    return null;
};

const HospitalMap = ({ userLocation, hospitals, isEmergency }) => {
    return (
        <div style={{ height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <MapContainer
                center={userLocation}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <ChangeView center={userLocation} zoom={13} />
                
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* User Location Marker */}
                <Marker position={userLocation} icon={userIcon}>
                    <Popup>
                        <strong>You are here</strong>
                    </Popup>
                </Marker>

                {/* Hospital Markers */}
                {hospitals.map(hospital => (
                    <Marker
                        key={hospital.id || hospital.name}
                        position={[hospital.latitude, hospital.longitude]}
                        icon={isEmergency && hospital.emergency ? emergencyIcon : new L.Icon.Default()}
                    >
                        <Popup>
                            <strong>{hospital.name}</strong><br />
                            {hospital.address ? (
                                <span style={{ fontSize: '0.85rem' }}>{hospital.address}<br /></span>
                            ) : ''}
                            {hospital.phone ? (
                                <span style={{ fontSize: '0.85rem' }}>📞 {hospital.phone}<br /></span>
                            ) : ''}
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                                🚗 {hospital.distance_km?.toFixed(1) || 'N/A'} km away
                            </span>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default HospitalMap;
