import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';

export default function AuthScreen() {
  const {
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
    handleAuthSubmit
  } = useAuth();

  return (
    <div className="auth-fullscreen-bg" style={{
      height: '100vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      fontFamily: 'Inter, sans-serif',
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '24px',
        padding: '40px 32px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        border: '1px solid var(--border-glass)',
        margin: 'auto'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            overflow: 'hidden',
            marginBottom: '16px',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.8)'
          }}>
            <img 
              src="/logo.png" 
              alt="FamilySphere Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.35)' }} 
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.style.display = 'none'; 
                e.target.parentNode.style.background = 'var(--gradient-premium)'; 
                e.target.parentNode.style.display = 'flex'; 
                e.target.parentNode.style.alignItems = 'center'; 
                e.target.parentNode.style.justifyContent = 'center'; 
                e.target.parentNode.innerHTML = '<span style="color:#fff;font-weight:800;font-size:24px">F</span>'; 
              }} 
            />
          </div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', color: '#1e293b', fontWeight: '800' }}>FamilySphere</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Secure AI-Powered Family Communications</p>
        </div>

        <form onSubmit={handleAuthSubmit}>
          {twoFARequired ? (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Two-Factor Security Code</label>
              <input 
                type="text" 
                placeholder="Enter 6-digit TOTP code" 
                maxLength={6}
                className="input-field" 
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b', textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: '700' }}
                value={login2FACode} 
                onChange={e => setLogin2FACode(e.target.value.replace(/\D/g, ''))} 
                required 
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setTwoFARequired(false);
                  setLogin2FACode('');
                  setAuthError('');
                }}
                style={{ marginTop: '8px', color: '#6366f1', background: 'transparent', border: 'none', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
              >
                ← Back to standard login
              </button>
            </div>
          ) : (
            <>
              {authMode === 'signup' && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Samiksha" 
                      className="input-field" 
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b' }}
                      value={authForm.name} 
                      onChange={e => setAuthForm({ ...authForm, name: e.target.value })} 
                      required 
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                    <input 
                      type="text" 
                      placeholder="+1234567890" 
                      className="input-field" 
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b' }}
                      value={authForm.phone} 
                      onChange={e => setAuthForm({ ...authForm, phone: e.target.value })} 
                      required 
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Family Role</label>
                    <select 
                      className="input-field" 
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b' }}
                      value={authForm.role}
                      onChange={e => setAuthForm({ ...authForm, role: e.target.value })}
                    >
                      <option value="Parent">Parent</option>
                      <option value="Child">Child</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Profile Photo URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..." 
                      className="input-field" 
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b' }}
                      value={authForm.profilePhoto} 
                      onChange={e => setAuthForm({ ...authForm, profilePhoto: e.target.value })} 
                    />
                  </div>
                </>
              )}

              {authMode === 'login' ? (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Username or Email</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Samiksha" 
                    className="input-field" 
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b' }}
                    value={authForm.name} 
                    onChange={e => setAuthForm({ ...authForm, name: e.target.value })} 
                    required 
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="samiksha@family.com" 
                    className="input-field" 
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b' }}
                    value={authForm.email} 
                    onChange={e => setAuthForm({ ...authForm, email: e.target.value })} 
                    required 
                  />
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="input-field" 
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b' }}
                  value={authForm.password} 
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })} 
                  required 
                />
              </div>
            </>
          )}

          {authError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '13px', marginBottom: '16px', background: '#fee2e2', padding: '12px', borderRadius: '12px' }}>
              <ShieldAlert size={18} />
              <span>{authError}</span>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', borderRadius: '14px' }}>
            {twoFARequired ? 'Verify & Login' : authMode === 'login' ? 'Sign In to FamilySphere' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            {authMode === 'login' ? "New to the family? " : "Already have an account? "}
          </span>
          <button 
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'signup' : 'login');
              setAuthError('');
              setAuthForm({ name: '', phone: '', email: '', password: '', role: 'Parent', profilePhoto: '' });
            }} 
            style={{ fontWeight: '600', color: '#6366f1', fontSize: '13px' }}
          >
            {authMode === 'login' ? 'Create a Family Profile' : 'Sign In'}
          </button>
        </div>
        
        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
          💡 <b>Tip:</b> Login with username <b>Samiksha</b> / <b>Samiksha@1978</b> &nbsp;|&nbsp; <b>Host</b> / <b>Host@1942</b>
        </div>
      </div>
    </div>
  );
}
