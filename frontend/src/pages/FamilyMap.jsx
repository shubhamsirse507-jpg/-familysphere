import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useAuth from '../hooks/useAuth.js';
import useSocket from '../hooks/useSocket.js';
import { API_BASE } from '../utils/config.js';

// Resolve Leaflet default marker icons issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper to create HTML circular avatar marker
const createAvatarIcon = (userPhoto, userName, role, isOld) => {
  const ringColor = {
    Parent: '#3b82f6', // blue
    Child: '#22c55e',  // green
    Guardian: '#a855f7', // purple
    Admin: '#a855f7' // purple
  }[role] || '#6b7280'; // gray

  const initials = userName ? userName.substring(0, 2).toUpperCase() : '?';
  const filterStyle = isOld ? 'filter: grayscale(1); opacity: 0.65;' : '';

  const html = `
    <div style="
      position: relative;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 3px solid ${ringColor};
      background: #fff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      ${filterStyle}
    ">
      ${userPhoto 
        ? `<img src="${userPhoto}" style="width: 100%; height: 100%; object-fit: cover;" />`
        : `<span style="font-weight: 800; font-size: 13px; color: ${ringColor}; font-family: Outfit;">${initials}</span>`
      }
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-avatar-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -21]
  });
};

export default function FamilyMap() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [locations, setLocations] = useState([]);
  const [sharing, setSharing] = useState(user?.locationSharing || false);
  const [loading, setLoading] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({}); // userId -> Leaflet marker instance
  const accuracyCircleRef = useRef(null); // accuracy circle for current user
  const watchIdRef = useRef(null);
  const lastUploadTimeRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  // 1. Fetch live family locations
  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/location/family`);
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (err) {
      console.error('Failed to fetch family locations:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Start geolocation watch tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    if (watchIdRef.current) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();

        // Throttled: update every 30s minimum
        if (now - lastUploadTimeRef.current >= 30000 || lastUploadTimeRef.current === 0) {
          try {
            const res = await fetch(`${API_BASE}/location/update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude, longitude })
            });
            if (res.ok) {
              lastUploadTimeRef.current = now;
              setSharing(true);
            }
          } catch (err) {
            console.error('Error sending geolocation to backend:', err);
          }
        }

        // Draw current user accuracy circle on map
        if (mapInstanceRef.current) {
          if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng([latitude, longitude]);
            accuracyCircleRef.current.setRadius(accuracy);
          } else {
            accuracyCircleRef.current = L.circle([latitude, longitude], {
              radius: accuracy,
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
              weight: 1
            }).addTo(mapInstanceRef.current);
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  };

  // 3. Stop geolocation watch tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (accuracyCircleRef.current && mapInstanceRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }
  };

  // 4. Toggle sharing status
  const handleToggleSharing = async () => {
    const targetSharing = !sharing;
    try {
      const res = await fetch(`${API_BASE}/location/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharing: targetSharing })
      });
      if (res.ok) {
        setSharing(targetSharing);
        if (targetSharing) {
          startTracking();
        } else {
          stopTracking();
          // Remove current user's marker locally
          if (markersRef.current[user.id] && mapInstanceRef.current) {
            markersRef.current[user.id].remove();
            delete markersRef.current[user.id];
          }
          setLocations(prev => prev.filter(m => m.id !== user.id));
        }
      }
    } catch (err) {
      console.error('Failed to toggle location sharing:', err);
    }
  };

  // Setup leaflet map instance on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 5);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Initial fetch of family locations
    fetchLocations();

    // Auto start tracking if user sharing state is initially true
    if (sharing) {
      startTracking();
    }

    return () => {
      stopTracking();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync locations state with Leaflet Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Create or update markers
    locations.forEach((member) => {
      if (member.latitude === null || member.longitude === null) return;

      const timeDiff = Date.now() - new Date(member.locationUpdatedAt).getTime();
      const isOld = timeDiff > 3600000; // Older than 1 hour

      const minutesAgo = Math.floor(timeDiff / 60000);
      let timeText = '';
      if (minutesAgo < 1) timeText = 'just now';
      else if (minutesAgo < 60) timeText = `${minutesAgo}m ago`;
      else {
        const hoursAgo = Math.floor(minutesAgo / 60);
        timeText = `${hoursAgo}h ago`;
      }
      const label = minutesAgo >= 60 ? `Last seen ${timeText}` : `Updated ${timeText}`;

      const popupHtml = `
        <div style="font-family: Outfit; padding: 4px;">
          <strong style="font-size: 13px; color: var(--text-primary);">${member.name}</strong>
          <div style="font-size: 10px; color: #6366f1; font-weight: 700; margin-top: 1px;">${member.role}</div>
          <div style="font-size: 10px; color: var(--text-secondary); margin-top: 4px; font-weight: 500;">${label}</div>
        </div>
      `;

      const customIcon = createAvatarIcon(member.profilePhoto, member.name, member.role, isOld);

      if (markersRef.current[member.id]) {
        // Move marker
        markersRef.current[member.id].setLatLng([member.latitude, member.longitude]);
        markersRef.current[member.id].setIcon(customIcon);
        markersRef.current[member.id].getPopup().setContent(popupHtml);
      } else {
        // Add new marker
        const marker = L.marker([member.latitude, member.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupHtml);
        markersRef.current[member.id] = marker;
      }
    });

    // 2. Remove deleted / untracked markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!locations.some(m => m.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // 3. Auto fit bounds on initial load of markers
    if (locations.length > 0 && isInitialLoadRef.current) {
      const validPoints = locations
        .filter(m => m.latitude !== null && m.longitude !== null)
        .map(m => [m.latitude, m.longitude]);

      if (validPoints.length > 0) {
        map.fitBounds(validPoints, { padding: [50, 50], maxZoom: 15 });
        isInitialLoadRef.current = false;
      }
    }
  }, [locations]);

  // Real-time socket listeners for updates
  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdated = (data) => {
      setLocations(prev => {
        const index = prev.findIndex(m => m.id === data.userId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data, id: data.userId };
          return updated;
        } else {
          return [...prev, { ...data, id: data.userId }];
        }
      });
    };

    const handleLocationStopped = (data) => {
      setLocations(prev => prev.filter(m => m.id !== data.userId));
    };

    const handleLocationStarted = () => {
      fetchLocations();
    };

    socket.on('location:updated', handleLocationUpdated);
    socket.on('location:stopped', handleLocationStopped);
    socket.on('location:started', handleLocationStarted);

    return () => {
      socket.off('location:updated', handleLocationUpdated);
      socket.off('location:stopped', handleLocationStopped);
      socket.off('location:started', handleLocationStarted);
    };
  }, [socket]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}>
      
      {/* 📍 Privacy notice banner */}
      {sharing && (
        <div style={{
          position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30, 41, 59, 0.92)', color: '#fff', padding: '10px 16px',
          borderRadius: '24px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)', fontSize: '11px', fontWeight: '600',
          backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)',
          width: '90%', maxWidth: '420px', justifyContent: 'center'
        }}>
          <span>📍 Your location is shared with family members only</span>
        </div>
      )}

      {/* Map display */}
      <div ref={mapContainerRef} style={{ flex: 1, height: '100%', width: '100%', zIndex: 1 }} />

      {/* Geolocation Controls Overlay (Top Right) */}
      <div style={{
        position: 'absolute', top: '12px', right: '12px', zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end'
      }}>
        <button
          onClick={handleToggleSharing}
          style={{
            padding: '10px 18px', borderRadius: '20px', border: 'none',
            background: sharing ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#22c55e,#16a34a)',
            color: '#fff', fontWeight: '800', fontSize: '12px', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.2s',
            fontFamily: 'Outfit'
          }}
        >
          {sharing ? '✕ Stop Sharing Location' : '✓ Share My Location'}
        </button>

        {/* Info Box */}
        <div style={{
          background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: '16px',
          border: '1px solid var(--border-glass)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxWidth: '220px', display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>ℹ️ Location Settings</span>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
            Location sharing is opt-in. Turn off anytime from this screen.
          </p>
        </div>
      </div>
    </div>
  );
}
