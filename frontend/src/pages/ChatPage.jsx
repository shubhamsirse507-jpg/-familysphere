import React, { useEffect, useRef, useState } from 'react';
import { 
  Search, Plus, ChevronRight, Phone, Video, BarChart2, Trash2, Pin, X, Send, Mic, Paperclip, ShieldCheck, ShieldAlert
} from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import useSocket from '../hooks/useSocket.js';
import useChats from '../hooks/useChats.js';
import useCalls from '../hooks/useCalls.js';
import Avatar from '../components/Avatar.jsx';
import MessageBubble from '../components/MessageBubble.jsx';
import { resolveMediaUrl, API_BASE } from '../utils/config.js';

export function ChatSidebar() {
  const { user } = useAuth();
  const { activeUsers } = useSocket();
  const { 
    chats, activeChat, setActiveChat, typingUsers, setShowAddChatModal 
  } = useChats();

  return (
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
                  <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#fff', fontWeight: '800', borderRadius: '50%', width: '44px', height: '44px' }}>
                    {chat.name ? chat.name.charAt(0).toUpperCase() : 'G'}
                  </div>
                )
              ) : (
                <Avatar user={displayMember} size="sm" />
              )}
              {!chat.isGroup && displayMember?.isOnline && (
                <span className="online-indicator" />
              )}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {chat.isGroup ? chat.name : displayMember?.name}
                </h4>
                {lastMsg && (
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {new Date(lastMsg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
              </div>
              
              <div style={{ fontSize: '12px', color: isTyping ? 'var(--color-success)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isTyping ? (
                  <span style={{ fontWeight: '600' }}>typing...</span>
                ) : lastMsg ? (
                  lastMsg.isDeleted ? (
                    <span style={{ fontStyle: 'italic', opacity: 0.8 }}>This message was deleted</span>
                  ) : (
                    lastMsg.content
                  )
                ) : (
                  <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No messages yet</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChatWorkspace() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { 
    activeChat, setActiveChat, messages, setMessages, inputText, setInputText,
    editingMessage, setEditingMessage, pinnedMessage, setPinnedMessage,
    smartReplies, setSmartReplies, chatSearchOpen, setChatSearchOpen,
    chatSearchQuery, setChatSearchQuery, chatSearchResults, setChatSearchResults,
    setShowPollBuilder, fileInputRef, handleSendMessage, handleShareLocation,
    handleFileUpload, handleDeleteChat, handleSearchMessages, handleReactToMessage,
    handleDeleteMessage, handlePinMessage, handleCastVote, handleBlockUser,
    handleUnblockUser, fetchSmartReplies
  } = useChats();

  const { startOutboundCall } = useCalls();

  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);

  const messagesEndRef = useRef(null);

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
  }, [messages, activeChat]);

  const handleTypingState = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeChat) return;

    socket.emit('typing', {
      chatId: activeChat.id,
      userId: user.id,
      isTyping: e.target.value.length > 0
    });
  };

  const handleTranslateMessage = async (msgId, content) => {
    try {
      const targetLang = localStorage.getItem('translateTarget') || 'Spanish';
      const res = await fetch(`${API_BASE}/ai/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, targetLang })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m => 
          m.id === msgId ? { ...m, translatedContent: data.translatedText } : m
        ));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerVoiceTranscribe = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/voice-to-text`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setInputText(data.text);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeChat) return null;

  return (
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
            <Avatar user={activeChat.Users.find(u => u.id !== user.id)} size="sm" />
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
                <button className="btn-icon" onClick={() => setChatSearchOpen(!chatSearchOpen)} title="Search Messages"><Search size={18} /></button>
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

      {/* Chat search input bar */}
      {chatSearchOpen && (
        <div style={{ display: 'flex', gap: '8px', padding: '10px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-glass)' }}>
          <input
            type="text"
            placeholder="Search in chat history..."
            className="input-field"
            style={{ flex: 1, padding: '6px 12px', fontSize: '13px', background: 'var(--bg-tertiary)' }}
            value={chatSearchQuery}
            onChange={(e) => handleSearchMessages(e.target.value)}
            autoFocus
          />
          <button 
            className="btn-icon" 
            style={{ width: '28px', height: '28px' }}
            onClick={() => {
              setChatSearchOpen(false);
              setChatSearchQuery('');
              setChatSearchResults([]);
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Messages Screen Content */}
      <div className="messages-scroller" style={{ flex: 1, padding: '24px 20px', overflowY: 'auto', overflowX: 'hidden', background: 'transparent', minHeight: 0 }}>
        
        {chatSearchQuery.trim() !== '' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '700', paddingBottom: '8px', borderBottom: '1px solid var(--border-glass)' }}>
              🔍 Found {chatSearchResults.length} matching messages:
            </div>
            {chatSearchResults.map(msg => {
              const isMe = msg.senderId === user.id;
              const senderName = msg.sender?.name || 'Family Member';
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    {senderName} • {new Date(msg.createdAt).toLocaleString()}
                  </div>
                  <div style={{
                    background: isMe ? 'var(--bubble-user)' : 'var(--bubble-other)',
                    color: isMe ? 'var(--bubble-user-text)' : 'var(--bubble-other-text)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    maxWidth: '75%',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMe={msg.senderId === user.id}
              isGroup={activeChat.isGroup}
              reactionPickerMsgId={reactionPickerMsgId}
              setReactionPickerMsgId={setReactionPickerMsgId}
              setLightboxSrc={setLightboxSrc}
              setEditingMessage={setEditingMessage}
              setInputText={setInputText}
              onReact={handleReactToMessage}
              onPin={handlePinMessage}
              onTranslate={handleTranslateMessage}
              onDelete={handleDeleteMessage}
            />
          ))
        )}

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
                  accept="image/*,video/*" 
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

      {/* Lightbox Preview Modal */}
      {lightboxSrc && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
          }}
          onClick={() => setLightboxSrc(null)}
        >
          <img 
            src={lightboxSrc} 
            alt="Enlarged shared content" 
            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
          />
        </div>
      )}
    </div>
  );
}
