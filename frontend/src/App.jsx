import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  MessageSquare, MapPin, Phone, Camera, Brain, Sparkles, Plus, 
  Search, Send, MoreVertical, Paperclip, Smile, Mic, Volume2, 
  Video, PhoneOff, Pin, UserPlus, Menu, Sun, Moon, LogOut, 
  Settings, Globe, ShieldAlert, Trash2, Check, CheckCheck, Eye, 
  X, Info, Map, ChevronRight, BarChart2, ShieldCheck, HelpCircle,
  Image, Users, Heart, Share2, MessageCircle, Lock, EyeOff, CheckSquare, Bell, Cloud, Award
} from 'lucide-react';

const API_BASE = '/api';
const SOCKET_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://familysphere-uf95.onrender.com';

export default function App() {
  // --- UI & Styling State ---
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('chats'); // 'chats', 'status', 'map', 'calls', 'ai'
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({ name: '', phone: '', email: '', password: '', role: 'Parent', profilePhoto: '' });
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberSuccess, setAddMemberSuccess] = useState('');
  
  // --- Auth State ---
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup'
  const [authForm, setAuthForm] = useState({
    name: '', phone: '', email: '', password: '', role: 'Parent', profilePhoto: ''
  });
  const [authError, setAuthError] = useState('');

  // --- Chat State ---
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState({}); // { chatId: { userId: boolean } }
  const [usersList, setUsersList] = useState([]); // All users for starting new chats
  const [showAddChatModal, setShowAddChatModal] = useState(false);
  const [newChatConfig, setNewChatConfig] = useState({ isGroup: false, name: '', members: [] });
  const [smartReplies, setSmartReplies] = useState([]);

  // --- Poll Builder State ---
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollForm, setPollForm] = useState({ question: '', option1: '', option2: '', option3: '' });

  // --- Stories/Status State ---
  const [stories, setStories] = useState([]); // Grouped stories by user
  const [activeStoryViewer, setActiveStoryViewer] = useState(null); // { user, stories, index }
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [newStory, setNewStory] = useState({ type: 'text', content: '', mediaUrl: '' });

  // --- Calling State (WebRTC & Loopback simulation) ---
  const [activeCall, setActiveCall] = useState(null); // { id, caller, receiver, type, status: 'ringing'|'connected'|'ended' }
  const [callTimer, setCallTimer] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callHistory, setCallHistory] = useState([
    { id: 1, type: 'video', status: 'completed', duration: '14 mins', date: 'Yesterday, 8:45 PM', partner: 'Jane Doe (Mom)' },
    { id: 2, type: 'voice', status: 'missed', duration: '-', date: 'May 28, 2:15 PM', partner: 'Billy Doe (Son)' }
  ]);

  // --- Location / Map State ---
  const [locations, setLocations] = useState([]);
  const [shareLocationActive, setShareLocationActive] = useState(true);

  // --- AI Settings State ---
  const [aiAssistantLogs, setAiAssistantLogs] = useState([
    { role: 'assistant', content: 'Hello! I am your FamilySphere AI helper. Ask me about chores division, meal planning, or upcoming schedules! 🤖' }
  ]);
  const [aiAssistantInput, setAiAssistantInput] = useState('');
  const [autoModerateActive, setAutoModerateActive] = useState(true);
  const [translateTarget, setTranslateTarget] = useState('Spanish');

  // --- Expanded Social Features State ---
  const [feedPosts, setFeedPosts] = useState([
    {
      id: 1,
      sender: { name: 'Jane Doe (Mom)', role: 'Parent', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
      content: 'Sunday Dinner is locked in! Making roast chicken and mashed potatoes. Let me know if you want any specific sides! 🍗🥔',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
      likes: 4,
      likedByMe: true,
      comments: [
        { id: 1, sender: 'Billy Doe (Son)', content: 'Can we get garlic bread please?? 🙏' },
        { id: 2, sender: 'Dad', content: 'Count me in, sounds delicious!' }
      ],
      createdAt: '2 hours ago'
    },
    {
      id: 2,
      sender: { name: 'Dad', role: 'Parent', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      content: 'Finally mowed the back lawn! Circles group "Sunday Outings" - please check the scheduled poll for our upcoming hiking trip details. ☀️🏃‍♂️',
      image: null,
      likes: 2,
      likedByMe: false,
      comments: [],
      createdAt: 'Yesterday'
    }
  ]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');

  const [sharedPhotos, setSharedPhotos] = useState([
    { id: 1, title: 'Summer Vacation 2025', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500', uploader: 'Jane Doe (Mom)', date: 'June 15, 2025' },
    { id: 2, title: 'Son Graduation Day 🎓', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=500', uploader: 'Dad', date: 'May 12, 2026' },
    { id: 3, title: 'Sunday Picnic', url: 'https://images.unsplash.com/photo-1526218626217-dc65a29bb444?w=500', uploader: 'Billy Doe (Son)', date: '2 weeks ago' },
    { id: 4, title: 'Gardening Projects 🌻', url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=500', uploader: 'Jane Doe (Mom)', date: '3 days ago' }
  ]);
  const [newMemoryTitle, setNewMemoryTitle] = useState('');
  const [newMemoryUrl, setNewMemoryUrl] = useState('');

  const [circlesList, setCirclesList] = useState([
    { id: 1, name: 'Kitchen Duties 🍽️', description: 'Coordinating dish washing, grocery lists, and weekly meal prep.', memberCount: 3 },
    { id: 2, name: 'Sunday Outings 🚗', description: 'Planning weekend hikes, dinners, and family road trips.', memberCount: 4 },
    { id: 3, name: 'Tech Support 💻', description: 'Helping grandparents set up their devices and troubleshooting WiFi issues.', memberCount: 2 }
  ]);
  const [newCircleName, setNewCircleName] = useState('');
  const [newCircleDesc, setNewCircleDesc] = useState('');

  // --- Granular Settings Toggles ---
  const [settingsForm, setSettingsForm] = useState({
    bio: 'Proud Parent. Coordinator of the weekly family schedules. 🏡❤️',
    customStatus: 'Coding a new website... 💻',
    handle: '@mom_coordinates',
    allowLocationTracking: true,
    allowOnlinePresence: true,
    allowTimelinePosts: true,
    notificationDMs: true,
    notificationGroupTags: true,
    notificationLikes: true,
    notificationTrackerAlerts: true,
    mediaHD: true,
    cloudStorageLimit: 50, // GB
    cloudStorageUsed: 12.4 // GB
  });
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState('account');

  // --- Refs ---
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mapContainerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // ==========================================================================
  // Lifecycle & Synchronization
  // ==========================================================================

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load User profile if token exists
  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  // Fetch initial collections upon login
  useEffect(() => {
    if (user) {
      // Connect WebSockets
      initSocket();
      
      // Load tabs data
      fetchChats();
      fetchStories();
      fetchLocations();
      fetchUsersList();

      // Setup simulated location sharing loop
      const locationInterval = setInterval(() => {
        if (shareLocationActive && socketRef.current) {
          // Send simulated minor GPS shifts to make map feel alive
          const currentLoc = locations.find(l => l.userId === user.id);
          if (currentLoc) {
            const shiftLat = (Math.random() - 0.5) * 0.0008;
            const shiftLng = (Math.random() - 0.5) * 0.0008;
            const nextLat = currentLoc.latitude + shiftLat;
            const nextLng = currentLoc.longitude + shiftLng;
            
            socketRef.current.emit('share_location', {
              userId: user.id,
              latitude: nextLat,
              longitude: nextLng
            });
          }
        }
      }, 10000);

      return () => {
        clearInterval(locationInterval);
        if (socketRef.current) socketRef.current.disconnect();
      };
    }
  }, [user]);

  // Fetch Message history for active Chat
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
      if (socketRef.current) {
        socketRef.current.emit('join_chat', activeChat.id);
      }
    }
    return () => {
      if (activeChat && socketRef.current) {
        socketRef.current.emit('leave_chat', activeChat.id);
      }
    };
  }, [activeChat]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Fetch smart replies based on last text message
    if (messages.length > 0) {
      const lastMsg = [...messages].reverse().find(m => m.type === 'text' && m.senderId !== user?.id);
      if (lastMsg) {
        fetchSmartReplies(lastMsg.content);
      } else {
        setSmartReplies([]);
      }
      
      // Fetch pinned message
      const pinned = messages.find(m => m.id === activeChat?.pinnedMessageId);
      setPinnedMessage(pinned || null);
    } else {
      setPinnedMessage(null);
    }
  }, [messages]);

  // Calling timer
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected') {
      callTimerIntervalRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(callTimerIntervalRef.current);
      setCallTimer(0);
    }
    return () => clearInterval(callTimerIntervalRef.current);
  }, [activeCall]);

  // Render Leaflet map when Location tab active
  useEffect(() => {
    if (activeTab === 'map' && locations.length > 0) {
      renderMap();
    }
  }, [activeTab, locations]);

  // Handles camera streams for active call overlay
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected') {
      setupMediaStreams();
    } else {
      stopMediaStreams();
    }
  }, [activeCall?.status]);

  // ==========================================================================
  // WebSockets Service Setup
  // ==========================================================================
  const initSocket = () => {
    const socket = io(SOCKET_BASE);
    socketRef.current = socket;

    socket.emit('auth', user.id);

    // Incoming messages
    socket.on('new_message', (msg) => {
      // If message is in currently open chat, append
      if (activeChat && msg.chatId === activeChat.id) {
        setMessages(prev => {
          // Deduplicate if already present
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      // Re-trigger chats list fetch to update previews/orders
      fetchChats();
    });

    // Typing updates
    socket.on('typing', (data) => {
      const { chatId, userId, isTyping } = data;
      setTypingUsers(prev => {
        const next = { ...prev };
        if (!next[chatId]) next[chatId] = {};
        next[chatId][userId] = isTyping;
        return next;
      });
    });

    // Real-time Location updates
    socket.on('location_updated', (data) => {
      const { userId, latitude, longitude } = data;
      setLocations(prev => prev.map(loc => 
        loc.userId === userId ? { ...loc, latitude, longitude } : loc
      ));
    });

    // WebRTC Signaling
    socket.on('incoming_call', (data) => {
      const { from, type, chatId } = data;
      setActiveCall({
        id: Math.random().toString(),
        caller: from,
        receiver: user,
        type,
        status: 'ringing'
      });
      playRingtone();
    });

    socket.on('call_accepted', () => {
      stopRingtone();
      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
    });

    socket.on('call_declined', () => {
      stopRingtone();
      cleanupCallState();
    });

    socket.on('call_ended', () => {
      cleanupCallState();
    });
  };

  const cleanupCallState = () => {
    setActiveCall(null);
    stopMediaStreams();
    setLocalStream(null);
    setRemoteStream(null);
  };

  // ==========================================================================
  // API Request Functions
  // ==========================================================================

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_BASE}/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStories = async () => {
    try {
      const res = await fetch(`${API_BASE}/stories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/location/family`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsersList = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSmartReplies = async (content) => {
    try {
      const res = await fetch(`${API_BASE}/ai/smart-replies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ messageContent: content })
      });
      if (res.ok) {
        const data = await res.json();
        setSmartReplies(data.suggestions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================================================
  // Auth Operations
  // ==========================================================================

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? 'login' : 'signup';
    
    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data);
    } catch (err) {
      setAuthError('Connection server error. Please make sure backend is running.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setActiveChat(null);
    setMessages([]);
  };

  // ==========================================================================
  // Message & Chat Operations
  // ==========================================================================

  const handleSendMessage = (e, customText = '', replyToId = null) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !activeChat) return;

    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        chatId: activeChat.id,
        senderId: user.id,
        content: textToSend,
        type: 'text',
        replyToId
      });
    }

    if (!customText) setInputText('');
    
    // Stop typing state
    socketRef.current.emit('typing', { chatId: activeChat.id, userId: user.id, isTyping: false });
  };

  const handleCreatePoll = (e) => {
    e.preventDefault();
    if (!pollForm.question.trim() || !pollForm.option1.trim() || !pollForm.option2.trim() || !activeChat) return;

    const options = [pollForm.option1, pollForm.option2];
    if (pollForm.option3.trim()) options.push(pollForm.option3);

    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        chatId: activeChat.id,
        senderId: user.id,
        content: pollForm.question,
        type: 'poll',
        pollOptions: options
      });
    }

    setPollForm({ question: '', option1: '', option2: '', option3: '' });
    setShowPollBuilder(false);
  };

  const handleCastVote = async (optionId) => {
    try {
      const res = await fetch(`${API_BASE}/chats/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ optionId })
      });
      if (res.ok) {
        fetchMessages(activeChat.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      const res = await fetch(`${API_BASE}/chats/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ chatId: activeChat.id, messageId })
      });
      if (res.ok) {
        fetchMessages(activeChat.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTranslateMessage = async (msgId, content) => {
    try {
      const res = await fetch(`${API_BASE}/ai/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: content, targetLang: translateTarget })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update local state temporarily to show translation
        setMessages(prev => prev.map(m => 
          m.id === msgId ? { ...m, translatedContent: data.translatedText } : m
        ));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerVoiceTranscribe = async () => {
    // Simulate recording voice note and sending to speech-to-text
    try {
      const res = await fetch(`${API_BASE}/ai/voice-to-text`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInputText(data.text);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartChat = async (targetId) => {
    try {
      const res = await fetch(`${API_BASE}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isGroup: false,
          participantIds: [targetId]
        })
      });
      if (res.ok) {
        const data = await res.json();
        // Add to local chats if not exists
        if (!chats.some(c => c.id === data.id)) {
          setChats(prev => [data, ...prev]);
        }
        setActiveChat(data);
        setShowAddChatModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartGroup = async () => {
    if (!newChatConfig.name.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isGroup: true,
          name: newChatConfig.name,
          participantIds: newChatConfig.members
        })
      });
      if (res.ok) {
        const data = await res.json();
        setChats(prev => [data, ...prev]);
        setActiveChat(data);
        setShowAddChatModal(false);
        setNewChatConfig({ isGroup: false, name: '', members: [] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTypingState = (e) => {
    setInputText(e.target.value);
    if (!socketRef.current || !activeChat) return;

    socketRef.current.emit('typing', {
      chatId: activeChat.id,
      userId: user.id,
      isTyping: e.target.value.length > 0
    });
  };

  // ==========================================================================
  // Stories / Status Feature
  // ==========================================================================

  const handleCreateStory = async (e) => {
    e.preventDefault();
    if (!newStory.content.trim() && !newStory.mediaUrl.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newStory)
      });

      if (res.ok) {
        fetchStories();
        setNewStory({ type: 'text', content: '', mediaUrl: '' });
        setShowStoryCreator(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewStory = async (storyId) => {
    try {
      await fetch(`${API_BASE}/stories/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ storyId })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const renderActiveStory = () => {
    if (!activeStoryViewer) return null;
    const { stories: list, index } = activeStoryViewer;
    const story = list[index];

    // Auto progress status
    return (
      <div className="story-overlay-bg">
        <div className="story-viewer-modal animate-fade-in">
          {/* Status Progression Bars */}
          <div className="story-progress-bar-container">
            {list.map((s, idx) => (
              <div key={s.id} className="story-progress-bg">
                <div 
                  className={`story-progress-fill ${idx < index ? 'completed' : idx === index ? 'active' : ''}`}
                  style={{ animationDuration: idx === index ? '5s' : '0s' }}
                  onAnimationEnd={() => {
                    if (index < list.length - 1) {
                      setActiveStoryViewer(prev => ({ ...prev, index: index + 1 }));
                      handleViewStory(list[index + 1].id);
                    } else {
                      setActiveStoryViewer(null);
                    }
                  }}
                />
              </div>
            ))}
          </div>

          {/* Viewer Header */}
          <div className="story-viewer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={activeStoryViewer.user.profilePhoto || 'https://via.placeholder.com/150'} alt="Avatar" className="avatar sm" />
              <div>
                <div style={{ fontWeight: '600' }}>{activeStoryViewer.user.name}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{new Date(story.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
            </div>
            <button className="btn-icon" style={{ color: '#fff' }} onClick={() => setActiveStoryViewer(null)}><X size={20} /></button>
          </div>

          {/* Viewers Log */}
          <div className="story-viewers-tag">
            <Eye size={14} style={{ marginRight: '5px' }} />
            <span>{story.StoryViews?.length || 0} views</span>
          </div>

          {/* Content Box */}
          <div className="story-content-body">
            {story.type === 'text' ? (
              <div className="story-text-container">{story.content}</div>
            ) : (
              <div className="story-image-container">
                <img src={story.mediaUrl} alt="Story Content" />
                {story.content && <div className="story-image-caption">{story.content}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // WebRTC Calling System
  // ==========================================================================

  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;
      
      // Basic synthesizer to emit clean phone ringtone harmonics
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start(0);
      osc2.start(0);
      
      // Pulse ringtone: 2s sound, 4s silence loop
      const ringInterval = setInterval(() => {
        if (!audioContextRef.current) {
          clearInterval(ringInterval);
          return;
        }
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.setValueAtTime(0, ctx.currentTime + 1.8);
      }, 3000);
    } catch (e) {
      console.warn("Audio Context fail", e);
    }
  };

  const stopRingtone = () => {
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch(e){}
      audioContextRef.current = null;
    }
  };

  const startOutboundCall = (type) => {
    if (!activeChat) return;
    const isGroup = activeChat.isGroup;
    // Find target in 1-on-1 chat
    const partner = activeChat.Users.find(u => u.id !== user.id);
    if (!partner && !isGroup) return;

    const callDetails = {
      id: Math.random().toString(),
      caller: user,
      receiver: partner || { name: 'Family Group' },
      type,
      status: 'ringing'
    };

    setActiveCall(callDetails);
    playRingtone();

    // Send via socket to partner
    if (socketRef.current && partner) {
      socketRef.current.emit('call_user', {
        userToCall: partner.id,
        signalData: 'dummy_webrtc_offer',
        fromUser: user,
        type,
        chatId: activeChat.id
      });
    }

    // Auto accept simulator in case testing on single browser to show off WebRTC UI
    setTimeout(() => {
      // Simulate answer if calling virtual AI helper
      if (partner?.role === 'AI') {
        stopRingtone();
        setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
      }
    }, 4000);
  };

  const acceptInboundCall = () => {
    stopRingtone();
    if (socketRef.current && activeCall) {
      socketRef.current.emit('accept_call', {
        toUser: activeCall.caller.id,
        signalData: 'dummy_webrtc_answer'
      });
      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
    }
  };

  const declineCall = () => {
    stopRingtone();
    if (socketRef.current && activeCall) {
      socketRef.current.emit('decline_call', {
        toUser: activeCall.caller.id
      });
    }
    cleanupCallState();
  };

  const endCall = () => {
    stopRingtone();
    if (socketRef.current && activeCall) {
      const partnerId = activeCall.caller.id === user.id ? activeCall.receiver.id : activeCall.caller.id;
      socketRef.current.emit('end_call', {
        toUser: partnerId
      });
    }
    // Append to call history log
    setCallHistory(prev => [
      {
        id: Math.random(),
        type: activeCall?.type || 'video',
        status: 'completed',
        duration: `${Math.floor(callTimer / 60)}m ${callTimer % 60}s`,
        date: 'Just now',
        partner: activeCall?.caller.id === user.id ? activeCall?.receiver.name : activeCall?.caller.name
      },
      ...prev
    ]);
    cleanupCallState();
  };

  const setupMediaStreams = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: activeCall?.type === 'video',
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Simulate peer stream by connecting local stream back to remote window for testing/loopback demo
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      // Create empty canvas mock stream if device lacks camera/mic
      console.warn("Could not load real media hardware, generating simulated stream", e);
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      
      let angle = 0;
      const drawMock = () => {
        if (!activeCall) return;
        ctx.fillStyle = "#1e2640";
        ctx.fillRect(0, 0, 320, 240);
        
        ctx.fillStyle = "#818cf8";
        ctx.beginPath();
        ctx.arc(160 + Math.sin(angle) * 50, 120 + Math.cos(angle) * 40, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#fff";
        ctx.font = "14px Outfit";
        ctx.fillText("Simulating camera stream...", 80, 220);
        
        angle += 0.05;
        requestAnimationFrame(drawMock);
      };
      
      drawMock();
      const mockStream = canvas.captureStream(30);
      setLocalStream(mockStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mockStream;
      }
      setRemoteStream(mockStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = mockStream;
      }
    }
  };

  const stopMediaStreams = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
  };

  // ==========================================================================
  // Live GPS Interactive Leaflet Map
  // ==========================================================================

  const renderMap = () => {
    // Check if Leaflet window instance exists
    if (!window.L) {
      console.warn('Leaflet map library is currently unavailable.');
      return;
    }

    // Reset container DOM to prevent duplicate maps initialize error
    const container = mapContainerRef.current;
    if (!container) return;
    container.innerHTML = "<div id='leaflet-map' style='height: 100%; width: 100%;'></div>";

    // Setup map (centered around central park base)
    const map = window.L.map('leaflet-map').setView([40.785091, -73.968285], 14);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Plot each family member marker
    locations.forEach(loc => {
      if (!loc.User) return;
      
      // Generate a custom circular profile marker HTML
      const markerHtml = `
        <div style="
          width: 46px; 
          height: 46px; 
          border-radius: 50%; 
          border: 3px solid ${loc.User.role === 'Parent' ? '#6366f1' : '#10b981'}; 
          overflow: hidden; 
          background: #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          transform: translate(-10px, -10px);
        ">
          <img src="${loc.User.profilePhoto || 'https://via.placeholder.com/150'}" style="width:100%; height:100%; object-fit:cover;" />
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: markerHtml,
        className: 'custom-map-icon',
        iconSize: [46, 46],
        iconAnchor: [23, 23]
      });

      window.L.marker([loc.latitude, loc.longitude], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Outfit; font-size:13px; text-align:center;">
            <b>${loc.User.name}</b><br/>
            <span style="color:#64748b; font-size:11px;">Role: ${loc.User.role}</span>
          </div>
        `);
    });
  };

  // ==========================================================================
  // AI Assistant Tab Console
  // ==========================================================================

  const handleSendAiPrompt = async (e) => {
    e.preventDefault();
    if (!aiAssistantInput.trim()) return;

    const userMsg = aiAssistantInput;
    setAiAssistantLogs(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiAssistantInput('');

    // Simulated typing response
    setAiAssistantLogs(prev => [...prev, { role: 'assistant', content: 'Typing...', isTyping: true }]);

    try {
      const res = await fetch(`${API_BASE}/ai/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: userMsg })
      });

      if (res.ok) {
        const data = await res.json();
        setAiAssistantLogs(prev => 
          prev.filter(l => !l.isTyping).concat({ role: 'assistant', content: data.response })
        );
      }
    } catch (err) {
      setAiAssistantLogs(prev => 
        prev.filter(l => !l.isTyping).concat({ role: 'assistant', content: 'Sorry, I failed to process that query. Check server connections.' })
      );
    }
  };

  // ==========================================================================
  // Render Login Card
  // ==========================================================================

  if (!user) {
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
              <img src="/logo.png" alt="FamilySphere Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.35)' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'; }} />
            </div>
            <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', color: '#1e293b', fontWeight: '800' }}>FamilySphere</h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Secure AI-Powered Family Communications</p>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Jane Doe (Mom)" 
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

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Email Address</label>
              <input 
                type="email" 
                placeholder="mom@family.com" 
                className="input-field" 
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b' }}
                value={authForm.email} 
                onChange={e => setAuthForm({ ...authForm, email: e.target.value })} 
                required 
              />
            </div>

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

            {authError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '13px', marginBottom: '16px', background: '#fee2e2', padding: '12px', borderRadius: '12px' }}>
                <ShieldAlert size={18} />
                <span>{authError}</span>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', borderRadius: '14px' }}>
              {authMode === 'login' ? 'Sign In to FamilySphere' : 'Create Account'}
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
              }} 
              style={{ fontWeight: '600', color: '#6366f1', fontSize: '13px' }}
            >
              {authMode === 'login' ? 'Create a Family Profile' : 'Sign In'}
            </button>
          </div>
          
          <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
            💡 <b>Tip:</b> If you seeded database from CSV, try logging in with <b>mom@family.com</b> and <b>Password123</b>!
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // Expanded Social Workspace Render Functions
  // ==========================================================================

  const renderFeedWorkspace = () => {
    return (
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', background: 'transparent', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: '800', color: 'var(--text-primary)' }}>Family Feed Timeline</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>A shared timeline to post announcements, photos, and general updates for your family.</p>
          </div>
          <Globe size={28} style={{ color: 'var(--color-primary)' }} />
        </div>

        {/* Create Post Form */}
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!newPostText.trim()) return;
          const newPost = {
            id: feedPosts.length + 1,
            sender: { name: user.name, role: user.role, avatar: user.profilePhoto || 'https://via.placeholder.com/150' },
            content: newPostText,
            image: newPostImage.trim() || null,
            likes: 0,
            likedByMe: false,
            comments: [],
            createdAt: 'Just now'
          };
          setFeedPosts([newPost, ...feedPosts]);
          setNewPostText('');
          setNewPostImage('');
        }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', maxWidth: '720px' }}>
          <textarea 
            placeholder="What's going on in the family? Share an update..." 
            className="input-field" 
            style={{ minHeight: '80px', resize: 'none', background: 'var(--bg-tertiary)' }}
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            required
          />
          <input 
            type="text" 
            placeholder="Add an image URL to your post (optional)..." 
            className="input-field" 
            style={{ background: 'var(--bg-tertiary)' }}
            value={newPostImage}
            onChange={(e) => setNewPostImage(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end' }}>
            Publish Post
          </button>
        </form>

        {/* Feed Posts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px' }}>
          {feedPosts.map(post => (
            <div key={post.id} className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-sm)' }}>
              {/* Post Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <img src={post.sender.avatar} className="avatar" alt="Avatar" />
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700' }}>{post.sender.name}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{post.sender.role} • {post.createdAt}</p>
                </div>
              </div>
              
              {/* Post Body */}
              <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)', marginBottom: '14px' }}>{post.content}</p>
              
              {post.image && (
                <img src={post.image} style={{ width: '100%', borderRadius: '16px', marginBottom: '14px', objectFit: 'cover', maxHeight: '350px' }} alt="Post media" />
              )}

              {/* Post Actions */}
              <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                <button 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: post.likedByMe ? 'var(--color-primary)' : 'var(--text-secondary)' }}
                  onClick={() => {
                    setFeedPosts(feedPosts.map(p => p.id === post.id ? {
                      ...p,
                      likes: p.likedByMe ? p.likes - 1 : p.likes + 1,
                      likedByMe: !p.likedByMe
                    } : p));
                  }}
                >
                  <Heart size={16} fill={post.likedByMe ? 'var(--color-primary)' : 'transparent'} />
                  <span>{post.likes} Likes</span>
                </button>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageCircle size={16} />
                  <span>{post.comments.length} Comments</span>
                </span>
              </div>

              {/* Comments list block */}
              {post.comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '12px', marginBottom: '12px' }}>
                  {post.comments.map(c => (
                    <div key={c.id} style={{ fontSize: '12px', lineHeight: '1.4' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{c.sender}:</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{c.content}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Post comment input */}
              <form onSubmit={(e) => {
                e.preventDefault();
                const commentInput = e.target.elements[`comment-${post.id}`];
                if (!commentInput.value.trim()) return;
                const nextComments = [...post.comments, {
                  id: post.comments.length + 1,
                  sender: user.name,
                  content: commentInput.value
                }];
                setFeedPosts(feedPosts.map(p => p.id === post.id ? { ...p, comments: nextComments } : p));
                commentInput.value = '';
              }} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  name={`comment-${post.id}`}
                  type="text" 
                  placeholder="Write a comment..." 
                  className="input-field" 
                  style={{ padding: '8px 12px', fontSize: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                  Send
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMemoriesWorkspace = () => {
    return (
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', background: 'transparent', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: '800', color: 'var(--text-primary)' }}>Shared Memories Album</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>A high-resolution visual repository compiling graduation days, vacations, and family picnics.</p>
          </div>
          <Sparkles size={28} style={{ color: 'var(--color-primary)' }} />
        </div>

        {/* Share Memory Form */}
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!newMemoryTitle.trim() || !newMemoryUrl.trim()) return;
          const newMem = {
            id: sharedPhotos.length + 1,
            title: newMemoryTitle,
            url: newMemoryUrl,
            uploader: user.name,
            date: 'Just now'
          };
          setSharedPhotos([newMem, ...sharedPhotos]);
          setNewMemoryTitle('');
          setNewMemoryUrl('');
        }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', maxWidth: '720px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Memory title (e.g. Picnic)..." 
              className="input-field" 
              style={{ background: 'var(--bg-tertiary)' }}
              value={newMemoryTitle}
              onChange={(e) => setNewMemoryTitle(e.target.value)}
              required
            />
            <input 
              type="text" 
              placeholder="Photo URL..." 
              className="input-field" 
              style={{ background: 'var(--bg-tertiary)' }}
              value={newMemoryUrl}
              onChange={(e) => setNewMemoryUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end' }}>
            Add Memory Photo
          </button>
        </form>

        {/* Grid of Shared Media */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {sharedPhotos.map(photo => (
            <div key={photo.id} className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ position: 'relative', height: '220px', width: '100%' }}>
                <img src={photo.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Memory" />
                <span style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '600' }}>
                  Uploaded By: {photo.uploader}
                </span>
              </div>
              <div style={{ padding: '18px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{photo.title}</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Date: {photo.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCirclesWorkspace = () => {
    return (
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', background: 'transparent', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: '800', color: 'var(--text-primary)' }}>Circles Community Hub</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Group community spaces organizing weekly chores, road trip schedules, and gardening projects.</p>
          </div>
          <Users size={28} style={{ color: 'var(--color-primary)' }} />
        </div>

        {/* Add Circle Form */}
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!newCircleName.trim()) return;
          const newCircle = {
            id: circlesList.length + 1,
            name: newCircleName,
            description: newCircleDesc.trim() || 'No description provided.',
            memberCount: 1
          };
          setCirclesList([...circlesList, newCircle]);
          setNewCircleName('');
          setNewCircleDesc('');
        }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border-glass)', maxWidth: '720px' }}>
          <input 
            type="text" 
            placeholder="Circle Name (e.g. Garden Chores)..." 
            className="input-field" 
            style={{ background: 'var(--bg-tertiary)' }}
            value={newCircleName}
            onChange={(e) => setNewCircleName(e.target.value)}
            required
          />
          <textarea 
            placeholder="Circle Description / Topic..." 
            className="input-field" 
            style={{ minHeight: '60px', resize: 'none', background: 'var(--bg-tertiary)' }}
            value={newCircleDesc}
            onChange={(e) => setNewCircleDesc(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end' }}>
            Launch Circle Space
          </button>
        </form>

        {/* Circles Panels List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {circlesList.map(circle => (
            <div key={circle.id} className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: '800', color: 'var(--color-primary)' }}>{circle.name}</h3>
                <span style={{ fontSize: '11px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
                  {circle.memberCount} members
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{circle.description}</p>
              
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>Active Circle Tasks:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" defaultChecked style={{ pointerEvents: 'none' }} />
                  <span>Announcements pinned to the timeline</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" style={{ pointerEvents: 'none' }} />
                  <span>Assign chores checklist to family members</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSettingsWorkspace = () => {
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
              <img src={user.profilePhoto || 'https://via.placeholder.com/150'} className="avatar lg" alt="Avatar" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Profile Photo URL</label>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ background: 'var(--bg-tertiary)' }}
                  value={user.profilePhoto} 
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
                  value={user.name} 
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
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                  },
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
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Share Live GPS Coordinate Location</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Allow family members to see your live position on the Tracker Map.</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={settingsForm.allowLocationTracking} 
                  onChange={() => setSettingsForm({ ...settingsForm, allowLocationTracking: !settingsForm.allowLocationTracking })} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Tracker Proximity Alerts</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Notify when family members enter or exit coordinate geofence bounds.</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={settingsForm.notificationTrackerAlerts} 
                  onChange={() => setSettingsForm({ ...settingsForm, notificationTrackerAlerts: !settingsForm.notificationTrackerAlerts })} 
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
  };

  return (
    <div className="app-container">
      
      {/* 1. Sidebar Tab Panels */}
      <div className={`sidebar ${activeChat ? 'hidden' : ''}`}>
        
        {/* Sidebar Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border-glass)'
            }}>
              <img src="/logo.png" alt="FamilySphere Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.35)' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'; }} />
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
            <button className="btn-icon" onClick={handleLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Dynamic Sidebar Content based on Tab */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          
          {/* A. CHATS TAB */}
          {activeTab === 'chats' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ padding: '16px 20px', display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input type="text" placeholder="Search chats..." className="input-field" style={{ paddingLeft: '40px' }} />
                  <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-secondary)' }} />
                </div>
                <button className="btn-primary" style={{ padding: '10px 14px' }} onClick={() => setShowAddChatModal(true)}>
                  <Plus size={20} />
                </button>
              </div>

              {/* Chat Thread List */}
              {chats.map(chat => {
                const isTyping = typingUsers[chat.id] && Object.values(typingUsers[chat.id]).some(Boolean);
                const lastMsg = chat.Messages?.[0];
                const displayMember = chat.isGroup ? null : chat.Users.find(u => u.id !== user.id);
                
                return (
                  <div 
                    key={chat.id} 
                    className="chat-thread-row" 
                    style={{
                      display: 'flex', gap: '12px', padding: '16px 20px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border-glass)',
                      background: activeChat?.id === chat.id ? 'var(--bg-tertiary)' : 'transparent'
                    }}
                    onClick={() => setActiveChat(chat)}
                  >
                    <div className="avatar-container">
                      <img src={chat.isGroup ? chat.avatar : displayMember?.profilePhoto || 'https://via.placeholder.com/150'} alt="Avatar" className="avatar" />
                      {!chat.isGroup && displayMember?.role !== 'AI' && <div className="status-dot"></div>}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {chat.isGroup ? chat.name : displayMember?.name}
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isTyping ? (
                          <span style={{ fontSize: '13px', color: 'var(--color-success)', fontWeight: '500' }}>typing...</span>
                        ) : (
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                            {lastMsg ? `${lastMsg.sender?.name || 'You'}: ${lastMsg.content}` : 'No messages yet'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* B. STATUS TAB */}
          {activeTab === 'status' && (
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Status Updates</h3>
                <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={() => setShowStoryCreator(true)}>
                  Add Status
                </button>
              </div>

              {/* Personal Status card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '16px', marginBottom: '24px' }}>
                <img src={user.profilePhoto || 'https://via.placeholder.com/150'} className="avatar" alt="My Profile" />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>My Status</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Share updates for 24 hours</div>
                </div>
              </div>

              <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Recent Updates</h4>
              
              {stories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  No recent status updates from the family.
                </div>
              ) : (
                stories.map(group => (
                  <div 
                    key={group.user.id} 
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-glass)', cursor: 'pointer' }}
                    onClick={() => {
                      setActiveStoryViewer({ user: group.user, stories: group.stories, index: 0 });
                      handleViewStory(group.stories[0].id);
                    }}
                  >
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%', border: '2.5px solid var(--color-primary)', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <img src={group.user.profilePhoto || 'https://via.placeholder.com/150'} className="avatar sm" style={{ width: '38px', height: '38px' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{group.user.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(group.stories[0].createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* C. MAP TAB (Live GPS Locations) */}
          {activeTab === 'map' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', marginBottom: '6px' }}>Live Family Tracker</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tracks current coordinates of family members dynamically.</p>
              </div>

              {/* List of members locations */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {locations.map(loc => (
                  <div key={loc.id} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <img src={loc.User?.profilePhoto || 'https://via.placeholder.com/150'} className="avatar sm" />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{loc.User?.name} ({loc.User?.role})</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Lat: {loc.latitude.toFixed(6)}, Lng: {loc.longitude.toFixed(6)}</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', padding: '4px 8px', borderRadius: '8px',
                      background: loc.isLive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                      color: loc.isLive ? 'var(--color-success)' : 'var(--text-secondary)'
                    }}>
                      {loc.isLive ? 'Live Now' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* D. CALLS TAB */}
          {activeTab === 'calls' && (
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', marginBottom: '16px' }}>Call History</h3>
              
              {callHistory.map(call => (
                <div key={call.id} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%', background: call.status === 'missed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: call.status === 'missed' ? 'var(--color-danger)' : 'var(--color-success)'
                    }}>
                      {call.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{call.partner}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{call.date}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px' }}>
                    <span style={{ color: call.status === 'missed' ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                      {call.status === 'missed' ? 'Missed' : call.duration}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* E. AI ASSISTANT HUB TAB */}
          {activeTab === 'ai' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, boxSizing: 'border-box' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Brain size={22} style={{ color: 'var(--color-primary)' }} />
                  AI Settings & Hub
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Manage the integrated FamilySphere safety and translator AI configurations.</p>
              </div>

              {/* Settings Panels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>AI Content Auto-Moderation</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Filters toxic remarks or profanity automatically</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={autoModerateActive} 
                    onChange={() => setAutoModerateActive(!autoModerateActive)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>Active System Translator Target</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Select default target for chat translations</div>
                  </div>
                  <select 
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}
                    value={translateTarget}
                    onChange={(e) => setTranslateTarget(e.target.value)}
                  >
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                  </select>
                </div>
              </div>

              {/* Quick AI console panel */}
              <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Interactive AI Console</h4>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-glass)', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {aiAssistantLogs.map((log, index) => (
                    <div key={index} style={{
                      alignSelf: log.role === 'user' ? 'flex-end' : 'flex-start',
                      background: log.role === 'user' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                      color: log.role === 'user' ? '#fff' : 'var(--text-primary)',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      maxWidth: '85%',
                      fontSize: '13px'
                    }}>
                      {log.content}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendAiPrompt} style={{ display: 'flex', padding: '8px', borderTop: '1px solid var(--border-glass)' }}>
                  <input 
                    type="text" 
                    placeholder="Ask FamilySphere AI helper..." 
                    className="input-field" 
                    style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '10px' }}
                    value={aiAssistantInput}
                    onChange={(e) => setAiAssistantInput(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '8px 12px', marginLeft: '6px', borderRadius: '10px' }}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* F. FEED (Family Timeline) TAB */}
          {activeTab === 'feed' && (
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Family Feed</h3>
              </div>
              
              {/* Create Post Form */}
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newPostText.trim()) return;
                const newPost = {
                  id: feedPosts.length + 1,
                  sender: { name: user.name, role: user.role, avatar: user.profilePhoto || 'https://via.placeholder.com/150' },
                  content: newPostText,
                  image: newPostImage.trim() || null,
                  likes: 0,
                  likedByMe: false,
                  comments: [],
                  createdAt: 'Just now'
                };
                setFeedPosts([newPost, ...feedPosts]);
                setNewPostText('');
                setNewPostImage('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '16px' }}>
                <textarea 
                  placeholder="Share a family update..." 
                  className="input-field" 
                  style={{ minHeight: '60px', resize: 'none', background: 'var(--bg-secondary)', fontSize: '13px' }}
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Image URL (optional)..." 
                  className="input-field" 
                  style={{ padding: '6px 12px', background: 'var(--bg-secondary)', fontSize: '11px', borderRadius: '8px' }}
                  value={newPostImage}
                  onChange={(e) => setNewPostImage(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', alignSelf: 'flex-end', borderRadius: '8px' }}>
                  Post
                </button>
              </form>

              {/* Scrollable Feed List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {feedPosts.map(post => (
                  <div key={post.id} style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
                    {/* Post Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <img src={post.sender.avatar} className="avatar sm" alt="Avatar" />
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{post.sender.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{post.sender.role} • {post.createdAt}</div>
                      </div>
                    </div>
                    {/* Post Content */}
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
                      {post.content}
                    </div>
                    {post.image && (
                      <img src={post.image} style={{ width: '100%', borderRadius: '12px', marginBottom: '8px', objectFit: 'cover', maxHeight: '160px' }} alt="Post" />
                    )}
                    {/* Post Actions */}
                    <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px', marginBottom: '8px' }}>
                      <button 
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: post.likedByMe ? 'var(--color-primary)' : 'var(--text-secondary)' }}
                        onClick={() => {
                          setFeedPosts(feedPosts.map(p => p.id === post.id ? {
                            ...p,
                            likes: p.likedByMe ? p.likes - 1 : p.likes + 1,
                            likedByMe: !p.likedByMe
                          } : p));
                        }}
                      >
                        <Heart size={14} fill={post.likedByMe ? 'var(--color-primary)' : 'transparent'} />
                        <span>{post.likes}</span>
                      </button>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <MessageCircle size={14} />
                        <span>{post.comments.length}</span>
                      </span>
                    </div>
                    {/* Comments List */}
                    {post.comments.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--border-glass)' }}>
                        {post.comments.slice(0, 2).map(comment => (
                          <div key={comment.id} style={{ fontSize: '11px' }}>
                            <span style={{ fontWeight: '700' }}>{comment.sender}:</span> <span style={{ color: 'var(--text-secondary)' }}>{comment.content}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* G. MEMORIES (Shared Media) TAB */}
          {activeTab === 'memories' && (
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Shared Memories</h3>
              </div>
              
              {/* Share a photo memory */}
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newMemoryTitle.trim() || !newMemoryUrl.trim()) return;
                const newMem = {
                  id: sharedPhotos.length + 1,
                  title: newMemoryTitle,
                  url: newMemoryUrl,
                  uploader: user.name,
                  date: 'Just now'
                };
                setSharedPhotos([newMem, ...sharedPhotos]);
                setNewMemoryTitle('');
                setNewMemoryUrl('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '16px' }}>
                <input 
                  type="text" 
                  placeholder="Memory title (e.g. Picnic)..." 
                  className="input-field" 
                  style={{ padding: '6px 12px', background: 'var(--bg-secondary)', fontSize: '12px' }}
                  value={newMemoryTitle}
                  onChange={(e) => setNewMemoryTitle(e.target.value)}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Photo URL..." 
                  className="input-field" 
                  style={{ padding: '6px 12px', background: 'var(--bg-secondary)', fontSize: '12px' }}
                  value={newMemoryUrl}
                  onChange={(e) => setNewMemoryUrl(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', alignSelf: 'flex-end', borderRadius: '8px' }}>
                  Share Memory
                </button>
              </form>

              {/* Photos Grid */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {sharedPhotos.map(photo => (
                  <div key={photo.id} className="glass-card" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                    <img src={photo.url} style={{ width: '100%', height: '80px', objectFit: 'cover' }} alt="Memory" />
                    <div style={{ padding: '8px' }}>
                      <div style={{ fontWeight: '700', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.title}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>By: {photo.uploader}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* H. CIRCLES (Community Channels) TAB */}
          {activeTab === 'circles' && (
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Family Circles</h3>
              </div>
              
              {/* Create new circle */}
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newCircleName.trim()) return;
                const newCircle = {
                  id: circlesList.length + 1,
                  name: newCircleName,
                  description: newCircleDesc.trim() || 'No description provided.',
                  memberCount: 1
                };
                setCirclesList([...circlesList, newCircle]);
                setNewCircleName('');
                setNewCircleDesc('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '16px' }}>
                <input 
                  type="text" 
                  placeholder="Circle Name (e.g. Garden)..." 
                  className="input-field" 
                  style={{ padding: '6px 12px', background: 'var(--bg-secondary)', fontSize: '12px' }}
                  value={newCircleName}
                  onChange={(e) => setNewCircleName(e.target.value)}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Short Description..." 
                  className="input-field" 
                  style={{ padding: '6px 12px', background: 'var(--bg-secondary)', fontSize: '12px' }}
                  value={newCircleDesc}
                  onChange={(e) => setNewCircleDesc(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', alignSelf: 'flex-end', borderRadius: '8px' }}>
                  Create Circle
                </button>
              </form>

              {/* Circles List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {circlesList.map(circle => (
                  <div key={circle.id} className="chat-thread-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '12px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '700' }}>{circle.name}</h4>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        {circle.memberCount} members
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{circle.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* I. SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Control Panel</h3>
              </div>
              
              {/* Settings navigation menu list */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  onClick={() => setActiveSettingsSubTab('account')}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'account' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'account' ? 'var(--color-primary)' : 'var(--text-primary)', textAlign: 'left', fontWeight: activeSettingsSubTab === 'account' ? '700' : '500' }}
                >
                  <UserPlus size={18} />
                  <span>Account & Profile</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsSubTab('privacy')}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'privacy' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'privacy' ? 'var(--color-primary)' : 'var(--text-primary)', textAlign: 'left', fontWeight: activeSettingsSubTab === 'privacy' ? '700' : '500' }}
                >
                  <Lock size={18} />
                  <span>Privacy & Sharing</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsSubTab('feed')}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'feed' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'feed' ? 'var(--color-primary)' : 'var(--text-primary)', textAlign: 'left', fontWeight: activeSettingsSubTab === 'feed' ? '700' : '500' }}
                >
                  <CheckSquare size={18} />
                  <span>Feed Preferences</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsSubTab('notifications')}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'notifications' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'notifications' ? 'var(--color-primary)' : 'var(--text-primary)', textAlign: 'left', fontWeight: activeSettingsSubTab === 'notifications' ? '700' : '500' }}
                >
                  <Bell size={18} />
                  <span>Notifications</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsSubTab('data')}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'data' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'data' ? 'var(--color-primary)' : 'var(--text-primary)', textAlign: 'left', fontWeight: activeSettingsSubTab === 'data' ? '700' : '500' }}
                >
                  <Cloud size={18} />
                  <span>Data & Storage</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsSubTab('subscription')}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', width: '100%', background: activeSettingsSubTab === 'subscription' ? 'var(--color-primary-light)' : 'transparent', color: activeSettingsSubTab === 'subscription' ? 'var(--color-primary)' : 'var(--text-primary)', textAlign: 'left', fontWeight: activeSettingsSubTab === 'subscription' ? '700' : '500' }}
                >
                  <Award size={18} />
                  <span>Subscription</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Navigation */}
        <div className="bottom-nav">
          <button className={`nav-btn ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => { setActiveTab('chats'); setActiveChat(null); }}>
            <MessageSquare size={20} />
            <span>Chats</span>
          </button>
          <button className={`nav-btn ${activeTab === 'status' ? 'active' : ''}`} onClick={() => { setActiveTab('status'); setActiveChat(null); }}>
            <Camera size={20} />
            <span>Status</span>
          </button>
          <button className={`nav-btn ${activeTab === 'feed' ? 'active' : ''}`} onClick={() => { setActiveTab('feed'); setActiveChat(null); }}>
            <Globe size={20} />
            <span>Feed</span>
          </button>
          <button className={`nav-btn ${activeTab === 'memories' ? 'active' : ''}`} onClick={() => { setActiveTab('memories'); setActiveChat(null); }}>
            <Image size={20} />
            <span>Memories</span>
          </button>
          <button className={`nav-btn ${activeTab === 'circles' ? 'active' : ''}`} onClick={() => { setActiveTab('circles'); setActiveChat(null); }}>
            <Users size={20} />
            <span>Circles</span>
          </button>
          <button className={`nav-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => { setActiveTab('map'); setActiveChat(null); }}>
            <Map size={20} />
            <span>Tracker</span>
          </button>
          <button className={`nav-btn ${activeTab === 'calls' ? 'active' : ''}`} onClick={() => { setActiveTab('calls'); setActiveChat(null); }}>
            <Phone size={20} />
            <span>Calls</span>
          </button>
          <button className={`nav-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => { setActiveTab('ai'); setActiveChat(null); }}>
            <Brain size={20} />
            <span>AI Hub</span>
          </button>
          <button className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setActiveChat(null); }}>
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>

      </div>

      {/* 2. Detail / Message Window area (Right on desktop, active on mobile) */}
      <div className={`detail-area ${activeChat ? 'active' : ''}`}>
        
        {activeChat ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Chat Window Header */}
            <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyBetween: 'space-between', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  className="btn-icon" 
                  style={{ marginRight: '4px', display: window.innerWidth <= 768 ? 'flex' : 'none' }}
                  onClick={() => setActiveChat(null)}
                >
                  <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
                </button>

                <img 
                  src={activeChat.isGroup ? activeChat.avatar : activeChat.Users.find(u => u.id !== user.id)?.profilePhoto || 'https://via.placeholder.com/150'} 
                  className="avatar sm" 
                  alt="Avatar" 
                />
                
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600' }}>
                    {activeChat.isGroup ? activeChat.name : activeChat.Users.find(u => u.id !== user.id)?.name}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {activeChat.isGroup ? `${activeChat.Users.length} members` : activeChat.Users.find(u => u.id !== user.id)?.role}
                  </p>
                </div>
              </div>

              {/* Call Controls & Options */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-icon" onClick={() => startOutboundCall('voice')}><Phone size={18} /></button>
                <button className="btn-icon" onClick={() => startOutboundCall('video')}><Video size={18} /></button>
                <button className="btn-icon" onClick={() => setShowPollBuilder(true)}><BarChart2 size={18} /></button>
              </div>
            </div>

            {/* Pinned Message Bar if active */}
            {pinnedMessage && (
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '10px 20px', background: 'var(--color-primary-light)', borderBottom: '1px solid var(--border-glass)', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <Pin size={14} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Pinned Message:</span>
                  <span style={{ color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{pinnedMessage.content}</span>
                </div>
                <button className="btn-icon" style={{ width: '24px', height: '24px' }} onClick={() => setPinnedMessage(null)}><X size={14} /></button>
              </div>
            )}

            {/* Messages Screen Content */}
            <div className="messages-scroller" style={{ flex: 1, padding: '24px 20px', overflowY: 'auto', overflowX: 'hidden', background: 'transparent', minHeight: 0 }}>
              
              {messages.map(msg => {
                const isMe = msg.senderId === user.id;
                const isAi = msg.sender?.role === 'AI';
                
                return (
                  <div 
                    key={msg.id} 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      marginBottom: '16px',
                      animation: 'fadeIn 0.25s forwards'
                    }}
                  >
                    {/* Message Bubble Container */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      maxWidth: '75%',
                      background: isMe ? 'var(--bubble-user)' : isAi ? 'var(--bubble-ai)' : 'var(--bubble-other)',
                      color: isMe ? 'var(--bubble-user-text)' : isAi ? 'var(--bubble-ai-text)' : 'var(--bubble-other-text)',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '12px 16px',
                      boxShadow: 'var(--shadow-sm)',
                      position: 'relative'
                    }}>
                      {/* Sender Name if Group Chat */}
                      {activeChat.isGroup && !isMe && (
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '4px' }}>
                          {msg.sender?.name} ({msg.sender?.role})
                        </div>
                      )}

                      {/* Reply preview if replyTo exists */}
                      {msg.replyTo && (
                        <div style={{
                          padding: '6px 10px',
                          background: 'rgba(0,0,0,0.04)',
                          borderLeft: '3px solid var(--color-primary)',
                          borderRadius: '4px',
                          marginBottom: '8px',
                          fontSize: '12px'
                        }}>
                          <b>{msg.replyTo.sender?.name || 'User'}:</b> {msg.replyTo.content}
                        </div>
                      )}

                      {/* Msg Content */}
                      {msg.type === 'poll' ? (
                        <div style={{ minWidth: '220px' }}>
                          <div style={{ fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BarChart2 size={16} />
                            <span>{msg.content}</span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {msg.PollOptions?.map(opt => {
                              const voteCount = opt.PollVotes?.length || 0;
                              const userVoted = opt.PollVotes?.some(v => v.userId === user.id);
                              
                              return (
                                <button 
                                  key={opt.id} 
                                  onClick={() => handleCastVote(opt.id)}
                                  style={{
                                    textAlign: 'left', padding: '10px', borderRadius: '10px',
                                    border: `1.5px solid ${userVoted ? 'var(--color-primary)' : 'var(--border-glass)'}`,
                                    background: userVoted ? 'var(--color-primary-light)' : 'rgba(0,0,0,0.02)',
                                    display: 'flex', justifyBetween: 'space-between', alignItems: 'center', justifyContent: 'space-between'
                                  }}
                                >
                                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{opt.optionText}</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{voteCount} votes</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '14px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </div>
                      )}

                      {/* Translation details if target translation was executed */}
                      {msg.translatedContent && (
                        <div style={{
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: '1px solid rgba(0,0,0,0.06)',
                          fontSize: '13px',
                          fontStyle: 'italic',
                          opacity: 0.9
                        }}>
                          🌎 {msg.translatedContent}
                        </div>
                      )}

                      {/* Timestamp & receipts */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: 'var(--text-secondary)',
                        marginTop: '4px',
                        opacity: 0.8
                      }}>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        {isMe && <CheckCheck size={12} style={{ color: 'var(--color-primary)' }} />}
                      </div>

                    </div>

                    {/* Floating Context Toolbar */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', opacity: 0, transition: 'opacity 0.2s' }} className="msg-actions-row">
                      <button style={{ fontSize: '11px', color: 'var(--text-secondary)' }} onClick={() => handlePinMessage(msg.id)}>Pin</button>
                      <button style={{ fontSize: '11px', color: 'var(--text-secondary)' }} onClick={() => handleTranslateMessage(msg.id, msg.content)}>Translate</button>
                    </div>

                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Smart replies drawer */}
            {smartReplies.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', padding: '10px 20px', background: 'var(--bg-secondary)', overflowX: 'auto', borderTop: '1px solid var(--border-glass)' }}>
                {smartReplies.map((replyText, idx) => (
                  <button 
                    key={idx} 
                    className="btn-primary" 
                    style={{
                      background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                      padding: '8px 16px', fontSize: '12px', boxShadow: 'none', border: '1px solid var(--border-glass)'
                    }}
                    onClick={() => handleSendMessage(null, replyText)}
                  >
                    {replyText}
                  </button>
                ))}
              </div>
            )}

            {/* Chat message composer input form */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', padding: '16px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-glass)', alignItems: 'center' }}>
              <button type="button" className="btn-icon" onClick={triggerVoiceTranscribe}><Mic size={18} /></button>
              <input 
                type="text" 
                placeholder="Type a message or type '@ai' to query family assistant..." 
                className="input-field" 
                value={inputText}
                onChange={handleTypingState}
              />
              <button type="submit" className="btn-primary" style={{ padding: '12px 16px', borderRadius: '12px' }}>
                <Send size={18} />
              </button>
            </form>

          </div>
        ) : activeTab === 'settings' ? (
          renderSettingsWorkspace()
        ) : activeTab === 'feed' ? (
          renderFeedWorkspace()
        ) : activeTab === 'memories' ? (
          renderMemoriesWorkspace()
        ) : activeTab === 'circles' ? (
          renderCirclesWorkspace()
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', padding: '40px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '24px', background: 'var(--color-primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)',
              marginBottom: '20px'
            }}>
              <MessageSquare size={36} />
            </div>
            <h3 style={{ fontSize: '20px', fontFamily: 'Outfit', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Start Communicating</h3>
            <p style={{ fontSize: '14px', maxWidth: '360px', textAlign: 'center' }}>
              Select a conversation from the sidebar list or tap the "+" button to begin securely texting family members.
            </p>
          </div>
        )}

      </div>

      {/* ==========================================================================
         3. Active Call Screen Overlay Interface
         ========================================================================== */}
      {activeCall && (
        <div className="calling-overlay-fullscreen">
          
          <div className="calling-card glass-panel">
            
            {/* Caller avatar */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="ring-glow-active" style={{ display: 'inline-block', borderRadius: '50%' }}>
                <img 
                  src={activeCall.caller.id === user.id ? activeCall.receiver.profilePhoto : activeCall.caller.profilePhoto} 
                  className="avatar lg" 
                  alt="Caller avatar" 
                />
              </div>
              
              <h2 style={{ fontSize: '24px', color: '#fff', marginTop: '16px', fontFamily: 'Outfit' }}>
                {activeCall.caller.id === user.id ? activeCall.receiver.name : activeCall.caller.name}
              </h2>
              
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '4px' }}>
                {activeCall.status === 'ringing' ? 'FamilySphere Calling...' : `Active Call: ${Math.floor(callTimer / 60)}:${(callTimer % 60).toString().padStart(2, '0')}`}
              </p>
            </div>

            {/* Video Streams Canvas Grid */}
            {activeCall.type === 'video' && activeCall.status === 'connected' && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                width: '100%', height: '180px', background: '#000', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px'
              }}>
                <div style={{ position: 'relative' }}>
                  <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>You</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Remote</span>
                </div>
              </div>
            )}

            {/* Control Actions Row */}
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              {activeCall.status === 'ringing' && activeCall.caller.id !== user.id ? (
                <>
                  <button className="btn-call accept" onClick={acceptInboundCall}>
                    <Phone size={24} />
                  </button>
                  <button className="btn-call hangup" onClick={declineCall}>
                    <PhoneOff size={24} />
                  </button>
                </>
              ) : (
                <>
                  <button className={`btn-call-util ${isMuted ? 'active' : ''}`} onClick={() => setIsMuted(!isMuted)}>
                    <Volume2 size={18} />
                  </button>
                  <button className="btn-call hangup" onClick={endCall}>
                    <PhoneOff size={24} />
                  </button>
                </>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ==========================================================================
         4. Location Tracker Leaflet Map Modal Canvas (Rendered when Tab active)
         ========================================================================== */}
      {activeTab === 'map' && (
        <div 
          ref={mapContainerRef} 
          style={{
            flex: 1, 
            height: '100%', 
            background: 'var(--bg-tertiary)',
            position: 'relative'
          }}
        >
          {/* Dynamic SVG Fallback in case Leaflet fails or runs offline */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '40px', zIndex: 1
          }}>
            <Map size={48} style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
            <h4 style={{ fontFamily: 'Outfit', fontSize: '16px' }}>Interactive Location Tracker</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>
              (Integrating Leaflet OpenStreetMap layers. Move to this tab to render standard maps.)
            </p>
          </div>
        </div>
      )}

      {/* ==========================================================================
         5. Status / Story Viewer Fullscreen Modal
         ========================================================================== */}
      {renderActiveStory()}

      {/* ==========================================================================
         6. Custom Modals & Overlays (New Chat, New Story, Poll Builder)
         ========================================================================== */}

      {/* A. Create Chat Modal */}
      {showAddChatModal && (
        <div className="modal-backdrop-blur">
          <div className="modal-card animate-fade-in">
            <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '16px', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Start Conversation</h3>
              <button className="btn-icon" onClick={() => setShowAddChatModal(false)}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px' }}>
              <button 
                onClick={() => setNewChatConfig({ ...newChatConfig, isGroup: false })}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: !newChatConfig.isGroup ? 'var(--color-primary-light)' : 'transparent', fontWeight: !newChatConfig.isGroup ? '700' : '400' }}
              >
                1-on-1 Chat
              </button>
              <button 
                onClick={() => setNewChatConfig({ ...newChatConfig, isGroup: true })}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: newChatConfig.isGroup ? 'var(--color-primary-light)' : 'transparent', fontWeight: newChatConfig.isGroup ? '700' : '400' }}
              >
                Group Chat
              </button>
            </div>

            {newChatConfig.isGroup ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Group Name (e.g. Cousins Group 🏡)" 
                  className="input-field" 
                  value={newChatConfig.name}
                  onChange={e => setNewChatConfig({ ...newChatConfig, name: e.target.value })}
                />
                
                <h4 style={{ fontSize: '13px', fontWeight: '600' }}>Select Members</h4>
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  {usersList.filter(u => u.id !== user.id).map(u => {
                    const isChecked = newChatConfig.members.includes(u.id);
                    return (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', cursor: 'pointer' }}>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = isChecked ? newChatConfig.members.filter(id => id !== u.id) : [...newChatConfig.members, u.id];
                            setNewChatConfig({ ...newChatConfig, members: next });
                          }}
                        />
                        <span>{u.name} ({u.role})</span>
                      </label>
                    );
                  })}
                </div>

                <button className="btn-primary" style={{ marginTop: '12px', justifyContent: 'center' }} onClick={handleStartGroup}>
                  Create Family Group
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {usersList.filter(u => u.id !== user.id).map(u => (
                  <div 
                    key={u.id} 
                    className="user-row-hover"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}
                    onClick={() => handleStartChat(u.id)}
                  >
                    <img src={u.profilePhoto || 'https://via.placeholder.com/150'} className="avatar sm" />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* B. Create Status Story Modal */}
      {showStoryCreator && (
        <div className="modal-backdrop-blur">
          <div className="modal-card animate-fade-in">
            <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '16px', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Create Status</h3>
              <button className="btn-icon" onClick={() => setShowStoryCreator(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateStory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Status Type</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: newStory.type === 'text' ? '2px solid var(--color-primary)' : '1px solid var(--border-glass)' }}
                    onClick={() => setNewStory({ ...newStory, type: 'text', mediaUrl: '' })}
                  >
                    Text Status
                  </button>
                  <button 
                    type="button" 
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: newStory.type === 'image' ? '2px solid var(--color-primary)' : '1px solid var(--border-glass)' }}
                    onClick={() => setNewStory({ ...newStory, type: 'image' })}
                  >
                    Photo Status
                  </button>
                </div>
              </div>

              {newStory.type === 'image' && (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Image URL</label>
                  <input 
                    type="text" 
                    placeholder="https://images.unsplash.com/..." 
                    className="input-field"
                    value={newStory.mediaUrl}
                    onChange={e => setNewStory({ ...newStory, mediaUrl: e.target.value })}
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  {newStory.type === 'text' ? 'Status Content' : 'Image Caption'}
                </label>
                <textarea 
                  placeholder={newStory.type === 'text' ? "What's on your mind?" : "Caption goes here..."}
                  className="input-field"
                  style={{ minHeight: '80px', resize: 'none' }}
                  value={newStory.content}
                  onChange={e => setNewStory({ ...newStory, content: e.target.value })}
                  required={newStory.type === 'text'}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px' }}>
                Publish Status
              </button>
            </form>
          </div>
        </div>
      )}

      {/* C. Create Poll Modal */}
      {showPollBuilder && (
        <div className="modal-backdrop-blur">
          <div className="modal-card animate-fade-in">
            <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '16px', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Create Decision Poll</h3>
              <button className="btn-icon" onClick={() => setShowPollBuilder(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreatePoll} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Poll Question / Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. What should we do this Sunday?" 
                  className="input-field"
                  value={pollForm.question}
                  onChange={e => setPollForm({ ...pollForm, question: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Option 1</label>
                <input 
                  type="text" 
                  placeholder="e.g. Beach trip 🏖️" 
                  className="input-field"
                  value={pollForm.option1}
                  onChange={e => setPollForm({ ...pollForm, option1: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Option 2</label>
                <input 
                  type="text" 
                  placeholder="e.g. Movie night 🍿" 
                  className="input-field"
                  value={pollForm.option2}
                  onChange={e => setPollForm({ ...pollForm, option2: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Option 3 (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Stay at home and sleep 😴" 
                  className="input-field"
                  value={pollForm.option3}
                  onChange={e => setPollForm({ ...pollForm, option3: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px' }}>
                Broadcast Poll to Chat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* D. Add Family Member Modal */}
      {showAddMemberModal && (
        <div className="modal-backdrop-blur">
          <div className="modal-card animate-fade-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>Add Family Member</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Create a new account for Mom, Dad, or anyone in the family.</p>
              </div>
              <button className="btn-icon" onClick={() => setShowAddMemberModal(false)}><X size={20} /></button>
            </div>

            {addMemberSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '13px', marginBottom: '16px', background: '#d1fae5', padding: '12px', borderRadius: '12px' }}>
                <ShieldCheck size={18} />
                <span>{addMemberSuccess}</span>
              </div>
            )}

            {addMemberError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '13px', marginBottom: '16px', background: '#fee2e2', padding: '12px', borderRadius: '12px' }}>
                <ShieldAlert size={18} />
                <span>{addMemberError}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setAddMemberError('');
              setAddMemberSuccess('');
              try {
                const res = await fetch(`${API_BASE}/auth/signup`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(addMemberForm)
                });
                const data = await res.json();
                if (!res.ok) {
                  setAddMemberError(data.error || 'Failed to create account');
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
                <input
                  type="text"
                  placeholder="e.g. Jane Doe (Mom)"
                  className="input-field"
                  value={addMemberForm.name}
                  onChange={e => setAddMemberForm({ ...addMemberForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Phone Number *</label>
                <input
                  type="text"
                  placeholder="+1234567890"
                  className="input-field"
                  value={addMemberForm.phone}
                  onChange={e => setAddMemberForm({ ...addMemberForm, phone: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                <input
                  type="email"
                  placeholder="mom@family.com"
                  className="input-field"
                  value={addMemberForm.email}
                  onChange={e => setAddMemberForm({ ...addMemberForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Password *</label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  className="input-field"
                  value={addMemberForm.password}
                  onChange={e => setAddMemberForm({ ...addMemberForm, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Family Role *</label>
                <select
                  className="input-field"
                  value={addMemberForm.role}
                  onChange={e => setAddMemberForm({ ...addMemberForm, role: e.target.value })}
                >
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Sibling">Sibling</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Profile Photo URL (optional)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  className="input-field"
                  value={addMemberForm.profilePhoto}
                  onChange={e => setAddMemberForm({ ...addMemberForm, profilePhoto: e.target.value })}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>💡 Leave empty for a default avatar</div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center', padding: '12px', borderRadius: '12px' }}
                >
                  <UserPlus size={16} />
                  Add to Family
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled inline helpers to support high fidelity transitions */}
      <style>{`
        /* --- Extra Styling overrides --- */
        /* Fix for scrollable areas on mobile */
        .sidebar {
          overflow: hidden;
        }
        html, body, #root {
          height: 100%;
          overflow: hidden;
        }
        /* Fix modal scrolling */
        .modal-card {
          max-height: 90vh;
          overflow-y: auto;
        }
        .chat-thread-row:hover {
          background-color: var(--bg-tertiary) !important;
        }
        .user-row-hover:hover {
          background-color: var(--bg-tertiary);
        }
        .msg-actions-row button:hover {
          color: var(--color-primary) !important;
        }
        .messages-scroller > div:hover .msg-actions-row {
          opacity: 1 !important;
        }
        /* Ensure messages scroller fills and scrolls correctly */
        .messages-scroller {
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Bottom Navbar Items styling */
        .nav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--text-secondary);
          font-size: 11px;
          gap: 4px;
          flex: 1;
          height: 100%;
          justify-content: center;
          transition: color var(--transition-fast);
          background: none;
          border: none;
          cursor: pointer;
        }
        .nav-btn.active {
          color: var(--color-primary);
          font-weight: 700;
        }
        .nav-btn span {
          font-size: 10px;
        }

        /* --- Modals backdrop layout --- */
        .modal-backdrop-blur {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 500;
        }
        .modal-card {
          width: 90%;
          max-width: 440px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-lg);
        }

        /* --- Status Stories Viewer Layout --- */
        .story-overlay-bg {
          position: fixed;
          top:0; left:0; right:0; bottom:0;
          background: #000;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .story-viewer-modal {
          width: 100%;
          max-width: 480px;
          height: 100%;
          max-height: 850px;
          display: flex;
          flex-direction: column;
          position: relative;
          color: #fff;
        }
        .story-progress-bar-container {
          display: flex;
          gap: 4px;
          padding: 10px 20px;
          position: absolute;
          top: 0; left: 0; right: 0;
          z-index: 20;
        }
        .story-progress-bg {
          flex: 1;
          height: 3px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          overflow: hidden;
        }
        .story-progress-fill {
          height: 100%;
          width: 0;
          background: #fff;
        }
        .story-progress-fill.completed {
          width: 100%;
        }
        .story-progress-fill.active {
          animation: storyProgress linear forwards;
        }
        @keyframes storyProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .story-viewer-header {
          padding: 24px 20px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 20;
        }
        .story-content-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .story-text-container {
          font-family: var(--font-display);
          font-size: 26px;
          text-align: center;
          padding: 30px;
          font-weight: 700;
          background: linear-gradient(135deg, #1e2640 0%, #111827 100%);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .story-image-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .story-image-container img {
          max-width: 100%;
          max-height: 80%;
          object-fit: contain;
        }
        .story-image-caption {
          padding: 16px;
          text-align: center;
          background: rgba(0,0,0,0.6);
          width: 100%;
          font-size: 15px;
          position: absolute;
          bottom: 40px;
        }
        .story-viewers-tag {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.5);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          display: flex;
          align-items: center;
          color: #fff;
          z-index: 20;
        }

        /* --- Calling Interface UI --- */
        .calling-overlay-fullscreen {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(11, 15, 25, 0.9);
          backdrop-filter: blur(12px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .calling-card {
          width: 90%;
          max-width: 400px;
          padding: 40px 30px;
          border-radius: var(--radius-xl);
          text-align: center;
        }
        .btn-call {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: var(--shadow-md);
          transition: transform var(--transition-fast);
        }
        .btn-call:hover {
          transform: scale(1.05);
        }
        .btn-call.accept {
          background: var(--color-success);
        }
        .btn-call.hangup {
          background: var(--color-danger);
        }
        .btn-call-util {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: background var(--transition-fast);
        }
        .btn-call-util.active {
          background: rgba(255,255,255,0.2);
        }
      `}</style>

    </div>
  );
}
