import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  MessageSquare, Phone, Camera, Brain, Sparkles, Plus, 
  Search, Send, MoreVertical, Paperclip, Smile, Mic, Volume2, 
  Video, PhoneOff, Pin, UserPlus, Menu, Sun, Moon, LogOut, 
  Settings, Globe, ShieldAlert, Trash2, Check, CheckCheck, Eye, 
  X, Info, ChevronRight, BarChart2, ShieldCheck, HelpCircle,
  Image, Users, Heart, Share2, MessageCircle, Lock, EyeOff, CheckSquare, Bell, Cloud, Award
} from 'lucide-react';

const API_BASE = '/api';
const SOCKET_BASE = window.location.hostname.includes('onrender.com')
  ? 'https://familysphere-uf95.onrender.com'
  : `${window.location.protocol}//${window.location.hostname}:5000`;

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${SOCKET_BASE}${url}`;
};

const renderAvatar = (u, size = 'md', borderStyle = {}) => {
  const photoUrl = u?.profilePhoto || u?.avatar;
  if (photoUrl && photoUrl.trim() !== '' && !photoUrl.includes('placeholder.com') && !photoUrl.includes('ui-avatars.com')) {
    return (
      <img
        src={resolveMediaUrl(photoUrl)}
        alt={u?.name}
        className={`avatar ${size}`}
        style={borderStyle}
      />
    );
  }
  
  const initials = u?.name ? u.name.charAt(0).toUpperCase() : '?';
  const sizeMap = {
    sm: { width: '32px', height: '32px', fontSize: '11px' },
    md: { width: '44px', height: '44px', fontSize: '15px' },
    lg: { width: '80px', height: '80px', fontSize: '26px' }
  };
  const sizeStyle = sizeMap[size] || sizeMap.md;
  
  const role = u?.role?.toLowerCase() || '';
  let gradient = 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)';
  if (role === 'ai') {
    gradient = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  } else if (role === 'parent') {
    gradient = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
  } else if (role === 'grandparent') {
    gradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  } else if (role === 'child') {
    gradient = 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)';
  }

  return (
    <div
      className={`avatar ${size}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: gradient,
        color: '#ffffff',
        fontWeight: '800',
        fontFamily: 'var(--font-display)',
        borderRadius: '50%',
        userSelect: 'none',
        ...sizeStyle,
        ...borderStyle
      }}
    >
      {initials}
    </div>
  );
};

