import React, { createContext, useState, useEffect, useRef } from 'react';
import useAuth from '../hooks/useAuth.js';
import useSocket from '../hooks/useSocket.js';
import { API_BASE } from '../utils/config.js';

export const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const activeChatRef = useRef(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState({}); // { chatId: { userId: boolean } }
  const [usersList, setUsersList] = useState([]); // All users for starting new chats
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [smartReplies, setSmartReplies] = useState([]);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchResults, setChatSearchResults] = useState([]);
  const [showAddChatModal, setShowAddChatModal] = useState(false);
  const [newChatConfig, setNewChatConfig] = useState({ isGroup: false, name: '', members: [] });
  const [incomingNotification, setIncomingNotification] = useState(null);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollForm, setPollForm] = useState({ question: '', option1: '', option2: '', option3: '' });
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);

  const fileInputRef = useRef(null);

  // Auto-dismiss in-app notification after 5 seconds
  useEffect(() => {
    if (incomingNotification) {
      const timer = setTimeout(() => {
        setIncomingNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [incomingNotification]);

  const handleNotificationClick = async (notif) => {
    const existingChat = chats.find(c => c.id === notif.chatId);
    if (existingChat) {
      setActiveChat(existingChat);
    } else {
      const updatedChats = await fetchChats();
      if (updatedChats) {
        const found = updatedChats.find(c => c.id === notif.chatId);
        if (found) {
          setActiveChat(found);
        }
      }
    }
    setIncomingNotification(null);
  };

  // Fetch Message history for active Chat
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
      if (socket) {
        socket.emit('join_chat', activeChat.id);
      }
    }
    return () => {
      if (activeChat && socket) {
        socket.emit('leave_chat', activeChat.id);
      }
    };
  }, [activeChat, socket]);

  // Load chat listing and metadata if user is logged in
  useEffect(() => {
    if (user) {
      fetchChats();
      fetchUsersList();
      fetchBlockedUsers();
    } else {
      setChats([]);
      setActiveChat(null);
      setMessages([]);
      setUsersList([]);
      setBlockedUsers([]);
    }
  }, [user]);

  // Handle Socket Event Registrations for Chat
  useEffect(() => {
    if (!socket || !user) return;

    // Incoming messages
    socket.on('new_message', (msg) => {
      if (activeChatRef.current && msg.chatId === activeChatRef.current.id) {
        setMessages(prev => {
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
        
        if (msg.senderId !== user.id) {
          setIncomingNotification({
            id: msg.id,
            chatId: msg.chatId,
            senderName: msg.sender?.name || 'Family Member',
            senderAvatar: msg.sender?.profilePhoto || msg.sender?.avatar || '',
            content: msg.content,
            type: msg.type
          });
        }
      }

      setChats(prev => {
        const idx = prev.findIndex(c => c.id === msg.chatId);
        if (idx === -1) {
          fetchChats();
          return prev;
        }
        const updated = { ...prev[idx], Messages: [msg] };
        const rest = prev.filter(c => c.id !== msg.chatId);
        return [updated, ...rest];
      });
    });

    // Read receipts
    socket.on('messages_read', ({ chatId, userId: readerId }) => {
      if (activeChatRef.current && chatId === activeChatRef.current.id) {
        setMessages(prev => prev.map(m => ({
          ...m,
          MessageStatuses: m.MessageStatuses
            ? m.MessageStatuses.map(s => s.userId === readerId ? { ...s, status: 'read' } : s)
            : m.MessageStatuses
        })));
      }
    });

    // Delivered receipts
    socket.on('messages_delivered', ({ chatId, userId: deliveredTo }) => {
      if (activeChatRef.current && chatId === activeChatRef.current.id) {
        setMessages(prev => prev.map(m => ({
          ...m,
          MessageStatuses: m.MessageStatuses
            ? m.MessageStatuses.map(s =>
                s.userId === deliveredTo && s.status === 'sent'
                  ? { ...s, status: 'delivered' }
                  : s
              )
            : m.MessageStatuses
        })));
      }
    });

    // Typing updates
    const typingTimers = {};
    socket.on('typing', (data) => {
      const { chatId, userId, isTyping } = data;
      setTypingUsers(prev => {
        const next = { ...prev };
        if (!next[chatId]) next[chatId] = {};
        next[chatId][userId] = isTyping;
        return next;
      });
      
      const timerKey = `${chatId}_${userId}`;
      if (typingTimers[timerKey]) clearTimeout(typingTimers[timerKey]);
      if (isTyping) {
        typingTimers[timerKey] = setTimeout(() => {
          setTypingUsers(prev => {
            const next = { ...prev };
            if (next[chatId]) next[chatId][userId] = false;
            return next;
          });
        }, 4000);
      }
    });

    // Status changed presence updates
    socket.on('user_status_changed', ({ userId, isOnline, lastSeen }) => {
      setChats(prev => prev.map(chat => ({
        ...chat,
        Users: chat.Users
          ? chat.Users.map(u => u.id === userId ? { ...u, isOnline, lastSeen } : u)
          : chat.Users
      })));
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, isOnline, lastSeen } : u));
    });

    // Reaction updates
    socket.on('message_reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, MessageReactions: reactions } : m));
    });

    // Message edits/deletes
    socket.on('message_updated', (updatedMsg) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      setChats(prev => prev.map(c => c.id === updatedMsg.chatId 
        ? { ...c, Messages: c.Messages.map(m => m.id === updatedMsg.id ? updatedMsg : m) } 
        : c
      ));
    });

    return () => {
      socket.off('new_message');
      socket.off('messages_read');
      socket.off('messages_delivered');
      socket.off('typing');
      socket.off('user_status_changed');
      socket.off('message_reaction_updated');
      socket.off('message_updated');
    };
  }, [socket, user]);

  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_BASE}/chats`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        setActiveChat(prev => {
          if (!prev) return prev;
          const fresh = data.find(c => c.id === prev.id);
          return fresh || prev;
        });
        return data;
      }
    } catch (err) {
      console.error('Fetch chats error:', err);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const res = await fetch(`${API_BASE}/chats/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  const fetchUsersList = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/users`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Fetch users list error:', err);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/blocked`);
      if (res.ok) {
        const data = await res.json();
        setBlockedUsers(data);
      }
    } catch (err) {
      console.error('Fetch blocked users error:', err);
    }
  };

  const handleSendMessage = (e, customText = '', replyToId = null) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !activeChat) return;

    if (editingMessage) {
      handleEditMessage(editingMessage.id, textToSend);
      setEditingMessage(null);
      setInputText('');
      return;
    }

    if (socket) {
      socket.emit('send_message', {
        chatId: activeChat.id,
        senderId: user.id,
        content: textToSend,
        type: 'text',
        replyToId
      });
    }

    if (!customText) setInputText('');
    
    if (socket) {
      socket.emit('typing', { chatId: activeChat.id, userId: user.id, isTyping: false });
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (socket && activeChat) {
          socket.emit('send_message', {
            chatId: activeChat.id,
            senderId: user.id,
            content: `${latitude},${longitude}`,
            type: 'location'
          });
        }
      },
      (error) => {
        alert("Unable to retrieve location: " + error.message);
      }
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const isVideo = file.type.startsWith('video/');
        if (socket) {
          socket.emit('send_message', {
            chatId: activeChat.id,
            senderId: user.id,
            content: isVideo ? `Shared a video: ${file.name}` : `Shared an image: ${file.name}`,
            type: isVideo ? 'video' : 'image',
            mediaUrl: data.url,
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('File upload error:', err);
      }
    } catch (err) {
      console.error('File upload error:', err);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm('Are you sure you want to delete this chat thread?')) return;
    try {
      const res = await fetch(`${API_BASE}/chats/${chatId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setActiveChat(null);
        fetchChats();
      }
    } catch (err) {
      console.error('Delete chat error:', err);
    }
  };

  const handleSearchMessages = async (query) => {
    setChatSearchQuery(query);
    if (!activeChat || !query.trim()) {
      setChatSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/chats/${activeChat.id}/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setChatSearchResults(data);
      }
    } catch (err) {
      console.error('Search messages error:', err);
    }
  };

  const handleReactToMessage = async (messageId, emoji) => {
    try {
      await fetch(`${API_BASE}/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
    } catch (err) {
      console.error('React message error:', err);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    if (!activeChat || !newContent.trim()) return;
    try {
      await fetch(`${API_BASE}/chats/${activeChat.id}/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });
    } catch (err) {
      console.error('Edit message error:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeChat) return;
    try {
      await fetch(`${API_BASE}/chats/${activeChat.id}/messages/${messageId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Delete message error:', err);
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      const res = await fetch(`${API_BASE}/chats/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: activeChat.id, messageId })
      });
      if (res.ok) {
        fetchMessages(activeChat.id);
      }
    } catch (err) {
      console.error('Pin message error:', err);
    }
  };

  const handleCastVote = async (optionId) => {
    try {
      const res = await fetch(`${API_BASE}/chats/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId })
      });
      if (res.ok) {
        fetchMessages(activeChat.id);
      }
    } catch (err) {
      console.error('Cast vote error:', err);
    }
  };

  const handleStartChat = async (targetId) => {
    try {
      const res = await fetch(`${API_BASE}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isGroup: false,
          participantIds: [targetId]
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (!chats.some(c => c.id === data.id)) {
          setChats(prev => [data, ...prev]);
        }
        setActiveChat(data);
        setShowAddChatModal(false);
      }
    } catch (err) {
      console.error('Start chat error:', err);
    }
  };

  const handleStartGroup = async () => {
    if (!newChatConfig.name.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.error('Start group error:', err);
    }
  };

  const handleBlockUser = async (blockedId) => {
    try {
      const res = await fetch(`${API_BASE}/users/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId })
      });
      if (res.ok) {
        fetchBlockedUsers();
        fetchChats();
        fetchUsersList();
      }
    } catch (err) {
      console.error('Block user error:', err);
    }
  };

  const handleUnblockUser = async (blockedId) => {
    try {
      const res = await fetch(`${API_BASE}/users/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId })
      });
      if (res.ok) {
        fetchBlockedUsers();
        fetchChats();
        fetchUsersList();
      }
    } catch (err) {
      console.error('Unblock user error:', err);
    }
  };

  const fetchSmartReplies = async (content) => {
    try {
      const res = await fetch(`${API_BASE}/ai/smart-replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
      });
      if (res.ok) {
        const data = await res.json();
        setSmartReplies(data.replies || []);
      }
    } catch (err) {
      console.error('Smart replies error:', err);
    }
  };

  return (
    <ChatContext.Provider value={{
      chats, setChats,
      activeChat, setActiveChat,
      messages, setMessages,
      inputText, setInputText,
      editingMessage, setEditingMessage,
      pinnedMessage, setPinnedMessage,
      typingUsers, setTypingUsers,
      usersList, setUsersList,
      blockedUsers, setBlockedUsers,
      smartReplies, setSmartReplies,
      chatSearchOpen, setChatSearchOpen,
      chatSearchQuery, setChatSearchQuery,
      chatSearchResults, setChatSearchResults,
      showAddChatModal, setShowAddChatModal,
      newChatConfig, setNewChatConfig,
      incomingNotification, setIncomingNotification,
      showPollBuilder, setShowPollBuilder,
      pollForm, setPollForm,
      reactionPickerMsgId, setReactionPickerMsgId,
      fileInputRef,
      fetchChats,
      fetchMessages,
      handleSendMessage,
      handleShareLocation,
      handleFileUpload,
      handleDeleteChat,
      handleSearchMessages,
      handleReactToMessage,
      handleEditMessage,
      handleDeleteMessage,
      handlePinMessage,
      handleCastVote,
      handleStartChat,
      handleStartGroup,
      handleBlockUser,
      handleUnblockUser,
      fetchSmartReplies,
      handleNotificationClick
    }}>
      {children}
    </ChatContext.Provider>
  );
}
