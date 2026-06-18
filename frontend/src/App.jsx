import React, { useState, useEffect } from 'react';
import { Sun, Moon, LogOut, UserPlus, X, BarChart2, ShieldCheck, ShieldAlert, MessageSquarePlus, Users, Check } from 'lucide-react';
import { API_BASE } from './utils/config.js';
import useAuth from './hooks/useAuth.js';
import useSocket from './hooks/useSocket.js';
import useChats from './hooks/useChats.js';
import useCalls from './hooks/useCalls.js';
import AuthScreen from './auth/AuthScreen.jsx';
import Avatar from './components/Avatar.jsx';
import CallScreen from './components/CallScreen.jsx';
import NavBar from './components/NavBar.jsx';

// Page components
import { ChatSidebar, ChatWorkspace } from './pages/ChatPage.jsx';
import { StoriesSidebar } from './pages/StoriesPage.jsx';
import { CallsSidebar } from './pages/CallsPage.jsx';
import { AISidebar } from './pages/AIPage.jsx';
import { SettingsSidebar, SettingsWorkspace } from './pages/SettingsPage.jsx';
import { FeedSidebar, FeedWorkspace } from './pages/FeedPage.jsx';

// Intercept global fetch to automatically add credentials: 'include' for all /api calls
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input && input.url));
  if (url && (url.includes('/api') || url.includes(':5000/api'))) {
    init = init || {};
    init.credentials = 'include';
    if (init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.delete('Authorization');
      } else if (typeof init.headers === 'object') {
        delete init.headers['Authorization'];
        delete init.headers['authorization'];
      }
    }
  }
  return originalFetch(input, init);
};

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('chats');
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState('account');
  const [togetherSubTab, setTogetherSubTab] = useState('feed');

  // Global modals (not page-specific)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({ name: '', phone: '', email: '', password: '', role: 'Parent', profilePhoto: '' });
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberSuccess, setAddMemberSuccess] = useState('');

  const { user, fetchProfile, handleLogout } = useAuth();
  const { activeUsers } = useSocket();
  const {
    activeChat, setActiveChat,
    showPollBuilder, setShowPollBuilder,
    pollForm, setPollForm,
    incomingNotification, setIncomingNotification,
    handleNotificationClick,
    handleSendMessage,
    fetchUsersList,
    showAddChatModal, setShowAddChatModal,
    newChatConfig, setNewChatConfig,
    usersList,
    handleStartChat,
    handleStartGroup,
  } = useChats();
  const { activeCall } = useCalls();

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Bootstrap profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Handle poll creation from ChatWorkspace
  const handleCreatePoll = (e) => {
    e.preventDefault();
    if (!pollForm.question.trim() || !pollForm.option1.trim() || !pollForm.option2.trim()) return;
    const options = [pollForm.option1, pollForm.option2, pollForm.option3].filter(Boolean);
    handleSendMessage(null, JSON.stringify({ question: pollForm.question, options }));
    setShowPollBuilder(false);
    setPollForm({ question: '', option1: '', option2: '', option3: '' });
  };

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="app-container">

      {/* ── Calling Overlay ─────────────────────────────────────── */}
      {activeCall && <CallScreen />}

      {/* ── 1. Sidebar ──────────────────────────────────────────── */}
      <div className={`sidebar ${activeChat ? 'hidden' : ''}`}>

        {/* Sidebar Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
              <img src="/logo.png" alt="FamilySphere" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.35)' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span style="color:#fff;font-weight:800;font-size:16px;background:var(--gradient-premium);width:100%;height:100%;display:flex;align-items:center;justify-content:center">F</span>'; }} />
            </div>
            <h2 style={{ fontSize: '20px', fontFamily: 'Outfit', fontWeight: '800' }}>FamilySphere</h2>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn-icon" title="Add Family Member" onClick={() => { setAddMemberError(''); setAddMemberSuccess(''); setShowAddMemberModal(true); }}>
              <UserPlus size={18} />
            </button>
            <button className="btn-icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="btn-icon" onClick={handleLogout}><LogOut size={18} /></button>
          </div>
        </div>

        {/* Logged-in User Card */}
        <div style={{ margin: '12px 16px', padding: '14px 16px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--color-primary-light) 0%, rgba(99,102,241,0.08) 100%)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar user={user} size="md" borderStyle={{ border: '2px solid rgba(99,102,241,0.5)' }} />
            <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '11px', height: '11px', borderRadius: '50%', background: '#22c55e', border: '2px solid var(--bg-primary)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: user.role === 'Host' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'var(--color-primary)', color: '#fff' }}>{user.role}</span>
              <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Online
              </span>
            </div>
          </div>
        </div>

        {/* Live Active Users Panel */}
        <div style={{ margin: '0 16px 12px', padding: '12px 16px', borderRadius: '14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e', display: 'block', animation: 'pulse-ring 1.4s ease-out infinite' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Active Now</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '800', background: activeUsers.count > 0 ? '#22c55e' : '#94a3b8', color: '#fff', padding: '2px 9px', borderRadius: '20px' }}>{activeUsers.count}</span>
          </div>
          {activeUsers.users.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>No users online yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {activeUsers.users.slice(0, 5).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar user={u} size="sm" borderStyle={{ border: '1.5px solid #22c55e', width: '28px', height: '28px' }} />
                    <span style={{ position: 'absolute', bottom: '0', right: '0', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', border: '1.5px solid var(--bg-secondary)', display: 'block' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name} {u.id === user?.id ? <span style={{ color: '#6366f1', fontSize: '10px' }}>(You)</span> : ''}
                    </div>
                    <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: '500' }}>{u.role} · Online</div>
                  </div>
                </div>
              ))}
              {activeUsers.users.length > 5 && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>+{activeUsers.users.length - 5} more online</div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic tab content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {activeTab === 'chats' && <ChatSidebar />}
          {activeTab === 'status' && <StoriesSidebar />}
          {activeTab === 'calls' && <CallsSidebar />}
          {activeTab === 'ai' && <AISidebar />}
          {activeTab === 'together' && (
            <FeedSidebar
              togetherSubTab={togetherSubTab}
              setTogetherSubTab={setTogetherSubTab}
              feedPosts={0} sharedPhotos={0} circlesList={0} stories={0}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsSidebar
              activeSettingsSubTab={activeSettingsSubTab}
              setActiveSettingsSubTab={setActiveSettingsSubTab}
            />
          )}
        </div>

        {/* Bottom navigation */}
        <NavBar activeTab={activeTab} setActiveTab={setActiveTab} setActiveChat={setActiveChat} />
      </div>

      {/* ── 2. Detail / Workspace Area ──────────────────────────── */}
      <div className={`detail-area ${activeChat || ['together', 'settings', 'ai'].includes(activeTab) ? 'active' : ''}`}>
        {activeTab === 'chats' && <ChatWorkspace />}
        {activeTab === 'together' && <FeedWorkspace togetherSubTab={togetherSubTab} />}
        {activeTab === 'settings' && <SettingsWorkspace activeSettingsSubTab={activeSettingsSubTab} />}
        {!activeChat && !['chats', 'together', 'settings'].includes(activeTab) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '48px' }}>
              {activeTab === 'status' ? '📸' : activeTab === 'calls' ? '📞' : activeTab === 'ai' ? '🤖' : '💬'}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>Select an item to view</div>
          </div>
        )}
      </div>

      {/* ── Global Modals & Overlays ─────────────────────────────── */}

      {/* Poll Builder Modal */}
      {showPollBuilder && (
        <div className="modal-backdrop-blur">
          <div className="modal-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Create Decision Poll</h3>
              <button className="btn-icon" onClick={() => setShowPollBuilder(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreatePoll} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Poll Question / Title</label>
                <input type="text" placeholder="e.g. What should we do this Sunday?" className="input-field" value={pollForm.question} onChange={e => setPollForm({ ...pollForm, question: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Option 1</label>
                <input type="text" placeholder="e.g. Beach trip 🏖️" className="input-field" value={pollForm.option1} onChange={e => setPollForm({ ...pollForm, option1: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Option 2</label>
                <input type="text" placeholder="e.g. Movie night 🍿" className="input-field" value={pollForm.option2} onChange={e => setPollForm({ ...pollForm, option2: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Option 3 (Optional)</label>
                <input type="text" placeholder="e.g. Stay at home 😴" className="input-field" value={pollForm.option3} onChange={e => setPollForm({ ...pollForm, option3: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px' }}>Broadcast Poll to Chat</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Chat / New Group Modal */}
      {showAddChatModal && (
        <div className="modal-backdrop-blur">
          <div className="modal-card animate-fade-in" style={{ maxHeight: '90vh', overflowY: 'auto', width: '95%', maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>New Conversation</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Start a chat or create a group.</p>
              </div>
              <button className="btn-icon" onClick={() => { setShowAddChatModal(false); setNewChatConfig({ isGroup: false, name: '', members: [] }); }}><X size={20} /></button>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setNewChatConfig({ isGroup: false, name: '', members: [] })}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', border: 'none',
                  background: !newChatConfig.isGroup ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                  color: !newChatConfig.isGroup ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <MessageSquarePlus size={15} /> Direct Chat
              </button>
              <button
                type="button"
                onClick={() => setNewChatConfig({ isGroup: true, name: '', members: [] })}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', border: 'none',
                  background: newChatConfig.isGroup ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                  color: newChatConfig.isGroup ? '#fff' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Users size={15} /> Group Chat
              </button>
            </div>

            {/* Direct Chat — pick one person */}
            {!newChatConfig.isGroup && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Select a family member to message:</p>
                {usersList.filter(u => u.id !== user?.id).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>No other family members found.</div>
                ) : (
                  usersList.filter(u => u.id !== user?.id).map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleStartChat(u.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-glass)',
                        background: 'var(--bg-tertiary)', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    >
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: '800', fontSize: '15px'
                      }}>
                        {u.profilePhoto
                          ? <img src={u.profilePhoto} alt={u.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          : u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{u.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.role} · {u.email}</div>
                      </div>
                      <MessageSquarePlus size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Group Chat — name + multi-select members */}
            {newChatConfig.isGroup && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Group Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Family Fun 🎉"
                    className="input-field"
                    value={newChatConfig.name}
                    onChange={e => setNewChatConfig({ ...newChatConfig, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Add Members *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {usersList.filter(u => u.id !== user?.id).map(u => {
                      const selected = newChatConfig.members.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            const already = newChatConfig.members.includes(u.id);
                            setNewChatConfig(prev => ({
                              ...prev,
                              members: already ? prev.members.filter(id => id !== u.id) : [...prev.members, u.id]
                            }));
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 14px', borderRadius: '12px',
                            border: selected ? '1.5px solid var(--color-primary)' : '1px solid var(--border-glass)',
                            background: selected ? 'var(--color-primary-light)' : 'var(--bg-tertiary)',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                          }}
                        >
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: '800', fontSize: '13px'
                          }}>
                            {u.profilePhoto
                              ? <img src={u.profilePhoto} alt={u.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              : u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>{u.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.role}</div>
                          </div>
                          {selected && <Check size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button type="button" onClick={() => { setShowAddChatModal(false); setNewChatConfig({ isGroup: false, name: '', members: [] }); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                  <button
                    type="button"
                    onClick={handleStartGroup}
                    disabled={!newChatConfig.name.trim() || newChatConfig.members.length === 0}
                    className="btn-primary"
                    style={{ flex: 2, justifyContent: 'center', padding: '12px', borderRadius: '12px', opacity: (!newChatConfig.name.trim() || newChatConfig.members.length === 0) ? 0.5 : 1 }}
                  >
                    <Users size={16} /> Create Group ({newChatConfig.members.length} members)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {showAddMemberModal && (
        <div className="modal-backdrop-blur">
          <div className="modal-card animate-fade-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>Add Family Member</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Create a new account for someone in the family.</p>
              </div>
              <button className="btn-icon" onClick={() => setShowAddMemberModal(false)}><X size={20} /></button>
            </div>

            {addMemberSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '13px', marginBottom: '16px', background: '#d1fae5', padding: '12px', borderRadius: '12px' }}>
                <ShieldCheck size={18} /><span>{addMemberSuccess}</span>
              </div>
            )}
            {addMemberError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '13px', marginBottom: '16px', background: '#fee2e2', padding: '12px', borderRadius: '12px' }}>
                <ShieldAlert size={18} /><span>{addMemberError}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setAddMemberError(''); setAddMemberSuccess('');
              try {
                const res = await fetch(`${API_BASE}/auth/signup`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(addMemberForm)
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setAddMemberError(typeof data?.error === 'string' ? data.error : data?.message || 'Failed to create account');
                  return;
                }
                setAddMemberSuccess(`✅ ${addMemberForm.name} has been added! They can now log in with ${addMemberForm.email}.`);
                setAddMemberForm({ name: '', phone: '', email: '', password: '', role: 'Parent', profilePhoto: '' });
                fetchUsersList();
              } catch (err) {
                setAddMemberError('Connection error. Make sure the backend is running.');
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                <input type="text" placeholder="e.g. Samiksha (Parent)" className="input-field" value={addMemberForm.name} onChange={e => setAddMemberForm({ ...addMemberForm, name: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Phone Number *</label>
                <input type="text" placeholder="+1234567890" className="input-field" value={addMemberForm.phone} onChange={e => setAddMemberForm({ ...addMemberForm, phone: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                <input type="email" placeholder="samiksha@family.com" className="input-field" value={addMemberForm.email} onChange={e => setAddMemberForm({ ...addMemberForm, email: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Password *</label>
                <input type="password" placeholder="Min. 6 characters" className="input-field" value={addMemberForm.password} onChange={e => setAddMemberForm({ ...addMemberForm, password: e.target.value })} required minLength={6} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Family Role *</label>
                <select className="input-field" value={addMemberForm.role} onChange={e => setAddMemberForm({ ...addMemberForm, role: e.target.value })}>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Sibling">Sibling</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Profile Photo URL (optional)</label>
                <input type="text" placeholder="https://images.unsplash.com/..." className="input-field" value={addMemberForm.profilePhoto} onChange={e => setAddMemberForm({ ...addMemberForm, profilePhoto: e.target.value })} />
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>💡 Leave empty for a default avatar</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAddMemberModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '12px', borderRadius: '12px' }}>
                  <UserPlus size={16} />Add to Family
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Notification Toast */}
      {incomingNotification && (
        <div className="in-app-notification-toast" onClick={() => handleNotificationClick(incomingNotification)}>
          <div className="toast-avatar-container">
            <Avatar user={{ name: incomingNotification.senderName, profilePhoto: incomingNotification.senderAvatar }} size="sm" />
          </div>
          <div className="toast-content">
            <div className="toast-header">
              <span className="toast-title">{incomingNotification.senderName}</span>
              <span className="toast-time">now</span>
            </div>
            <p className="toast-message">
              {incomingNotification.type === 'image' && '📷 Photo'}
              {incomingNotification.type === 'video' && '🎥 Video'}
              {incomingNotification.type === 'poll' && '📊 Poll: '}
              {incomingNotification.content || ''}
            </p>
          </div>
          <button className="toast-close-btn" onClick={(e) => { e.stopPropagation(); setIncomingNotification(null); }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Global CSS helpers */}
      <style>{`
        .sidebar { overflow: hidden; }
        html, body, #root { height: 100%; }
        .app-container { display: flex; height: 100vh; overflow: hidden; background: var(--bg-primary); }
        .detail-area { flex: 1; display: none; flex-direction: column; overflow: hidden; }
        .detail-area.active { display: flex; }
        @media (min-width: 769px) {
          .sidebar { display: flex !important; width: 360px; min-width: 300px; flex-direction: column; border-right: 1px solid var(--border-glass); background: var(--bg-secondary); height: 100vh; overflow: hidden; }
          .sidebar.hidden { display: flex !important; }
          .detail-area { display: flex; }
        }
        @media (max-width: 768px) {
          .sidebar { display: flex; width: 100%; flex-direction: column; background: var(--bg-secondary); height: 100vh; overflow: hidden; }
          .sidebar.hidden { display: none; }
          .detail-area { width: 100%; }
        }
        .in-app-notification-toast {
          position: fixed; top: 24px; right: 24px; z-index: 10000;
          display: flex; align-items: center; gap: 12px; width: 340px;
          padding: 14px 16px; background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: var(--radius-lg); box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          cursor: pointer; animation: slideInDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        [data-theme="dark"] .in-app-notification-toast { background: rgba(20,26,38,0.85); border-color: rgba(255,255,255,0.08); }
        .toast-content { flex: 1; min-width: 0; }
        .toast-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
        .toast-title { font-weight: 700; font-size: 14px; color: var(--text-primary); font-family: var(--font-display); }
        .toast-time { font-size: 11px; color: var(--text-tertiary); }
        .toast-message { font-size: 13px; color: var(--text-secondary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .toast-close-btn { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; }
        @keyframes slideInDown { from { transform: translateY(-100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (max-width: 480px) { .in-app-notification-toast { top: 10px; left: 10px; right: 10px; width: auto; } }
      `}</style>
    </div>
  );
}
