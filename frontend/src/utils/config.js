// Base environment and network configurations for FamilySphere

export const IS_CAPACITOR =
  window.location.protocol === 'capacitor:' ||
  window.location.protocol === 'file:' ||
  (window.location.hostname === 'localhost' && !window.location.port);

// Set this to your PC's LAN IP when building the Android APK.
export const BACKEND_LAN_IP = import.meta.env.VITE_BACKEND_LAN_IP || '10.55.22.92';
export const BACKEND_PORT = '5000';

export const IS_PROD_BUILD = import.meta.env.PROD;

export const BACKEND_BASE =
  window.location.hostname.includes('onrender.com') || 
  window.location.hostname.includes('vercel.app') || 
  (IS_CAPACITOR && IS_PROD_BUILD)
    ? 'https://familysphere-uf95.onrender.com'
    : IS_CAPACITOR
      ? `http://${BACKEND_LAN_IP}:${BACKEND_PORT}`
      : `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;

// API_BASE: use relative path on web (Vite proxy handles it), direct URL on Android
export const API_BASE =
  window.location.hostname.includes('vercel.app')
    ? '/api'
    : window.location.hostname.includes('onrender.com') || 
      (IS_CAPACITOR && IS_PROD_BUILD)
        ? 'https://familysphere-uf95.onrender.com/api'
        : IS_CAPACITOR
          ? `${BACKEND_BASE}/api`
          : '/api';

export const SOCKET_BASE = BACKEND_BASE;

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return window.location.hostname.includes('onrender.com') || 
         window.location.hostname.includes('vercel.app') || 
         IS_CAPACITOR
    ? `${BACKEND_BASE}${url}`
    : url;
};
