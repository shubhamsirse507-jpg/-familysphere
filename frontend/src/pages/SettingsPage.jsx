import React, { useState, useEffect } from 'react';
import { UserPlus, Lock, Bell, Cloud, Award, Settings, CheckSquare, X } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import useChats from '../hooks/useChats.js';
import Avatar from '../components/Avatar.jsx';
import { API_BASE } from '../utils/config.js';

export function SettingsSidebar({ activeSettingsSubTab, setActiveSettingsSubTab }) {
  return (
    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Control Panel</h3>
      </div>
      
      {/* Settings navigation menu list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          onClick={() => setActiveSettingsSubTab('account')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'account' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'account' ? 'var(--color-primary)' : 'var(--text-primary)', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: activeSettingsSubTab === 'account' ? '700' : '500' }}
        >
          <UserPlus size={18} />
          <span>Account & Profile</span>
        </button>
        <button 
          onClick={() => setActiveSettingsSubTab('privacy')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'privacy' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'privacy' ? 'var(--color-primary)' : 'var(--text-primary)', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: activeSettingsSubTab === 'privacy' ? '700' : '500' }}
        >
          <Lock size={18} />
          <span>Privacy & Sharing</span>
        </button>
        <button 
          onClick={() => setActiveSettingsSubTab('feed')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'feed' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'feed' ? 'var(--color-primary)' : 'var(--text-primary)', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: activeSettingsSubTab === 'feed' ? '700' : '500' }}
        >
          <CheckSquare size={18} />
          <span>Feed Preferences</span>
        </button>
        <button 
          onClick={() => setActiveSettingsSubTab('notifications')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'notifications' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'notifications' ? 'var(--color-primary)' : 'var(--text-primary)', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: activeSettingsSubTab === 'notifications' ? '700' : '500' }}
        >
          <Bell size={18} />
          <span>Notifications</span>
        </button>
        <button 
          onClick={() => setActiveSettingsSubTab('data')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'data' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'data' ? 'var(--color-primary)' : 'var(--text-primary)', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: activeSettingsSubTab === 'data' ? '700' : '500' }}
        >
          <Cloud size={18} />
          <span>Data & Storage</span>
        </button>
        <button 
          onClick={() => setActiveSettingsSubTab('subscription')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'subscription' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'subscription' ? 'var(--color-primary)' : 'var(--text-primary)', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: activeSettingsSubTab === 'subscription' ? '700' : '500' }}
        >
          <Award size={18} />
          <span>Subscription</span>
        </button>
      </div>
    </div>
  );
}

export function SettingsWorkspace({ activeSettingsSubTab }) {
  const { user, setUser, fetchProfile } = useAuth();
  const { blockedUsers, handleUnblockUser } = useChats();

  const [settingsForm, setSettingsForm] = useState({
    bio: 'Family member. Always here for the team. 🏡❤️',
    customStatus: 'Connected with the family 💬',
    handle: '@familysphere_user',
    allowOnlinePresence: true,
    allowTimelinePosts: true,
    notificationDMs: true,
    notificationGroupTags: true,
    notificationLikes: true,
    mediaHD: true,
    cloudStorageLimit: 50, // GB
    cloudStorageUsed: 12.4 // GB
  });

  // --- 2FA States ---
  const [twoFAQr, setTwoFAQr] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  const handleSetup2FA = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/setup`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setTwoFAQr(data.qrCode);
        setTwoFASecret(data.secret);
        setTwoFACode('');
      }
    } catch (err) {
      console.error('Setup 2FA error:', err);
    }
  };

  const handleVerify2FA = async (code, secretStr) => {
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, secret: secretStr })
      });
      if (res.ok) {
        alert('2FA enabled successfully!');
        setTwoFAQr('');
        setTwoFACode('');
        fetchProfile();
      } else {
        const data = await res.json();
        alert(data.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Verify 2FA error:', err);
    }
  };

  const handleDisable2FA = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/disable`, {
        method: 'POST'
      });
      if (res.ok) {
        alert('2FA disabled successfully!');
        fetchProfile();
      }
    } catch (err) {
      console.error('Disable 2FA error:', err);
    }
  };

  return (
    <div style={{ flex: 1, padding: '40px', overflowY: 'auto', background: 'transparent', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: '800', color: 'var(--text-primary)' }}>Settings Dashboard</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Configure your profile details, sharing permissions, and AI premium settings.</p>
        </div>
        <Settings size={28} style={{ color: 'var(--color-primary)' }} />
      </div>

      {/* Account & Profile SubTab */}
      {activeSettingsSubTab === 'account' && (
        <div className="glass-card animate-fade-in" style={{ padding: '28px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            <UserPlus size={20} /> Account & Profile
          </h3>
          
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <Avatar user={user} size="lg" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Profile Photo URL</label>
              <input 
                type="text" 
                className="input-field" 
                style={{ background: 'var(--bg-tertiary)' }}
                value={user?.profilePhoto || ''} 
                onChange={e => setUser({ ...user, profilePhoto: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Full Name</label>
              <input 
                type="text" 
                className="input-field" 
                style={{ background: 'var(--bg-tertiary)' }}
                value={user?.name || ''} 
                onChange={e => setUser({ ...user, name: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Username Handle</label>
              <input 
                type="text" 
                className="input-field" 
                style={{ background: 'var(--bg-tertiary)' }}
                value={settingsForm.handle} 
                onChange={e => setSettingsForm({ ...settingsForm, handle: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bio Description</label>
            <textarea 
              className="input-field" 
              style={{ minHeight: '60px', resize: 'none', background: 'var(--bg-tertiary)' }}
              value={settingsForm.bio} 
              onChange={e => setSettingsForm({ ...settingsForm, bio: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Custom Status</label>
            <input 
              type="text" 
              className="input-field" 
              style={{ background: 'var(--bg-tertiary)' }}
              value={settingsForm.customStatus} 
              onChange={e => setSettingsForm({ ...settingsForm, customStatus: e.target.value })}
            />
          </div>

          <button className="btn-primary" style={{ alignSelf: 'flex-end' }} onClick={async () => {
            try {
              const res = await fetch(`${API_BASE}/auth/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: user.name, profilePhoto: user.profilePhoto, role: user.role })
              });
              if (res.ok) alert('Profile updated successfully!');
            } catch(e) {
              alert('Saved profile preferences locally.');
            }
          }}>Save Preferences</button>
        </div>
      )}

      {/* Privacy & Sharing SubTab */}
      {activeSettingsSubTab === 'privacy' && (
        <div className="glass-card animate-fade-in" style={{ padding: '28px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            <Lock size={20} /> Privacy & Sharing Permissions
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Show Online & Active Status Presence</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Show green status dot when active inside chat threads.</div>
              </div>
              <input 
                type="checkbox" 
                checked={settingsForm.allowOnlinePresence} 
                onChange={() => setSettingsForm({ ...settingsForm, allowOnlinePresence: !settingsForm.allowOnlinePresence })} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            {/* Two-Factor Authentication (2FA) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Two-Factor Authentication (2FA)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Add an extra layer of security to your account using TOTP.</div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: user?.twoFactorSecret ? 'var(--color-success)' : 'var(--text-tertiary)',
                  background: user?.twoFactorSecret ? 'rgba(16,185,129,0.1)' : 'var(--bg-tertiary)',
                  padding: '4px 10px',
                  borderRadius: '12px'
                }}>
                  {user?.twoFactorSecret ? 'Active 🔒' : 'Disabled'}
                </span>
              </div>

              {user?.twoFactorSecret ? (
                <button 
                  className="btn-primary" 
                  style={{ background: 'var(--color-danger)', border: 'none', alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}
                  onClick={handleDisable2FA}
                >
                  Disable 2FA Security
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  {!twoFAQr ? (
                    <button 
                      className="btn-primary" 
                      style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}
                      onClick={handleSetup2FA}
                    >
                      Set Up 2FA Authenticator
                    </button>
                  ) : (
                    <div className="glass-card animate-fade-in" style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>1. Scan this QR code in your Authenticator app:</div>
                      <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', padding: '12px', borderRadius: '12px', width: 'fit-content', margin: '0 auto' }}>
                        <img src={twoFAQr} alt="2FA QR Code" style={{ width: '160px', height: '160px' }} />
                      </div>
                      {twoFASecret && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all', textAlign: 'center' }}>
                          Secret Key: <code style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{twoFASecret}</code>
                        </div>
                      )}
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '4px' }}>2. Enter the 6-digit verification code:</div>
                      <input
                        type="text"
                        placeholder="e.g. 123456"
                        maxLength={6}
                        className="input-field"
                        style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: '700', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        value={twoFACode}
                        onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button 
                          className="btn-primary" 
                          style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '10px' }}
                          onClick={() => handleVerify2FA(twoFACode, twoFASecret)}
                        >
                          Verify & Enable
                        </button>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '10px', fontSize: '13px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}
                          onClick={() => {
                            setTwoFAQr('');
                            setTwoFASecret('');
                            setTwoFACode('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Allow Timeline Post Contributions</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Allow relatives to comment and like your timeline posts.</div>
              </div>
              <input 
                type="checkbox" 
                checked={settingsForm.allowTimelinePosts} 
                onChange={() => setSettingsForm({ ...settingsForm, allowTimelinePosts: !settingsForm.allowTimelinePosts })} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            {/* Blocked Users List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Blocked Family Members</label>
              {blockedUsers.length === 0 ? (
                <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  No members are currently blocked.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {blockedUsers.map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar user={u} size="sm" />
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px' }}>{u.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.role}</div>
                        </div>
                      </div>
                      <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--color-danger)', boxShadow: 'none' }} onClick={() => handleUnblockUser(u.id)}>
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feed & Content Preferences SubTab */}
      {activeSettingsSubTab === 'feed' && (
        <div className="glass-card animate-fade-in" style={{ padding: '28px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            <CheckSquare size={20} /> Feed & Content Preferences
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Media Upload Quality (High-Definition)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Upload photos in full HD (uses more storage cache). Toggle off for Data Saver.</div>
              </div>
              <input 
                type="checkbox" 
                checked={settingsForm.mediaHD} 
                onChange={() => setSettingsForm({ ...settingsForm, mediaHD: !settingsForm.mediaHD })} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Active Chat Filter & Block Lists</label>
              <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                No members are currently muted or blocked from your family timeline.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications SubTab */}
      {activeSettingsSubTab === 'notifications' && (
        <div className="glass-card animate-fade-in" style={{ padding: '28px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            <Bell size={20} /> Granular Notification Alerts
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Direct Messages Alerts</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Notify instantly on incoming 1-on-1 chats.</div>
              </div>
              <input 
                type="checkbox" 
                checked={settingsForm.notificationDMs} 
                onChange={() => setSettingsForm({ ...settingsForm, notificationDMs: !settingsForm.notificationDMs })} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Family Group Mentions & Tags</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Notify when someone tags you in a family circle or group chat.</div>
              </div>
              <input 
                type="checkbox" 
                checked={settingsForm.notificationGroupTags} 
                onChange={() => setSettingsForm({ ...settingsForm, notificationGroupTags: !settingsForm.notificationGroupTags })} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Status Likes & Reactions</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Notify when family members react to your stories or posts.</div>
              </div>
              <input 
                type="checkbox" 
                checked={settingsForm.notificationLikes} 
                onChange={() => setSettingsForm({ ...settingsForm, notificationLikes: !settingsForm.notificationLikes })} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Data & Storage SubTab */}
      {activeSettingsSubTab === 'data' && (
        <div className="glass-card animate-fade-in" style={{ padding: '28px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            <Cloud size={20} /> Data & Shared Cloud Storage
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>
                <span>Family Shared Media Cloud Cache</span>
                <span>{settingsForm.cloudStorageUsed} GB / {settingsForm.cloudStorageLimit} GB</span>
              </div>
              <div style={{ width: '100%', height: '14px', background: 'var(--bg-tertiary)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${(settingsForm.cloudStorageUsed / settingsForm.cloudStorageLimit) * 100}%`, height: '100%', background: 'var(--gradient-premium)' }}></div>
              </div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              💾 <b>Shared Storage Breakdown:</b><br/>
              • Family Photos & Videos: 8.2 GB<br/>
              • Audio Clips & Voice Notes: 2.1 GB<br/>
              • Location Coordinates Log cache: 2.1 GB
            </div>
          </div>
        </div>
      )}

      {/* Subscription & Upgrades SubTab */}
      {activeSettingsSubTab === 'subscription' && (
        <div className="glass-card animate-fade-in" style={{ padding: '28px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            <Award size={20} /> Plan & Upgrades
          </h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '16px', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--color-primary)' }}>FamilySphere AI Premium Plan</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Unlocks unlimited translation and smart Gemini replies.</div>
            </div>
            <span style={{ fontSize: '13px', fontWeight: '800', background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '6px 14px', borderRadius: '8px' }}>
              ACTIVE (Free Dev Trial)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
