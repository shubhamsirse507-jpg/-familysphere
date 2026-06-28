import React, { createContext, useState, useEffect } from 'react';
import { API_BASE } from '../utils/config.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup'
  const [authForm, setAuthForm] = useState({
    name: '', phone: '', email: '', password: '', role: 'Parent', profilePhoto: ''
  });
  const [authError, setAuthError] = useState('');
  const [twoFARequired, setTwoFARequired] = useState(false);
  const [login2FACode, setLogin2FACode] = useState('');
  const [twoFATempData, setTwoFATempData] = useState(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`);
      if (res.ok) {
        const data = await res.json();
        if (data.token) { localStorage.setItem("socket_token", data.token); }
      setUser(data);
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'SESSION_REPLACED') {
          handleLogout('⚠️ You have been logged out because your account was signed in on another device.');
        } else {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleAuthSubmit = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? 'login' : 'signup';
    
    let requestBody;
    if (authMode === 'login') {
      requestBody = {
        username: authForm.name || (twoFATempData ? twoFATempData.username : ''),
        password: authForm.password || (twoFATempData ? twoFATempData.password : '')
      };
      if (twoFARequired) {
        requestBody.twoFactorCode = login2FACode;
      }
    } else {
      requestBody = authForm;
    }
    
    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        setAuthError('Server returned an invalid response. Please check your backend connection.');
        return;
      }
      
      if (!res.ok) {
        let errMsg = 'Authentication failed';
        if (data?.errors && Array.isArray(data.errors)) {
          errMsg = data.errors.map(err => err.msg).join(', ');
        } else if (typeof data?.error === 'string') {
          errMsg = data.error;
        } else if (typeof data?.message === 'string') {
          errMsg = data.message;
        } else if (typeof data?.error === 'object') {
          errMsg = JSON.stringify(data.error);
        }
        setAuthError(errMsg);
        return;
      }
      
      if (data.requires2FA) {
        setTwoFARequired(true);
        setTwoFATempData({ 
          username: authForm.name || (twoFATempData ? twoFATempData.username : ''), 
          password: authForm.password || (twoFATempData ? twoFATempData.password : '') 
        });
        return;
      }
      
      if (data.token) { localStorage.setItem("socket_token", data.token); }
      setUser(data);
      setTwoFARequired(false);
      setLogin2FACode('');
      setTwoFATempData(null);
    } catch (err) {
      setAuthError('Connection server error. Please make sure backend is running.');
    }
  };

  const handleLogout = async (reason) => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    setUser(null);
    setTwoFARequired(false);
    setLogin2FACode('');
    setTwoFATempData(null);
    if (reason) {
      setTimeout(() => alert(reason), 100);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      authMode,
      setAuthMode,
      authForm,
      setAuthForm,
      authError,
      setAuthError,
      twoFARequired,
      setTwoFARequired,
      login2FACode,
      setLogin2FACode,
      fetchProfile,
      handleAuthSubmit,
      handleLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
