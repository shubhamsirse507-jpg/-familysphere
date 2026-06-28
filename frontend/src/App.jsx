import React, { useState, useEffect } from 'react';
import { Sun, Moon, LogOut, UserPlus, X, BarChart2, ShieldCheck, ShieldAlert, MessageSquarePlus, Users, Check, ChevronRight, Bell } from 'lucide-react';
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
  const [mobileWorkspaceActive, setMobileWorkspaceActive] = useState(false);

  // Global modals (not page-specific)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({ name: '', phone: '', email: '', password: '', role: 'Parent', profilePhoto: '' });
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberSuccess, setAddMemberSuccess] = useState('');

  const [addMemberTab, setAddMemberTab]             = useState('search'); // 'search' | 'create'
  const [searchQuery, setSearchQuery]               = useState('');
  const [searchResult, setSearchResult]             = useState(null);   // { user, status }
  const [searchError, setSearchError]               = useState('');
  const [searchLoading, setSearchLoading]           = useState(false);
  const [inviteLoading, setInviteLoading]           = useState(false);
  const [inviteSuccess, setInviteSuccess]           = useState('');

  // Unified notification center
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { user, fetchProfile, handleLogout } = useAuth();
  const { socket, activeUsers } = useSocket();
  const {
    activeChat, setActiveChat,
    showPollBuilder, setShowPollBuilder,
    pollForm, setPollForm,
    incomingNotification, setIncomingNotification,
    handleNotificationClick,
    handleSendMessage,
    sendPollMessage,
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

  const handleSearchUser = async () => {
    setSearchError('');
    setSearchResult(null);
    setInviteSuccess('');
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/find?query=${encodeURIComponent(searchQuery.trim())}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || 'User not found.');
      } else {
        setSearchResult(data);
      }
    } catch {
      setSearchError('Connection error.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleInviteMember = async (userId) => {
    setInviteLoading(true);
    setInviteSuccess('');
    setSearchError('');
    try {
      const res = await fetch(`${API_BASE}/family/send-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || 'Could not send invite.');
      } else {
        setInviteSuccess(`✅ Invite sent to ${searchResult?.user?.name || 'user'}!`);
        setSearchResult(null);
        setSearchQuery('');
      }
    } catch {
      setSearchError('Connection error.');
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Unified Notification Center ─────────────────────────────
  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const notifIcon = (type) => ({
    message: '💬', post_like: '❤️', post_comment: '💬',
    missed_call: '📞', family_invite: '👨‍👩‍👧', invite_accepted: '✅'
  }[type] || '🔔');

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      await fetch(`${API_BASE}/notifications/${notifId}/read`, {
        method: 'POST', credentials: 'include',
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST', credentials: 'include',
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  const handleAcceptInvite = async (inviteId, notifId) => {
    try {
      const res = await fetch(`${API_BASE}/family/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteId }),
      });
      if (res.ok) {
        if (notifId) await handleMarkAsRead(notifId);
        await fetchProfile();
        await fetchNotifications();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to accept invite.');
      }
    } catch (err) {
      console.error('Accept invite error:', err);
    }
  };

  const handleRejectInvite = async (inviteId, notifId) => {
    try {
      const res = await fetch(`${API_BASE}/family/reject-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteId }),
      });
      if (res.ok) {
        if (notifId) await handleMarkAsRead(notifId);
        await fetchNotifications();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reject invite.');
      }
    } catch (err) {
      console.error('Reject invite error:', err);
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.isRead) await handleMarkAsRead(notif.id);
    const meta = notif.metadata ? JSON.parse(notif.metadata) : {};
    setShowNotificationDropdown(false);
    if (notif.type === 'message' && meta.chatId) {
      setActiveTab('chats');
      setActiveChat(meta.chatId);
    } else if (notif.type === 'post_like' || notif.type === 'post_comment') {
      setActiveTab('together');
      setTogetherSubTab('feed');
      setMobileWorkspaceActive(true);
    } else if (notif.type === 'missed_call') {
      setActiveTab('calls');
    }
  };

  // Fetch notifications on mount/user change, poll every 30s
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Real-time socket listener
  useEffect(() => {
    if (socket) {
      const handleNewNotif = (notif) => {
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      };
      socket.on('notification:new', handleNewNotif);
      return () => socket.off('notification:new', handleNewNotif);
    }
  }, [socket]);

  // Handle poll creation from ChatWorkspace
  const handleCreatePoll = (e) => {
    e.preventDefault();
    if (!pollForm.question.trim() || !pollForm.option1.trim() || !pollForm.option2.trim()) return;
    const options = [pollForm.option1, pollForm.option2, pollForm.option3].filter(Boolean);
    sendPollMessage({ question: pollForm.question, options });
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
      <div className={`sidebar ${activeChat || mobileWorkspaceActive ? 'hidden' : ''}`}>

        {/* Sidebar Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
              <img src="/logo.png" alt="FamilySphere" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.35)' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span style="color:#fff;font-weight:800;font-size:16px;background:var(--gradient-premium);width:100%;height:100%;display:flex;align-items:center;justify-content:center">F</span>'; }} />
            </div>
            <h2 style={{ fontSize: '20px', fontFamily: 'Outfit', fontWeight: '800' }}>FamilySphere</h2>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button className="btn-icon" title="Add Family Member" onClick={() => { setAddMemberError(''); setAddMemberSuccess(''); setShowAddMemberModal(true); }}>
              <UserPlus size={18} />
            </button>

            {/* ── Unified Notification Bell ─────────────────────── */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn-icon"
                title="Notifications"
                onClick={() => setShowNotificationDropdown(v => !v)}
                style={{ position: 'relative' }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-3px', right: '-3px',
                    background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                    color: '#fff', borderRadius: '50%', fontSize: '9px',
                    width: '16px', height: '16px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: '800', boxShadow: '0 0 0 2px var(--bg-secondary)',
                    animation: 'notif-pop 0.3s cubic-bezier(0.34,1.56,0.64,1)'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                  width: '320px', maxHeight: '440px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '18px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                  zIndex: 3000, display: 'flex', flexDirection: 'column',
                  animation: 'slideInDown 0.25s cubic-bezier(0.16,1,0.3,1)'
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px 10px', borderBottom: '1px solid var(--border-glass)',
                    flexShrink: 0
                  }}>
                    <span style={{ fontWeight: '800', fontSize: '14px', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllAsRead} style={{
                        fontSize: '11px', color: 'var(--color-primary)', fontWeight: '700',
                        border: 'none', cursor: 'pointer', padding: '3px 8px',
                        borderRadius: '8px', background: 'var(--color-primary-light)'
                      }}>
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>No notifications yet</div>
                      </div>
                    ) : notifications.map(notif => {
                      const meta = notif.metadata ? JSON.parse(notif.metadata) : {};
                      const isFamilyInvite = notif.type === 'family_invite' && !notif.isRead;
                      return (
                        <div
                          key={notif.id}
                          onClick={() => !isFamilyInvite && handleNotifClick(notif)}
                          style={{
                            display: 'flex', flexDirection: 'column', gap: '6px',
                            padding: '11px 14px',
                            background: notif.isRead ? 'transparent' : 'rgba(99,102,241,0.07)',
                            borderBottom: '1px solid var(--border-glass)',
                            cursor: isFamilyInvite ? 'default' : 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isFamilyInvite) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(99,102,241,0.07)'; }}
                        >
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            {/* Icon */}
                            <div style={{
                              width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                              background: 'var(--bg-tertiary)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                            }}>
                              {notifIcon(notif.type)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{notif.title}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: '6px' }}>{formatTimeAgo(notif.createdAt)}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{notif.body}</div>
                              {!notif.isRead && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)', marginTop: '4px' }} />}
                            </div>
                          </div>
                          {/* Inline Accept/Reject for family_invite */}
                          {isFamilyInvite && meta.inviteId && (
                            <div style={{ display: 'flex', gap: '6px', paddingLeft: '44px' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAcceptInvite(meta.inviteId, notif.id); setShowNotificationDropdown(false); }}
                                style={{ flex: 1, padding: '6px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                              >✓ Accept</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRejectInvite(meta.inviteId, notif.id); }}
                                style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                              >✕ Reject</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* ─────────────────────────────────────────────────── */}

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
              setTogetherSubTab={(tabId) => {
                setTogetherSubTab(tabId);
                setMobileWorkspaceActive(true);
              }}
              feedPosts={0} sharedPhotos={0} circlesList={0} stories={0}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsSidebar
              activeSettingsSubTab={activeSettingsSubTab}
              setActiveSettingsSubTab={(tabId) => {
                setActiveSettingsSubTab(tabId);
                setMobileWorkspaceActive(true);
              }}
            />
          )}
        </div>

        {/* Bottom navigation */}
        <NavBar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileWorkspaceActive(false);
          }} 
          setActiveChat={setActiveChat} 
        />
      </div>

      {/* ── 2. Detail / Workspace Area ──────────────────────────── */}
      <div className={`detail-area ${activeChat || (['together', 'settings'].includes(activeTab) && mobileWorkspaceActive) ? 'active' : ''} ${activeChat ? 'chat-active' : ''}`}>
        {/* Mobile Back Header */}
        {mobileWorkspaceActive && ['together', 'settings'].includes(activeTab) && (
          <div className="mobile-workspace-header" style={{
            alignItems: 'center',
            padding: '10px 16px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-glass)'
          }}>
            <button 
              className="btn-icon" 
              onClick={() => setMobileWorkspaceActive(false)}
              style={{ display: 'flex', alignItems: 'center', padding: '4px' }}
              title="Go back"
            >
              <ChevronRight size={20} style={{ transform: 'rotate(180deg)', color: 'var(--color-primary)' }} />
            </button>
          </div>
        )}
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
          <div className="modal-card animate-fade-in" style={{ background: 'var(--bg-secondary)', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>Add Family Member</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Find an existing user or create a new account.
                </p>
              </div>
              <button className="btn-icon" onClick={() => { setShowAddMemberModal(false); setSearchResult(null); setSearchQuery(''); setSearchError(''); setInviteSuccess(''); }}>
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '4px' }}>
              {['search', 'create'].map(tab => (
                <button key={tab} onClick={() => { setAddMemberTab(tab); setSearchError(''); setAddMemberError(''); setInviteSuccess(''); setAddMemberSuccess(''); }}
                  style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', fontFamily: 'Outfit',
                    background: addMemberTab === tab ? 'var(--color-primary)' : 'transparent',
                    color: addMemberTab === tab ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s' }}>
                  {tab === 'search' ? '🔍 Find User' : '➕ New Account'}
                </button>
              ))}
            </div>

            {/* ── TAB: SEARCH ── */}
            {addMemberTab === 'search' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Enter the email or phone number of someone who already has a FamilySphere account.
                </p>

                {inviteSuccess && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: '#d1fae5', color: '#065f46', fontSize: '13px' }}>
                    <ShieldCheck size={16} /><span>{inviteSuccess}</span>
                  </div>
                )}
                {searchError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px' }}>
                    <ShieldAlert size={16} /><span>{searchError}</span>
                  </div>
                )}

                {/* Search input + button */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="input-field"
                    style={{ flex: 1 }}
                    type="text"
                    placeholder="Email or phone number"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                  />
                  <button
                    onClick={handleSearchUser}
                    disabled={searchLoading || !searchQuery.trim()}
                    style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                    {searchLoading ? '...' : 'Search'}
                  </button>
                </div>

                {/* Result card */}
                {searchResult && (
                  <div style={{ border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '14px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <img
                      src={searchResult.user.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(searchResult.user.name)}&background=random`}
                      alt={searchResult.user.name}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>{searchResult.user.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{searchResult.user.role}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{searchResult.user.email}</div>
                    </div>
                    {/* Action — show Add button for any status except already_in_family */}
                    {searchResult.status === 'already_in_family' ? (
                      <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Already in family
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        {searchResult.status === 'in_different_family' && (
                          <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '600' }}>In another family</span>
                        )}
                        {searchResult.status === 'self' && (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>You</span>
                        )}
                        <button
                          onClick={() => handleInviteMember(searchResult.user.id)}
                          disabled={inviteLoading}
                          style={{
                            padding: '8px 16px', borderRadius: '10px', border: 'none',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff', fontWeight: '700', fontSize: '13px',
                            cursor: inviteLoading ? 'not-allowed' : 'pointer',
                            opacity: inviteLoading ? 0.7 : 1,
                            display: 'flex', alignItems: 'center', gap: '5px',
                            boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                            transition: 'all 0.2s'
                          }}>
                          <UserPlus size={14} />{inviteLoading ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: CREATE ── */}
            {addMemberTab === 'create' && (
              <form onSubmit={async e => {
                e.preventDefault();
                setAddMemberError(''); setAddMemberSuccess('');
                try {
                  const res = await fetch(`${API_BASE}/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(addMemberForm)
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setAddMemberError(typeof data?.error === 'string' ? data.error : data?.message || 'Failed to create account');
                    return;
                  }
                  setAddMemberSuccess(`✅ ${addMemberForm.name} has been added! They can now log in with ${addMemberForm.email}.`);
                  setAddMemberForm({ name: '', phone: '', email: '', password: '', role: 'Parent', profilePhoto: '' });
                  fetchUsersList();
                } catch {
                  setAddMemberError('Connection error. Make sure the backend is running.');
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {addMemberSuccess && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: '#d1fae5', color: '#065f46', fontSize: '13px' }}>
                    <ShieldCheck size={16} /><span>{addMemberSuccess}</span>
                  </div>
                )}
                {addMemberError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px' }}>
                    <ShieldAlert size={16} /><span>{addMemberError}</span>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                  <input type="text" placeholder="e.g. Samiksha (Parent)" className="input-field" value={addMemberForm.name} onChange={e => setAddMemberForm({ ...addMemberForm, name: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Phone *</label>
                  <input type="text" placeholder="+1234567890" className="input-field" value={addMemberForm.phone} onChange={e => setAddMemberForm({ ...addMemberForm, phone: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email *</label>
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
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button type="button" onClick={() => setShowAddMemberModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <UserPlus size={16} />Add to Family
                  </button>
                </div>
              </form>
            )}

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
        html, body, #root { height: 100%; }
        .sidebar { overflow: hidden; }
        .app-container { display: flex; height: 100vh; overflow: hidden; background: var(--bg-primary); }
        .detail-area { flex: 1; display: none; flex-direction: column; overflow: hidden; }
        .detail-area.active { display: flex; }
        .mobile-workspace-header { display: none; }
        .chat-back-btn { display: none !important; }
        @media (min-width: 769px) {
          .sidebar { display: flex !important; width: 360px; min-width: 300px; flex-direction: column; border-right: 1px solid var(--border-glass); background: var(--bg-secondary); height: 100vh; overflow: hidden; }
          .sidebar.hidden { display: flex !important; }
          .detail-area { display: flex; }
        }
        @media (max-width: 768px) {
          .mobile-workspace-header { display: flex !important; }
          .chat-back-btn { display: flex !important; }
          .bottom-nav { justify-content: space-around; padding: 0 4px; gap: 0; }
          .nav-btn { min-width: auto; flex: 1; padding: 6px 4px; font-size: 9px; }
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
