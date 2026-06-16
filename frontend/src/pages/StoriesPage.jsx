import React, { useState, useEffect } from 'react';
import { Camera, Trash2, X, Send } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import useSocket from '../hooks/useSocket.js';
import Avatar from '../components/Avatar.jsx';
import StoryViewer from '../components/StoryViewer.jsx';
import { resolveMediaUrl, API_BASE } from '../utils/config.js';

export function StoriesSidebar() {
  const { user } = useAuth();
  const { socket } = useSocket();

  // --- States ---
  const [stories, setStories] = useState([]);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [newStory, setNewStory] = useState({ type: 'text', content: '', mediaUrl: 'linear-gradient(135deg, #1e2640 0%, #111827 100%)' });
  const [isUploadingStoryMedia, setIsUploadingStoryMedia] = useState(false);
  const [storyPaused, setStoryPaused] = useState(false);
  const [showStoryViewersList, setShowStoryViewersList] = useState(false);
  const [storyReplyText, setStoryReplyText] = useState('');
  const [activeStoryViewer, setActiveStoryViewer] = useState(null);
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    if (user) {
      fetchStories();
      fetchUsersList();
    }
  }, [user]);

  const fetchStories = async () => {
    try {
      const res = await fetch(`${API_BASE}/stories`);
      if (res.ok) {
        const data = await res.json();
        setStories(data);
        // Sync active viewer list if open
        if (activeStoryViewer) {
          const updatedViewer = data.find(g => g.user.id === activeStoryViewer.user.id);
          if (updatedViewer) {
            setActiveStoryViewer(prev => ({
              ...prev,
              stories: updatedViewer.stories
            }));
          }
        }
      }
    } catch (err) {
      console.error(err);
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
      console.error(err);
    }
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    if (!newStory.content.trim() && !newStory.mediaUrl.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setNewStory(prev => ({ ...prev, mediaUrl: data.url }));
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
        method: 'DELETE'
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, emoji })
      });
      if (res.ok) {
        fetchStories();
        if (activeStoryViewer) {
          const targetUserId = activeStoryViewer.user.id;
          const storyContent = activeStoryViewer.stories[activeStoryViewer.index];
          const chatRes = await fetch(`${API_BASE}/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isGroup: false, participantIds: [targetUserId] })
          });
          if (chatRes.ok) {
            const chatData = await chatRes.json();
            if (socket) {
              socket.emit('send_message', {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGroup: false, participantIds: [targetUserId] })
      });
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        if (socket) {
          socket.emit('send_message', {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId })
      });
      fetchStories();
    } catch (err) {
      console.error(err);
    }
  };

  const myGroup = stories.find(g => g.user.id === user?.id);
  const hasMyStories = myGroup && myGroup.stories.length > 0;
  const latestStory = hasMyStories ? myGroup.stories[0] : null;
  const hasUnviewedSelf = hasMyStories && myGroup.stories.some(s => !s.StoryViews?.some(v => v.userId === user?.id));
  const ringColorSelf = hasMyStories ? (hasUnviewedSelf ? 'var(--color-primary)' : '#94a3b8') : 'transparent';

  return (
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
          <Avatar user={user} size="sm" borderStyle={{ width: '38px', height: '38px' }} />
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

      <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Recent Updates</h4>
      
      {stories.filter(g => g.user.id !== user?.id).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          No recent status updates from the family.
        </div>
      ) : (
        stories.filter(g => g.user.id !== user?.id).map(group => {
          const hasUnviewed = group.stories.some(s => !s.StoryViews?.some(v => v.userId === user?.id));
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
                <Avatar user={group.user} size="sm" borderStyle={{ width: '38px', height: '38px' }} />
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

      {/* Overlays / Modal Creators inside the sidebar */}
      <StoryViewer
        activeStoryViewer={activeStoryViewer}
        setActiveStoryViewer={setActiveStoryViewer}
        stories={stories}
        storyPaused={storyPaused}
        setStoryPaused={setStoryPaused}
        showStoryViewersList={showStoryViewersList}
        setShowStoryViewersList={setShowStoryViewersList}
        storyReplyText={storyReplyText}
        setStoryReplyText={setStoryReplyText}
        usersList={usersList}
        currentUser={user}
        onDeleteStory={handleDeleteStory}
        onReactToStory={handleReactToStory}
        onSendStoryReply={handleSendStoryReply}
        onViewStory={handleViewStory}
      />

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
    </div>
  );
}