export default function App() {
  // --- UI & Styling State ---
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('chats'); // 'chats', 'status', 'calls', 'ai'
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

  // --- Active Users State ---
  const [activeUsers, setActiveUsers] = useState({ count: 0, users: [] });

  // --- Chat State ---
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const activeChatRef = useRef(null);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState({}); // { chatId: { userId: boolean } }
  const [usersList, setUsersList] = useState([]); // All users for starting new chats
  const [blockedUsers, setBlockedUsers] = useState([]);
  const fileInputRef = useRef(null);
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
  const [newStory, setNewStory] = useState({ type: 'text', content: '', mediaUrl: 'linear-gradient(135deg, #1e2640 0%, #111827 100%)' });
  const [isUploadingStoryMedia, setIsUploadingStoryMedia] = useState(false);
  const [storyPaused, setStoryPaused] = useState(false);
  const [showStoryViewersList, setShowStoryViewersList] = useState(false);
  const [storyReplyText, setStoryReplyText] = useState('');

  // --- Calling State (WebRTC & Loopback simulation) ---
  const [activeCall, setActiveCall] = useState(null); // { id, caller, receiver, type, status: 'ringing'|'connected'|'ended' }
  const activeCallRef = useRef(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);
  const [callTimer, setCallTimer] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callHistory, setCallHistory] = useState([]);

  // --- AI Settings State ---
  const [aiAssistantLogs, setAiAssistantLogs] = useState([
    { role: 'assistant', content: 'Hello! I am your FamilySphere AI helper. Ask me about chores division, meal planning, or upcoming schedules! 🤖' }
  ]);
  const [aiAssistantInput, setAiAssistantInput] = useState('');
  const [autoModerateActive, setAutoModerateActive] = useState(true);
  const [translateTarget, setTranslateTarget] = useState('Spanish');

  // --- Expanded Social Features State ---
  const [feedPosts, setFeedPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');

  const [sharedPhotos, setSharedPhotos] = useState([]);       // API-backed memories
  const [newMemoryTitle, setNewMemoryTitle] = useState('');
  const [newMemoryDesc, setNewMemoryDesc] = useState('');
  const [newMemoryUrl, setNewMemoryUrl] = useState('');         // Google Drive / external URL
  const [newMemorySourceType, setNewMemorySourceType] = useState('local'); // 'local'|'googledrive'|'url'
  const [memoryUploadFile, setMemoryUploadFile] = useState(null); // File object for local upload
  const [memoryUploadPreview, setMemoryUploadPreview] = useState(''); // data-URL preview
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoriesError, setMemoriesError] = useState('');
  const [memoryUploading, setMemoryUploading] = useState(false);
  const memoryFileRef = useRef(null);

  const [circlesList, setCirclesList] = useState([
    { id: 1, name: 'Kitchen Duties 🍽️', description: 'Coordinating dish washing, grocery lists, and weekly meal prep.', memberCount: 3 },
    { id: 2, name: 'Sunday Outings 🚗', description: 'Planning weekend hikes, dinners, and family road trips.', memberCount: 4 },
    { id: 3, name: 'Tech Support 💻', description: 'Helping grandparents set up their devices and troubleshooting WiFi issues.', memberCount: 2 }
  ]);
  const [newCircleName, setNewCircleName] = useState('');
  const [newCircleDesc, setNewCircleDesc] = useState('');

  // --- Granular Settings Toggles ---
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
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState('account');

  // --- Refs ---
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingSignalRef = useRef(null);

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
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      // Connect WebSockets
      initSocket();
      
      // Load tabs data
      fetchChats();
      fetchStories();
      fetchUsersList();
      fetchBlockedUsers();
      fetchCallHistory();
      fetchMemories();

      return () => {
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



  // Handles camera streams for active call overlay
  useEffect(() => {
    const shouldSetupMedia = activeCall && (
      activeCall.status === 'connected' ||
      (activeCall.status === 'ringing' && activeCall.caller?.id === user?.id)
    );

    if (shouldSetupMedia) {
      setupMediaStreams();
    } else {
      stopMediaStreams();
    }
  }, [activeCall?.status]);

  // Handle local microphone mute state changes
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  // Dynamically assign local stream to localVideoRef when element renders
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall?.status, activeCall?.type]);

  // Dynamically assign remote stream to remoteVideoRef when element renders
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall?.status, activeCall?.type]);

  // ==========================================================================
  // WebSockets Service Setup
  // ==========================================================================
  const initSocket = () => {
    const socket = io(SOCKET_BASE, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.emit('auth', user.id);

    // Incoming messages
    socket.on('new_message', (msg) => {
      // If message is in currently open chat, append
      if (activeChatRef.current && msg.chatId === activeChatRef.current.id) {
        setMessages(prev => {
          // Deduplicate if already present
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        socket.emit('mark_chat_read', { chatId: msg.chatId, userId: user.id });
      } else {
        socket.emit('mark_chat_delivered', { chatId: msg.chatId, userId: user.id });
        if (msg.senderId !== user.id && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`New message from ${msg.sender?.name || 'FamilyMember'}`, {
            body: msg.content,
            icon: msg.sender?.profilePhoto || '/logo.png'
          });
        }
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



    // Live active users count
    socket.on('active_users_update', (data) => {
      setActiveUsers(data);
    });

    // WebRTC Signaling
    socket.on('incoming_call', async (data) => {
      const { from, signal, type, chatId, dbId } = data;
      
      if (signal && signal.type === 'offer') {
        pendingSignalRef.current = signal;
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socketRef.current.emit('accept_call', {
              toUser: from.id,
              signalData: answer
            });
            return;
          } catch (e) {
            console.error('Error handling WebRTC offer:', e);
          }
        }
      }

      setActiveCall(prev => {
        if (prev && (prev.status === 'connected' || prev.status === 'ringing')) {
          return prev;
        }
        playRingtone();
        return {
          id: Math.random().toString(),
          caller: from,
          receiver: user,
          type,
          status: 'ringing',
          signal,
          dbId
        };
      });
    });

    socket.on('call_accepted', async (signalData) => {
      stopRingtone();
      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
      
      if (activeCallRef.current && activeCallRef.current.dbId) {
        logCallUpdate(activeCallRef.current.dbId, 'connected');
      }

      if (signalData && signalData.type === 'answer') {
        pendingSignalRef.current = signalData;
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signalData));
            pendingSignalRef.current = null;
          } catch (e) {
            console.error('Error setting remote answer:', e);
          }
        }
      }
    });

    socket.on('webrtc_ice', async (data) => {
      const { candidate } = data;
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE Candidate:', e);
        }
      }
    });

    socket.on('call_declined', () => {
      stopRingtone();
      if (activeCallRef.current && activeCallRef.current.dbId) {
        logCallUpdate(activeCallRef.current.dbId, 'declined');
      }
      cleanupCallState();
    });

    socket.on('call_ended', () => {
      if (activeCallRef.current && activeCallRef.current.dbId) {
        const finalStatus = activeCallRef.current.status === 'connected' ? 'completed' : 'missed';
        logCallUpdate(activeCallRef.current.dbId, finalStatus);
      }
      cleanupCallState();
    });
  };

  const cleanupCallState = () => {
    setActiveCall(null);
    stopMediaStreams();
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }
    pendingSignalRef.current = null;
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
        const data = await res.json().catch(() => ({}));
        if (data.code === 'SESSION_REPLACED') {
          handleLogout('⚠️ You have been logged out because your account was signed in on another device.');
        } else {
          handleLogout();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper: check if any API response indicates session was replaced
  const checkSessionKicked = async (res) => {
    if (res.status === 401) {
      const data = await res.clone().json().catch(() => ({}));
      if (data.code === 'SESSION_REPLACED') {
        handleLogout('⚠️ You have been logged out because your account was signed in on another device.');
        return true;
      }
    }
    return false;
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

  // ── Memories API Functions ─────────────────────────────────────────────────

  const fetchMemories = async () => {
    setMemoriesLoading(true);
    setMemoriesError('');
    try {
      const res = await fetch(`${API_BASE}/memories`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSharedPhotos(data);
      } else {
        setMemoriesError('Failed to load memories.');
      }
    } catch (err) {
      setMemoriesError('Network error loading memories.');
    } finally {
      setMemoriesLoading(false);
    }
  };

  // Called when user selects a local file via the file picker
  const handleMemoryFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMemoryUploadFile(file);
    // Generate a local preview URL
    const previewUrl = URL.createObjectURL(file);
    setMemoryUploadPreview(previewUrl);
    setNewMemorySourceType('local');
    setNewMemoryUrl(''); // clear manual URL if file selected
  };

  // Submit a new memory — uploads file if local, or uses the provided URL
  const handleMemorySubmit = async (e) => {
    e.preventDefault();
    if (!newMemoryTitle.trim()) return;
    if (newMemorySourceType === 'local' && !memoryUploadFile) {
      setMemoriesError('Please select a file to upload.');
      return;
    }
    if ((newMemorySourceType === 'googledrive' || newMemorySourceType === 'url') && !newMemoryUrl.trim()) {
      setMemoriesError('Please enter a URL.');
      return;
    }

    setMemoryUploading(true);
    setMemoriesError('');

    try {
      let finalMediaUrl = newMemoryUrl.trim();
      let finalSourceType = newMemorySourceType;

      // Auto-detect Google Drive URL and adjust sourceType accordingly
      if (finalSourceType !== 'local' && (finalMediaUrl.includes('drive.google.com') || finalMediaUrl.includes('docs.google.com'))) {
        finalSourceType = 'googledrive';
      }

      // Step 1: If local file, upload it first via multer endpoint
      if (newMemorySourceType === 'local' && memoryUploadFile) {
        const formData = new FormData();
        formData.append('file', memoryUploadFile);
        // Use SOCKET_BASE (direct backend) NOT API_BASE (Vite proxy).
        // Vite proxy corrupts multipart/form-data boundaries for binary uploads.
        const uploadRes = await fetch(`${SOCKET_BASE}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          setMemoriesError(err.error || 'File upload failed.');
          setMemoryUploading(false);
          return;
        }
        const uploadData = await uploadRes.json();
        finalMediaUrl = uploadData.url;
      }

      // Step 2: Save memory metadata to DB
      const memRes = await fetch(`${API_BASE}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newMemoryTitle.trim(),
          description: newMemoryDesc.trim(),
          mediaUrl: finalMediaUrl,
          sourceType: finalSourceType,
        }),
      });

      if (memRes.ok) {
        const newMem = await memRes.json();
        setSharedPhotos(prev => [newMem, ...prev]);
        // Reset form
        setNewMemoryTitle('');
        setNewMemoryDesc('');
        setNewMemoryUrl('');
        setNewMemorySourceType('local');
        setMemoryUploadFile(null);
        setMemoryUploadPreview('');
        if (memoryFileRef.current) memoryFileRef.current.value = '';
      } else {
        const err = await memRes.json();
        setMemoriesError(err.error || 'Failed to save memory.');
      }
    } catch (err) {
      setMemoriesError('Network error. Please try again.');
    } finally {
      setMemoryUploading(false);
    }
  };

  // Delete a memory (owner only)
  const handleDeleteMemory = async (memoryId) => {
    try {
      const res = await fetch(`${API_BASE}/memories/${memoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setSharedPhotos(prev => prev.filter(m => m.id !== memoryId));
      }
    } catch (err) {
      console.error('Delete memory error:', err);
    }
  };

  // Helper to check if a URL belongs to Google Drive or Docs
  const isGoogleDriveUrl = (url) => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com');
  };

  // Resolve a memory's mediaUrl to a displayable URL
  // Handles: local server paths, Google Drive share links, and external URLs
  const resolveMemoryMedia = (mediaUrl) => {
    if (!mediaUrl) return '';

    // Check if it's a Google Drive/Doc folder
    const folderMatch = mediaUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
      return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
    }

    // Check if it's a Google Drive/Doc file
    const dMatch = mediaUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const idParamMatch = mediaUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const driveId = (dMatch && dMatch[1]) || (idParamMatch && idParamMatch[1]);
    
    if (driveId) {
      if (mediaUrl.includes('/document/')) {
        return `https://docs.google.com/document/d/${driveId}/preview`;
      }
      if (mediaUrl.includes('/presentation/')) {
        return `https://docs.google.com/presentation/d/${driveId}/preview`;
      }
      if (mediaUrl.includes('/spreadsheets/')) {
        return `https://docs.google.com/spreadsheets/d/${driveId}/preview`;
      }
      return `https://drive.google.com/file/d/${driveId}/preview`;
    }

    // Already absolute URL
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      return mediaUrl;
    }
    // Local server path — prepend backend base
    return resolveMediaUrl(mediaUrl);
  };

  // Is this media a video? (checks extension or mimetype hint)
  const isVideoMedia = (mediaUrl, sourceType) => {
    if (sourceType === 'googledrive' || isGoogleDriveUrl(mediaUrl)) return false; // always use iframe for Drive
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mpeg', '.mpg'];
    return videoExts.some(ext => mediaUrl?.toLowerCase().endsWith(ext));
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

  const fetchBlockedUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/blocked`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockUser = async (blockedId) => {
    try {
      const res = await fetch(`${API_BASE}/users/block`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ blockedId })
      });
      if (res.ok) {
        fetchBlockedUsers();
        fetchChats();
        fetchUsersList();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblockUser = async (blockedId) => {
    try {
      const res = await fetch(`${API_BASE}/users/unblock`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ blockedId })
      });
      if (res.ok) {
        fetchBlockedUsers();
        fetchChats();
        fetchUsersList();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm('Are you sure you want to delete this chat thread?')) return;
    try {
      const res = await fetch(`${API_BASE}/chats/${chatId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setActiveChat(null);
        fetchChats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    // Use FormData (multipart/form-data) — multer on the backend expects this
    const formData = new FormData();
    formData.append('file', file);

    try {
      // NOTE: Use SOCKET_BASE (direct backend) NOT API_BASE (Vite proxy) for multipart uploads.
      // The Vite dev proxy corrupts multipart/form-data boundaries — bypass it entirely.
      const res = await fetch(`${SOCKET_BASE}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        // Do NOT set Content-Type — browser sets it automatically with the correct boundary
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const isVideo = file.type.startsWith('video/');
        if (socketRef.current) {
          socketRef.current.emit('send_message', {
            chatId: activeChat.id,
            senderId: user.id,
            content: isVideo ? `Shared a video: ${file.name}` : `Shared an image: ${file.name}`,
            type: isVideo ? 'video' : 'image',
            mediaUrl: data.url,
          });
        }
      } else {
        const err = await res.json();
        console.error('File upload error:', err);
      }
    } catch (err) {
      console.error('File upload error:', err);
    }
  };

  const fetchCallHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/calls`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCallHistory(data);
      }
    } catch (err) {
      console.error('Fetch call history error:', err);
    }
  };

  const logCallStart = async (receiverId, type, status = 'ringing', chatId = null) => {
    try {
      const res = await fetch(`${API_BASE}/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId, type, status, chatId })
      });
      if (res.ok) {
        const data = await res.json();
        fetchCallHistory();
        return data;
      }
    } catch (err) {
      console.error('Log call start error:', err);
    }
    return null;
  };

  const logCallUpdate = async (callDbId, status) => {
    if (!callDbId) return null;
    try {
      const res = await fetch(`${API_BASE}/calls/${callDbId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const data = await res.json();
        fetchCallHistory();
        return data;
      }
    } catch (err) {
      console.error('Log call update error:', err);
    }
    return null;
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
    const requestBody = authMode === 'login'
      ? { username: authForm.name, password: authForm.password }
      : authForm;
    
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
        const errMsg = typeof data?.error === 'string' ? data.error
                     : typeof data?.message === 'string' ? data.message
                     : typeof data?.error === 'object' ? JSON.stringify(data.error)
                     : 'Authentication failed';
        setAuthError(errMsg);
        return;
      }
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data);
    } catch (err) {
      setAuthError('Connection server error. Please make sure backend is running.');
    }
  };

  const handleLogout = (reason) => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setActiveChat(null);
    setMessages([]);
    if (reason) {
      setTimeout(() => alert(reason), 100);
    }
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
    if (socketRef.current) {
      socketRef.current.emit('typing', { chatId: activeChat.id, userId: user.id, isTyping: false });
    }
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
        setNewStory({ type: 'text', content: '', mediaUrl: 'linear-gradient(135deg, #1e2640 0%, #111827 100%)' });
        setShowStoryCreator(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStoryMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingStoryMedia(true);
    try {
      // Use FormData (multer) — NOT base64 JSON (old broken format)
      // Use SOCKET_BASE directly to bypass Vite proxy multipart corruption
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${SOCKET_BASE}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        // Resolve to full URL so the preview image loads correctly
        setNewStory(prev => ({ ...prev, mediaUrl: `${SOCKET_BASE}${data.url}` }));
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Story image upload error:', err.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Story image upload error:', err);
    } finally {
      setIsUploadingStoryMedia(false);
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Delete this status update?')) return;
    try {
      const res = await fetch(`${API_BASE}/stories/${storyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchStories();
        if (activeStoryViewer) {
          const { stories: list, index } = activeStoryViewer;
          if (index < list.length - 1) {
            setActiveStoryViewer(prev => ({ ...prev, index: index + 1 }));
          } else {
            setActiveStoryViewer(null);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReactToStory = async (storyId, emoji) => {
    try {
      const res = await fetch(`${API_BASE}/stories/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ storyId, emoji })
      });
      if (res.ok) {
        fetchStories();
        if (activeStoryViewer) {
          const targetUserId = activeStoryViewer.user.id;
          const storyContent = activeStoryViewer.stories[activeStoryViewer.index];
          const chatRes = await fetch(`${API_BASE}/chats`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ isGroup: false, participantIds: [targetUserId] })
          });
          if (chatRes.ok) {
            const chatData = await chatRes.json();
            if (socketRef.current) {
              socketRef.current.emit('send_message', {
                chatId: chatData.id,
                senderId: user.id,
                content: `Reacted ${emoji} to status: "${storyContent.content || (storyContent.type === 'image' ? 'Photo Status' : '')}"`,
                type: 'text'
              });
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendStoryReply = async (e) => {
    e.preventDefault();
    if (!storyReplyText.trim() || !activeStoryViewer) return;
    
    const targetUserId = activeStoryViewer.user.id;
    const storyContent = activeStoryViewer.stories[activeStoryViewer.index];
    
    try {
      const chatRes = await fetch(`${API_BASE}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isGroup: false, participantIds: [targetUserId] })
      });
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        if (socketRef.current) {
          socketRef.current.emit('send_message', {
            chatId: chatData.id,
            senderId: user.id,
            content: `Replied to status: "${storyReplyText}"\n\n> Status quote: "${storyContent.content || (storyContent.type === 'image' ? 'Photo Status' : '')}"`,
            type: 'text'
          });
        }
        setStoryReplyText('');
        setStoryPaused(false);
        setActiveStoryViewer(null);
        alert('Reply sent successfully!');
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
      fetchStories(); // reload views count/list
    } catch (err) {
      console.error(err);
    }
  };

  const renderActiveStory = () => {
    if (!activeStoryViewer) return null;
    const { stories: list, index } = activeStoryViewer;
    const story = list[index];

    const isOwnStory = story.userId === user.id;
    const reactions = JSON.parse(story.reactions || '{}');
    const reactionEntries = Object.entries(reactions);

    const handleTap = (e) => {
      // Don't trigger tap navigation if user clicked inside drawer, reply box, or reaction buttons
      if (e.target.closest('.interactive-area')) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clickRatio = x / rect.width;
      
      if (clickRatio < 0.35) {
        // Go to previous story
        if (index > 0) {
          setActiveStoryViewer(prev => ({ ...prev, index: index - 1 }));
          handleViewStory(list[index - 1].id);
        } else {
          // Go to previous user's story
          const activeUserIdx = stories.findIndex(g => g.user.id === activeStoryViewer.user.id);
          if (activeUserIdx > 0) {
            const prevGroup = stories[activeUserIdx - 1];
            setActiveStoryViewer({ user: prevGroup.user, stories: prevGroup.stories, index: prevGroup.stories.length - 1 });
            handleViewStory(prevGroup.stories[prevGroup.stories.length - 1].id);
          }
        }
      } else {
        // Go to next story
        if (index < list.length - 1) {
          setActiveStoryViewer(prev => ({ ...prev, index: index + 1 }));
          handleViewStory(list[index + 1].id);
        } else {
          // Go to next user's story
          const activeUserIdx = stories.findIndex(g => g.user.id === activeStoryViewer.user.id);
          if (activeUserIdx < stories.length - 1) {
            const nextGroup = stories[activeUserIdx + 1];
            setActiveStoryViewer({ user: nextGroup.user, stories: nextGroup.stories, index: 0 });
            handleViewStory(nextGroup.stories[0].id);
          } else {
            setActiveStoryViewer(null);
          }
        }
      }
    };

    return (
      <div className="story-overlay-bg">
        <div className="story-viewer-modal animate-fade-in">
          {/* Status Progression Bars */}
          <div className="story-progress-bar-container">
            {list.map((s, idx) => (
              <div key={s.id} className="story-progress-bg">
                <div 
                  className={`story-progress-fill ${idx < index ? 'completed' : idx === index ? 'active' : ''}`}
                  style={{ 
                    animationDuration: idx === index ? '5s' : '0s',
                    animationPlayState: (idx === index && storyPaused) ? 'paused' : 'running'
                  }}
                  onAnimationEnd={() => {
                    if (storyPaused) return; // Wait if paused
                    if (index < list.length - 1) {
                      setActiveStoryViewer(prev => ({ ...prev, index: index + 1 }));
                      handleViewStory(list[index + 1].id);
                    } else {
                      // Automatically advance to next user's status or exit
                      const activeUserIdx = stories.findIndex(g => g.user.id === activeStoryViewer.user.id);
                      if (activeUserIdx < stories.length - 1) {
                        const nextGroup = stories[activeUserIdx + 1];
                        setActiveStoryViewer({ user: nextGroup.user, stories: nextGroup.stories, index: 0 });
                        handleViewStory(nextGroup.stories[0].id);
                      } else {
                        setActiveStoryViewer(null);
                      }
                    }
                  }}
                />
              </div>
            ))}
          </div>

          {/* Viewer Header */}
          <div className="story-viewer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {renderAvatar(activeStoryViewer.user, 'sm')}
              <div>
                <div style={{ fontWeight: '600' }}>{activeStoryViewer.user.name}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{new Date(story.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isOwnStory && (
                <button 
                  className="btn-icon interactive-area" 
                  style={{ color: '#ef4444' }} 
                  onClick={() => handleDeleteStory(story.id)}
                  title="Delete status"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button className="btn-icon interactive-area" style={{ color: '#fff' }} onClick={() => setActiveStoryViewer(null)}><X size={20} /></button>
            </div>
          </div>

          {/* Eye Icon for Viewers */}
          {isOwnStory && (
            <div 
              className="story-viewers-tag interactive-area" 
              style={{ cursor: 'pointer', zIndex: 30 }}
              onClick={() => {
                setStoryPaused(true);
                setShowStoryViewersList(true);
              }}
            >
              <Eye size={14} style={{ marginRight: '5px' }} />
              <span>{story.StoryViews?.length || 0} views</span>
            </div>
          )}

          {/* Content Box */}
          <div className="story-content-body" onClick={handleTap} style={{ cursor: 'pointer' }}>
            {story.type === 'text' ? (
              <div 
                className="story-text-container" 
                style={{ 
                  background: (story.mediaUrl && story.mediaUrl.startsWith('linear-gradient')) ? story.mediaUrl : undefined 
                }}
              >
                {story.content}
              </div>
            ) : (
              <div className="story-image-container">
                <img src={resolveMediaUrl(story.mediaUrl)} alt="Story Content" />
                {story.content && <div className="story-image-caption">{story.content}</div>}
              </div>
            )}

            {/* Float Story Reactions Display */}
            {reactionEntries.length > 0 && (
              <div 
                className="interactive-area"
                style={{
                  position: 'absolute',
                  bottom: isOwnStory ? '60px' : '150px',
                  left: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: 'rgba(0,0,0,0.5)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  maxWidth: '80%'
                }}
              >
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Story Reactions</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {reactionEntries.map(([uid, rEmoji]) => {
                    // Look up user name
                    const rUser = usersList.find(u => u.id === uid) || (uid === user.id ? user : null);
                    return (
                      <span key={uid} title={rUser?.name || 'User'} style={{ fontSize: '16px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span>{rEmoji}</span>
                        <span style={{ fontSize: '10px' }}>{rUser?.name?.split(' ')[0]}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Reaction & Reply Box (Only for others' stories) */}
          {!isOwnStory && (
            <div className="interactive-area" style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.4))',
              padding: '16px 20px 30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 30
            }}>
              {/* Emojis Reactions row */}
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                {['❤️', '😂', '😮', '😢', '🙏', '👍'].map(em => (
                  <button 
                    key={em} 
                    style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
                    className="hover-scale"
                    onClick={() => handleReactToStory(story.id, em)}
                  >
                    {em}
                  </button>
                ))}
              </div>

              {/* Reply form */}
              <form onSubmit={handleSendStoryReply} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder={`Reply to ${activeStoryViewer.user.name}...`} 
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '24px',
                    padding: '10px 16px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                  value={storyReplyText}
                  onChange={e => setStoryReplyText(e.target.value)}
                  onFocus={() => setStoryPaused(true)}
                  onBlur={() => {
                    if (!storyReplyText.trim()) setStoryPaused(false);
                  }}
                />
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}

          {/* Viewers Drawer list */}
          {isOwnStory && showStoryViewersList && (
            <div 
              className="modal-backdrop-blur interactive-area"
              style={{ position: 'absolute', zIndex: 100 }}
              onClick={() => {
                setShowStoryViewersList(false);
                setStoryPaused(false);
              }}
            >
              <div 
                className="modal-card animate-slide-up"
                style={{ 
                  position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', maxWidth: '480px', margin: '0 auto',
                  borderRadius: '20px 20px 0 0', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <h4 style={{ fontWeight: '700', fontSize: '15px' }}>Views ({story.StoryViews?.length || 0})</h4>
                  <button className="btn-icon" onClick={() => {
                    setShowStoryViewersList(false);
                    setStoryPaused(false);
                  }}><X size={20} /></button>
                </div>

                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(!story.StoryViews || story.StoryViews.length === 0) ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No views yet.
                    </div>
                  ) : (
                    story.StoryViews.map(view => (
                      <div key={view.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {renderAvatar(view.User, 'sm')}
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '13px' }}>{view.User?.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{view.User?.role}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {new Date(view.viewedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

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

    // Persist call start in SQLite Database
    if (partner) {
      logCallStart(partner.id, type, 'ringing', activeChat.id).then(callLog => {
        if (callLog) {
          setActiveCall(prev => prev ? { ...prev, dbId: callLog.id } : null);
          // The real WebRTC offer is emitted after media setup creates the peer connection.
        }
      });
    }

    setTimeout(() => {
      if (partner?.role === 'AI') {
        stopRingtone();
        setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
      }
    }, 4000);
  };

  const acceptInboundCall = () => {
    stopRingtone();
    if (activeCall) {
      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
      if (activeCall.dbId) {
        logCallUpdate(activeCall.dbId, 'connected');
      }
    }
  };

  const declineCall = () => {
    stopRingtone();
    if (socketRef.current && activeCall) {
      socketRef.current.emit('decline_call', {
        toUser: activeCall.caller.id
      });
      if (activeCall.dbId) {
        logCallUpdate(activeCall.dbId, 'declined');
      }
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
      if (activeCall.dbId) {
        const finalStatus = activeCall.status === 'connected' ? 'completed' : 'missed';
        logCallUpdate(activeCall.dbId, finalStatus);
      }
    }
    cleanupCallState();
  };

  const createPeerConnection = (partnerId, localStreamObj) => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Add local tracks to the connection
    if (localStreamObj) {
      localStreamObj.getTracks().forEach(track => {
        pc.addTrack(track, localStreamObj);
      });
    }

    // Handle remote track/stream
    pc.ontrack = (event) => {
      const remoteStreamObj = event.streams[0];
      setRemoteStream(remoteStreamObj);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamObj;
      }
    };

    // Relay ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_ice', {
          toUser: partnerId,
          candidate: event.candidate
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const createMockStream = (isVideo) => {
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
      ctx.fillText(isVideo ? "Simulating video call..." : "Simulating voice call...", 80, 220);
      
      angle += 0.05;
      requestAnimationFrame(drawMock);
    };
    
    drawMock();
    const mockStream = canvas.captureStream(30);

    // Create a silent audio track using Web Audio API
    try {
      const ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ctxAudio.createMediaStreamDestination();
      const silenceTrack = dest.stream.getAudioTracks()[0];
      if (silenceTrack) {
        mockStream.addTrack(silenceTrack);
      }
    } catch (e) {
      console.warn("Could not create mock audio track:", e);
    }

    return mockStream;
  };

  const setupMediaStreams = async () => {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: activeCall?.type === 'video',
        audio: true
      });
    } catch (e) {
      console.warn("Could not load real media hardware, generating simulated stream", e);
      stream = createMockStream(activeCall?.type === 'video');
    }

    setLocalStream(stream);
    localStreamRef.current = stream;

    // Simulate loopback stream for AI virtual assistant call
    const partner = activeCall?.caller.id === user.id ? activeCall?.receiver : activeCall?.caller;
    if (partner?.role === 'AI') {
      setRemoteStream(stream);
    }
    
    // Initialize Peer Connection
    const partnerId = partner?.id;
    if (partnerId && partner?.role !== 'AI') {
      const pc = createPeerConnection(partnerId, stream);
      
      // If we are the caller (we started the call)
      if (activeCall.caller.id === user.id) {
        // If we already received a pending answer, set it immediately
        if (pendingSignalRef.current && pendingSignalRef.current.type === 'answer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(pendingSignalRef.current));
            pendingSignalRef.current = null;
          } catch (e) {
            console.error('Error applying pending remote answer:', e);
          }
        } else if (!pc.remoteDescription && pc.signalingState === 'stable') {
          // Otherwise, create and send our offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socketRef.current) {
            socketRef.current.emit('call_user', {
              userToCall: partnerId,
              signalData: offer,
              fromUser: user,
              type: activeCall.type,
              chatId: activeChat?.id,
              dbId: activeCall.dbId
            });
          }
        } else {
          return;
        }
      } else {
        // We are the receiver, apply offer and generate answer
        const signalToApply = pendingSignalRef.current || activeCall.signal;
        if (signalToApply && signalToApply.type === 'offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalToApply));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current.emit('accept_call', {
              toUser: partnerId,
              signalData: answer
            });
            pendingSignalRef.current = null;
          } catch (e) {
            console.error('Error setting remote description on offer:', e);
          }
        }
      }
    }
  };

  const stopMediaStreams = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
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
              <img src="/logo.png" alt="FamilySphere Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.35)' }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.style.background = 'var(--gradient-premium)'; e.target.parentNode.style.display = 'flex'; e.target.parentNode.style.alignItems = 'center'; e.target.parentNode.style.justifyContent = 'center'; e.target.parentNode.innerHTML = '<span style="color:#fff;font-weight:800;font-size:24px">F</span>'; }} />
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
                    <option value="Host">Host</option>
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
            sender: { name: user.name, role: user.role, avatar: user.profilePhoto || '' },
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
                {renderAvatar({ name: post.sender.name, role: post.sender.role, profilePhoto: post.sender.avatar }, 'md')}
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
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: 'transparent', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: '800', color: 'var(--text-primary)' }}>
              📸 Shared Memories Album
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
              Upload photos &amp; videos, or link from Google Drive. All family memories in one place.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={fetchMemories}
              style={{ padding: '8px 16px', borderRadius: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}
            >
              🔄 Refresh
            </button>
            <Sparkles size={26} style={{ color: 'var(--color-primary)' }} />
          </div>
        </div>

        {/* Error banner */}
        {memoriesError && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '12px 16px', color: '#ef4444', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {memoriesError}</span>
            <button onClick={() => setMemoriesError('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Add Memory Form */}
        <form onSubmit={handleMemorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-secondary)', padding: '22px', borderRadius: '20px', border: '1px solid var(--border-glass)', maxWidth: '780px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>+ Add a New Memory</div>

          {/* Title + Description */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input
              type="text"
              placeholder="Memory title (e.g. Picnic 2024)…"
              className="input-field"
              style={{ background: 'var(--bg-tertiary)' }}
              value={newMemoryTitle}
              onChange={(e) => setNewMemoryTitle(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Description (optional)…"
              className="input-field"
              style={{ background: 'var(--bg-tertiary)' }}
              value={newMemoryDesc}
              onChange={(e) => setNewMemoryDesc(e.target.value)}
            />
          </div>

          {/* Source type toggle */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'local', label: '📁 Upload File' },
              { key: 'googledrive', label: '🔗 Google Drive' },
              { key: 'url', label: '🌐 External URL' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setNewMemorySourceType(key); setMemoryUploadFile(null); setMemoryUploadPreview(''); setNewMemoryUrl(''); }}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  border: newMemorySourceType === key ? '2px solid var(--color-primary)' : '1px solid var(--border-glass)',
                  background: newMemorySourceType === key ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                  color: newMemorySourceType === key ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Local file upload */}
          {newMemorySourceType === 'local' && (
            <div
              onClick={() => memoryFileRef.current?.click()}
              style={{
                border: '2px dashed var(--border-glass)', borderRadius: '14px', padding: '20px',
                textAlign: 'center', cursor: 'pointer', background: 'var(--bg-tertiary)',
                transition: 'border-color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
            >
              {memoryUploadPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                  {memoryUploadFile?.type?.startsWith('video/') ? (
                    <video src={memoryUploadPreview} style={{ height: '60px', borderRadius: '8px' }} muted />
                  ) : (
                    <img src={memoryUploadPreview} alt="preview" style={{ height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                  )}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{memoryUploadFile?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{(memoryUploadFile?.size / 1024 / 1024).toFixed(2)} MB · Click to change</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>📤</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Click to upload a photo or video</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', opacity: 0.7 }}>JPEG, PNG, GIF, WebP, MP4, WebM, MOV · Max 50MB</div>
                </div>
              )}
              <input
                ref={memoryFileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                style={{ display: 'none' }}
                onChange={handleMemoryFileSelect}
              />
            </div>
          )}

          {/* Google Drive / External URL input */}
          {(newMemorySourceType === 'googledrive' || newMemorySourceType === 'url') && (
            <input
              type="url"
              placeholder={newMemorySourceType === 'googledrive' ? 'Paste Google Drive share link…' : 'Paste external image/video URL…'}
              className="input-field"
              style={{ background: 'var(--bg-tertiary)' }}
              value={newMemoryUrl}
              onChange={(e) => setNewMemoryUrl(e.target.value)}
              required
            />
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={memoryUploading}
            style={{ alignSelf: 'flex-end', opacity: memoryUploading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {memoryUploading ? '⏳ Saving…' : '✨ Add Memory'}
          </button>
        </form>

        {/* Loading state */}
        {memoriesLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            ⏳ Loading memories…
          </div>
        )}

        {/* Empty state */}
        {!memoriesLoading && sharedPhotos.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '52px' }}>📷</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>No memories yet</div>
            <div style={{ fontSize: '13px' }}>Upload your first family photo or video above!</div>
          </div>
        )}

        {/* Memory Grid */}
        {!memoriesLoading && sharedPhotos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
            {sharedPhotos.map(memory => {
              const mediaUrl = resolveMemoryMedia(memory.mediaUrl);
              const isVideo = isVideoMedia(memory.mediaUrl, memory.sourceType);
              const isDrive = memory.sourceType === 'googledrive' || isGoogleDriveUrl(memory.mediaUrl);
              const uploaderName = memory.uploader?.name || 'Family';
              const isOwner = memory.userId === user?.id;

              return (
                <div
                  key={memory.id}
                  className="glass-card"
                  style={{ borderRadius: '20px', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                >
                  {/* Media area */}
                  <div style={{ position: 'relative', height: '220px', width: '100%', background: 'var(--bg-tertiary)' }}>
                    {isDrive ? (
                      <iframe
                        src={mediaUrl}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        allow="autoplay"
                        title={memory.title}
                      />
                    ) : isVideo ? (
                      <video
                        src={mediaUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt={memory.title}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}

                    {/* Source badge */}
                    <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '9px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {isDrive ? '📁 Drive' : isVideo ? '🎬 Video' : '📷 Photo'}
                    </span>

                    {/* Delete button (owner only) */}
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteMemory(memory.id)}
                        title="Delete memory"
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '12px', transition: 'opacity 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    {/* Uploader badge */}
                    <span style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '600' }}>
                      By: {uploaderName}
                    </span>
                  </div>

                  {/* Info area */}
                  <div style={{ padding: '16px 18px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{memory.title}</h4>
                    {memory.description && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: '1.5' }}>{memory.description}</p>
                    )}
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>
                      {new Date(memory.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              {renderAvatar(user, 'lg')}
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
                          {renderAvatar(u, 'sm')}
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
              <img src="/logo.png" alt="FamilySphere Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.35)' }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.style.background = 'var(--gradient-premium)'; e.target.parentNode.style.display = 'flex'; e.target.parentNode.style.alignItems = 'center'; e.target.parentNode.style.justifyContent = 'center'; e.target.parentNode.innerHTML = '<span style="color:#fff;font-weight:800;font-size:16px">F</span>'; }} />
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

        {/* Logged-In User Info Card */}
        <div style={{
          margin: '12px 16px',
          padding: '14px 16px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--color-primary-light) 0%, rgba(99,102,241,0.08) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Avatar with live dot */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {renderAvatar(user, 'md', { border: '2px solid rgba(99,102,241,0.5)' })}
            {/* Green online dot */}
            <div style={{
              position: 'absolute', bottom: '1px', right: '1px',
              width: '11px', height: '11px', borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid var(--bg-primary)',
            }} />
          </div>

          {/* User details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '10px', fontWeight: '700', padding: '2px 8px',
                borderRadius: '20px',
                background: user.role === 'Host' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'var(--color-primary)',
                color: '#fff',
                letterSpacing: '0.3px',
              }}>
                {user.role}
              </span>
              <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Online
              </span>
            </div>
          </div>
        </div>

        {/* 🟢 Live Active Users Panel */}
        <div style={{
          margin: '0 16px 12px',
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-glass)',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              {/* Pulsing dot */}
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <span style={{
                  width: '9px', height: '9px', borderRadius: '50%',
                  background: '#22c55e', display: 'block',
                  boxShadow: '0 0 0 0 rgba(34,197,94,0.6)',
                  animation: 'pulse-ring 1.4s ease-out infinite',
                }} />
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Active Now</span>
            </div>
            {/* Count badge */}
            <span style={{
              fontSize: '11px', fontWeight: '800',
              background: activeUsers.count > 0 ? '#22c55e' : '#94a3b8',
              color: '#fff',
              padding: '2px 9px',
              borderRadius: '20px',
              minWidth: '24px',
              textAlign: 'center',
            }}>
              {activeUsers.count}
            </span>
          </div>

          {/* User avatar bubbles */}
          {activeUsers.users.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '4px 0' }}>
              No users online yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {activeUsers.users.slice(0, 5).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  {/* Avatar + green dot */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {renderAvatar(u, 'sm', { border: '1.5px solid #22c55e', width: '28px', height: '28px' })}
                    <span style={{
                      position: 'absolute', bottom: '0px', right: '0px',
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: '#22c55e', border: '1.5px solid var(--bg-secondary)',
                      display: 'block'
                    }} />
                  </div>
                  {/* Name + role */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name} {u.id === user?.id ? <span style={{ color: '#6366f1', fontSize: '10px' }}>(You)</span> : ''}
                    </div>
                    <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: '500' }}>{u.role} · Online</div>
                  </div>
                </div>
              ))}
              {activeUsers.users.length > 5 && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  +{activeUsers.users.length - 5} more online
                </div>
              )}
            </div>
          )}
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
                      {chat.isGroup ? (
                        chat.avatar && !chat.avatar.includes('placeholder') ? (
                          <img src={resolveMediaUrl(chat.avatar)} className="avatar" alt="Avatar" />
                        ) : (
                          <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#fff', fontWeight: '800', borderRadius: '50%' }}>
                            {chat.name ? chat.name.charAt(0).toUpperCase() : 'G'}
                          </div>
                        )
                      ) : (
                        renderAvatar(displayMember, 'md')
                      )}
                      {!chat.isGroup && displayMember?.role !== 'AI' && (
                        <div className={`status-dot ${displayMember?.isOnline ? '' : 'offline'}`}></div>
                      )}
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
                <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={() => {
                  setNewStory({ type: 'text', content: '', mediaUrl: 'linear-gradient(135deg, #1e2640 0%, #111827 100%)' });
                  setShowStoryCreator(true);
                }}>
                  Add Status
                </button>
              </div>

              {/* Personal Status card */}
              {(() => {
                const myGroup = stories.find(g => g.user.id === user.id);
                const hasMyStories = myGroup && myGroup.stories.length > 0;
                const latestStory = hasMyStories ? myGroup.stories[0] : null;
                const hasUnviewedSelf = hasMyStories && myGroup.stories.some(s => !s.StoryViews?.some(v => v.userId === user.id));
                const ringColorSelf = hasMyStories ? (hasUnviewedSelf ? 'var(--color-primary)' : '#94a3b8') : 'transparent';
                
                return (
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '16px', marginBottom: '24px', cursor: 'pointer' }}
                    onClick={() => {
                      if (hasMyStories) {
                        setActiveStoryViewer({ user: user, stories: myGroup.stories, index: 0 });
                        handleViewStory(myGroup.stories[0].id);
                      } else {
                        setNewStory({ type: 'text', content: '', mediaUrl: 'linear-gradient(135deg, #1e2640 0%, #111827 100%)' });
                        setShowStoryCreator(true);
                      }
                    }}
                  >
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%', 
                      border: hasMyStories ? `2.5px solid ${ringColorSelf}` : '2.5px dashed var(--text-tertiary)', 
                      padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                    }}>
                      {renderAvatar(user, 'sm', { width: '38px', height: '38px' })}
                      {!hasMyStories && (
                        <div style={{
                          position: 'absolute', bottom: '-2px', right: '-2px',
                          background: 'var(--color-primary)', color: '#fff',
                          width: '18px', height: '18px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 'bold', border: '2px solid var(--bg-tertiary)'
                        }}>
                          +
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>My Status</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {latestStory ? `Updated at ${new Date(latestStory.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Tap to add status update'}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Recent Updates</h4>
              
              {stories.filter(g => g.user.id !== user.id).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  No recent status updates from the family.
                </div>
              ) : (
                stories.filter(g => g.user.id !== user.id).map(group => {
                  const hasUnviewed = group.stories.some(s => !s.StoryViews?.some(v => v.userId === user.id));
                  const ringColor = hasUnviewed ? 'var(--color-primary)' : '#94a3b8';
                  
                  return (
                    <div 
                      key={group.user.id} 
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-glass)', cursor: 'pointer' }}
                      onClick={() => {
                        setActiveStoryViewer({ user: group.user, stories: group.stories, index: 0 });
                        handleViewStory(group.stories[0].id);
                      }}
                    >
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%', border: `2.5px solid ${ringColor}`, padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {renderAvatar(group.user, 'sm', { width: '38px', height: '38px' })}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{group.user.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(group.stories[0].createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}



          {/* D. CALLS TAB */}
          {activeTab === 'calls' && (
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', marginBottom: '16px' }}>Call History</h3>
              
              {callHistory.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No call logs available.
                </div>
              ) : (
                callHistory.map(call => {
                  const partner = call.callerId === user.id ? call.receiver : call.caller;
                  if (!partner) return null;
                  
                  const isIncoming = call.receiverId === user.id;
                  
                  let durationStr = '-';
                  if (call.startedAt && call.endedAt) {
                    const diff = new Date(call.endedAt) - new Date(call.startedAt);
                    const diffSec = Math.floor(diff / 1000);
                    const diffMin = Math.floor(diffSec / 60);
                    const sec = diffSec % 60;
                    durationStr = diffMin > 0 ? `${diffMin}m ${sec}s` : `${sec}s`;
                  } else {
                    if (call.status === 'missed') durationStr = 'Missed';
                    else if (call.status === 'declined') durationStr = 'Declined';
                    else if (call.status === 'ringing') durationStr = 'Ringing';
                    else durationStr = 'No Answer';
                  }

                  return (
                    <div key={call.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {renderAvatar(partner, 'sm')}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {partner.name}
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '400' }}>
                              ({isIncoming ? 'Incoming' : 'Outgoing'})
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {new Date(call.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', 
                          background: call.status === 'missed' || call.status === 'declined' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: call.status === 'missed' || call.status === 'declined' ? 'var(--color-danger)' : 'var(--color-success)'
                        }}>
                          {call.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '12px', minWidth: '60px' }}>
                          <span style={{ 
                            color: call.status === 'missed' || call.status === 'declined' ? 'var(--color-danger)' : 'var(--text-secondary)',
                            fontWeight: call.status === 'missed' ? '700' : '400'
                          }}>
                            {durationStr}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
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
                  sender: { name: user.name, role: user.role, avatar: user.profilePhoto || '' },
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
            <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  className="btn-icon" 
                  style={{ marginRight: '4px', display: window.innerWidth <= 768 ? 'flex' : 'none' }}
                  onClick={() => setActiveChat(null)}
                >
                  <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
                </button>

                {activeChat.isGroup ? (
                  activeChat.avatar && !activeChat.avatar.includes('placeholder') ? (
                    <img src={resolveMediaUrl(activeChat.avatar)} className="avatar sm" alt="Avatar" />
                  ) : (
                    <div className="avatar sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#fff', fontWeight: '800', borderRadius: '50%' }}>
                      {activeChat.name ? activeChat.name.charAt(0).toUpperCase() : 'G'}
                    </div>
                  )
                ) : (
                  renderAvatar(activeChat.Users.find(u => u.id !== user.id), 'sm')
                )}
                
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600' }}>
                    {activeChat.isGroup ? activeChat.name : activeChat.Users.find(u => u.id !== user.id)?.name}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {activeChat.isGroup ? (
                      `${activeChat.Users.length} members`
                    ) : (
                      activeChat.Users.find(u => u.id !== user.id)?.isOnline ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>Online</span>
                      ) : activeChat.Users.find(u => u.id !== user.id)?.lastSeen ? (
                        `Last seen: ${new Date(activeChat.Users.find(u => u.id !== user.id).lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                      ) : (
                        activeChat.Users.find(u => u.id !== user.id)?.role
                      )
                    )}
                  </p>
                </div>
              </div>

              {/* Call Controls & Options */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {(() => {
                  const partner = activeChat.isGroup ? null : activeChat.Users.find(u => u.id !== user.id);
                  const isBlocked = partner?.isBlocked || partner?.isBlockingMe;
                  return (
                    <>
                      {!activeChat.isGroup && partner && (
                        <button 
                          className="btn-icon" 
                          title={partner.isBlocked ? "Unblock Contact" : "Block Contact"}
                          style={{ color: partner.isBlocked ? 'var(--color-success)' : 'var(--color-danger)' }}
                          onClick={() => partner.isBlocked ? handleUnblockUser(partner.id) : handleBlockUser(partner.id)}
                        >
                          {partner.isBlocked ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                        </button>
                      )}
                      {!isBlocked && (
                        <>
                          <button className="btn-icon" onClick={() => startOutboundCall('voice')}><Phone size={18} /></button>
                          <button className="btn-icon" onClick={() => startOutboundCall('video')}><Video size={18} /></button>
                          <button className="btn-icon" onClick={() => setShowPollBuilder(true)}><BarChart2 size={18} /></button>
                        </>
                      )}
                      <button 
                        className="btn-icon" 
                        title="Delete Chat Thread" 
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => handleDeleteChat(activeChat.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Pinned Message Bar if active */}
            {pinnedMessage && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'var(--color-primary-light)', borderBottom: '1px solid var(--border-glass)' }}>
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
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                  }}
                                >
                                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{opt.optionText}</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{voteCount} votes</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : msg.type === 'image' ? (
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <img 
                            src={resolveMediaUrl(msg.mediaUrl || msg.content)} 
                            alt="Shared file" 
                            style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '12px', cursor: 'pointer', objectFit: 'cover' }} 
                            onClick={() => window.open(resolveMediaUrl(msg.mediaUrl || msg.content), '_blank')}
                          />
                          {msg.content && msg.content !== msg.mediaUrl && !msg.content.startsWith('Shared an image') && (
                            <div style={{ fontSize: '14px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              {msg.content}
                            </div>
                          )}
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
                        {isMe && (() => {
                          if (!msg.MessageStatuses || msg.MessageStatuses.length === 0) {
                            return <Check size={12} style={{ color: 'var(--text-tertiary)' }} />;
                          }
                          const statuses = msg.MessageStatuses;
                          const isRead = statuses.every(s => s.status === 'read');
                          const isDelivered = statuses.every(s => s.status === 'delivered' || s.status === 'read');
                          if (isRead) {
                            return <CheckCheck size={12} style={{ color: 'var(--color-primary)' }} />;
                          } else if (isDelivered) {
                            return <CheckCheck size={12} style={{ color: 'var(--text-tertiary)' }} />;
                          } else {
                            return <Check size={12} style={{ color: 'var(--text-tertiary)' }} />;
                          }
                        })()}
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
            {(() => {
              const partner = activeChat.isGroup ? null : activeChat.Users.find(u => u.id !== user.id);
              const isBlocked = partner?.isBlocked || partner?.isBlockingMe;
              return (
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', padding: '16px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-glass)', alignItems: 'center' }}>
                  {isBlocked ? (
                    <div style={{ flex: 1, textAlign: 'center', padding: '10px', color: 'var(--text-secondary)', fontSize: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                      {partner?.isBlocked ? "You have blocked this contact. Unblock to send messages." : "This contact is unavailable."}
                    </div>
                  ) : (
                    <>
                      <button type="button" className="btn-icon" onClick={triggerVoiceTranscribe}><Mic size={18} /></button>
                      <button type="button" className="btn-icon" onClick={() => fileInputRef.current?.click()}><Paperclip size={18} /></button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                      />
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
                    </>
                  )}
                </form>
              );
            })()}

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

            {/* Voice Call Remote Audio Playback */}
            {activeCall.type === 'voice' && activeCall.status === 'connected' && (
              <audio ref={remoteVideoRef} autoPlay style={{ display: 'none' }} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
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
                    {renderAvatar(u, 'sm')}
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
          <div className="modal-card animate-fade-in" style={{ width: '95%', maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Create Status Update</h3>
              <button className="btn-icon" onClick={() => setShowStoryCreator(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateStory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Status Type</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    style={{ 
                      flex: 1, padding: '10px', borderRadius: '8px', 
                      background: newStory.type === 'text' ? 'var(--color-primary-light)' : 'transparent',
                      color: newStory.type === 'text' ? 'var(--color-primary)' : 'var(--text-primary)',
                      border: newStory.type === 'text' ? '2.5px solid var(--color-primary)' : '1px solid var(--border-glass)',
                      fontWeight: '700'
                    }}
                    onClick={() => setNewStory({ ...newStory, type: 'text', mediaUrl: 'linear-gradient(135deg, #1e2640 0%, #111827 100%)' })}
                  >
                    Text Status
                  </button>
                  <button 
                    type="button" 
                    style={{ 
                      flex: 1, padding: '10px', borderRadius: '8px', 
                      background: newStory.type === 'image' ? 'var(--color-primary-light)' : 'transparent',
                      color: newStory.type === 'image' ? 'var(--color-primary)' : 'var(--text-primary)',
                      border: newStory.type === 'image' ? '2.5px solid var(--color-primary)' : '1px solid var(--border-glass)',
                      fontWeight: '700'
                    }}
                    onClick={() => setNewStory({ ...newStory, type: 'image', mediaUrl: '' })}
                  >
                    Photo Status
                  </button>
                </div>
              </div>

              {newStory.type === 'text' ? (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Choose Background Color</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {[
                      'linear-gradient(135deg, #1e2640 0%, #111827 100%)',
                      'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
                      'linear-gradient(135deg, #059669 0%, #34d399 100%)',
                      'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                      'linear-gradient(135deg, #0284c7 0%, #60a5fa 100%)',
                    ].map(grad => (
                      <button
                        key={grad}
                        type="button"
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: grad, cursor: 'pointer',
                          border: newStory.mediaUrl === grad ? '2px solid #fff' : '1px solid rgba(0,0,0,0.2)',
                          boxShadow: newStory.mediaUrl === grad ? '0 0 0 2px var(--color-primary)' : 'none'
                        }}
                        onClick={() => setNewStory({ ...newStory, mediaUrl: grad })}
                      />
                    ))}
                  </div>
                  
                  {/* Realtime preview */}
                  <div style={{
                    width: '100%', height: '100px', borderRadius: '12px', background: newStory.mediaUrl,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                    color: '#fff', fontSize: '15px', fontWeight: '700', textOverflow: 'ellipsis',
                    overflow: 'hidden', whiteSpace: 'normal', textAlign: 'center', marginBottom: '10px'
                  }}>
                    {newStory.content || 'Status Text Preview'}
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Status Photo</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input 
                      type="file" 
                      id="story-image-upload-input"
                      style={{ display: 'none' }} 
                      accept="image/*" 
                      onChange={handleStoryMediaUpload} 
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', flex: 1, padding: '10px', justifyContent: 'center' }}
                      onClick={() => document.getElementById('story-image-upload-input')?.click()}
                      disabled={isUploadingStoryMedia}
                    >
                      <Camera size={16} />
                      {isUploadingStoryMedia ? 'Uploading...' : 'Upload Local Photo'}
                    </button>
                  </div>
                  
                  <input 
                    type="text" 
                    placeholder="Or paste an image URL here..." 
                    className="input-field"
                    value={newStory.mediaUrl}
                    onChange={e => setNewStory({ ...newStory, mediaUrl: e.target.value })}
                  />

                  {newStory.mediaUrl && (
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                      <img 
                        src={resolveMediaUrl(newStory.mediaUrl)} 
                        alt="Preview" 
                        style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--border-glass)' }} 
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  {newStory.type === 'text' ? 'Status Content *' : 'Image Caption (Optional)'}
                </label>
                <textarea 
                  placeholder={newStory.type === 'text' ? "What's on your mind?..." : "Caption..."}
                  className="input-field"
                  style={{ minHeight: '80px', resize: 'none' }}
                  value={newStory.content}
                  onChange={e => setNewStory({ ...newStory, content: e.target.value })}
                  required={newStory.type === 'text'}
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ justifyContent: 'center', marginTop: '6px' }}
                disabled={isUploadingStoryMedia || (newStory.type === 'image' && !newStory.mediaUrl)}
              >
                Publish Status Update
              </button>
            </form>
          </div>
        </div>
      )}

      {/* C. Create Poll Modal */}
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
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Create a new account for Samiksha, Vijay, or anyone in the family.</p>
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
                let data;
                try {
                  data = await res.json();
                } catch (parseErr) {
                  setAddMemberError('Server returned an invalid response.');
                  return;
                }
                if (!res.ok) {
                  const errMsg = typeof data?.error === 'string' ? data.error
                               : typeof data?.message === 'string' ? data.message
                               : typeof data?.error === 'object' ? JSON.stringify(data.error)
                               : 'Failed to create account';
                  setAddMemberError(errMsg);
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
                  placeholder="e.g. Samiksha (Parent)"
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
                  placeholder="samiksha@family.com"
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
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
          70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
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
