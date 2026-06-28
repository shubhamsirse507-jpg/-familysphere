import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Trash2, Image, Users, MapPin, X, Plus } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import useSocket from '../hooks/useSocket.js';
import Avatar from '../components/Avatar.jsx';
import { API_BASE, resolveMediaUrl } from '../utils/config.js';

// ─── Feed Sub-Tab ──────────────────────────────────────────────────────────────
function FeedSubTab({ user, socket }) {
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedComments, setExpandedComments] = useState({});

  useEffect(() => {
    fetchFeed();
  }, []);

  // Socket listeners for real-time feed
  useEffect(() => {
    if (!socket) return;
    socket.on('feed_post_created', (post) => {
      setFeedPosts(prev => prev.some(p => p.id === post.id) ? prev : [post, ...prev]);
    });
    socket.on('feed_post_liked', ({ postId, likes }) => {
      setFeedPosts(prev => prev.map(p => p.id === postId ? { ...p, PostLikes: likes } : p));
    });
    socket.on('feed_post_commented', ({ postId, comment }) => {
      setFeedPosts(prev => prev.map(p => p.id === postId ? {
        ...p, PostComments: p.PostComments ? [...p.PostComments, comment] : [comment]
      } : p));
    });
    socket.on('feed_post_deleted', ({ id }) => {
      setFeedPosts(prev => prev.filter(p => p.id !== id));
    });
    return () => {
      socket.off('feed_post_created');
      socket.off('feed_post_liked');
      socket.off('feed_post_commented');
      socket.off('feed_post_deleted');
    };
  }, [socket]);

  const fetchFeed = async () => {
    setFeedLoading(true);
    try {
      const res = await fetch(`${API_BASE}/posts`);
      if (res.ok) setFeedPosts(await res.json());
    } catch (err) { console.error(err); }
    finally { setFeedLoading(false); }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/posts`, {        
        method: 'POST',
	credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPostText, mediaUrl: newPostImage })
      });
      if (res.ok) { setNewPostText(''); setNewPostImage(''); }
    } catch (err) { console.error(err); }
  };

  const handleLikePost = async (postId) => {
    try { await fetch(`${API_BASE}/posts/${postId}/like`, { method: 'POST' }); }
    catch (err) { console.error(err); }
  };

  const handleAddComment = async (postId) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    try {
      await fetch(`${API_BASE}/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) { console.error(err); }
  };

  const handleDeletePost = async (postId) => {
    try { await fetch(`${API_BASE}/posts/${postId}`, { method: 'DELETE' }); }
    catch (err) { console.error(err); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', overflowY: 'auto', height: '100%' }}>
      {/* Post composer */}
      <form onSubmit={handleCreatePost} style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
          <Avatar user={user} size="sm" />
          <textarea
            placeholder="Share something with the family..."
            className="input-field"
            style={{ flex: 1, minHeight: '70px', resize: 'none', fontSize: '14px' }}
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end' }}>
          <input
            type="text"
            placeholder="Image URL (optional)..."
            className="input-field"
            style={{ flex: 1, fontSize: '12px' }}
            value={newPostImage}
            onChange={(e) => setNewPostImage(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ padding: '10px 18px', fontSize: '13px' }}>
            Post
          </button>
        </div>
      </form>

      {/* Feed posts */}
      {feedLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Loading feed...</div>
      ) : feedPosts.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
          No posts yet. Be the first to share something!
        </div>
      ) : (
        feedPosts.map(post => {
          const isLiked = post.PostLikes?.some(l => l.userId === user?.id);
          const isOwner = post.authorId === user?.id;
          return (
            <div key={post.id} style={{ background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
              {/* Post header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar user={post.author} size="sm" />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{post.author?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {new Date(post.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
                {isOwner && (
                  <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeletePost(post.id)}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Post content */}
              <div style={{ padding: '0 16px 14px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {post.content}
              </div>

              {/* Post media */}
              {post.mediaUrl && (
                <img
                  src={resolveMediaUrl(post.mediaUrl)}
                  alt="Post"
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }}
                />
              )}

              {/* Post actions */}
              <div style={{ display: 'flex', gap: '16px', padding: '12px 16px', borderTop: '1px solid var(--border-glass)' }}>
                <button
                  className="btn-icon"
                  style={{ color: isLiked ? 'var(--color-danger)' : 'var(--text-secondary)', gap: '6px' }}
                  onClick={() => handleLikePost(post.id)}
                >
                  <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                  <span style={{ fontSize: '13px' }}>{post.PostLikes?.length || 0}</span>
                </button>
                <button
                  className="btn-icon"
                  style={{ color: 'var(--text-secondary)', gap: '6px' }}
                  onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                >
                  <MessageCircle size={18} />
                  <span style={{ fontSize: '13px' }}>{post.PostComments?.length || 0}</span>
                </button>
              </div>

              {/* Comments */}
              {expandedComments[post.id] && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)' }}>
                  {post.PostComments?.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <Avatar user={c.author} size="xs" />
                      <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '8px 12px', flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '2px' }}>{c.author?.name}</div>
                        <div style={{ fontSize: '13px' }}>{c.content}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      className="input-field"
                      style={{ flex: 1, fontSize: '13px' }}
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(post.id); }}
                    />
                    <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }} onClick={() => handleAddComment(post.id)}>
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Memories Sub-Tab ──────────────────────────────────────────────────────────
function MemoriesSubTab({ user }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [url, setUrl] = useState('');
  const [sourceType, setSourceType] = useState('url');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { fetchMemories(); }, []);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/memories`);
      if (res.ok) setMemories(await res.json());
      else setError('Failed to load memories.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setSourceType('local');
    setUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setUploading(true); setError('');
    try {
      let finalUrl = url.trim();
      if (sourceType === 'local' && uploadFile) {
        const fd = new FormData();
        fd.append('file', uploadFile);
        const up = await fetch(`${API_BASE}/upload`, { method: 'POST', body: fd });
        if (!up.ok) { setError('Upload failed.'); setUploading(false); return; }
        const d = await up.json();
        finalUrl = d.url;
      }
      const res = await fetch(`${API_BASE}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc, mediaUrl: finalUrl, sourceType })
      });
      if (res.ok) {
        fetchMemories();
        setTitle(''); setDesc(''); setUrl(''); setUploadFile(null); setUploadPreview(''); setShowForm(false);
      } else setError('Failed to save memory.');
    } catch { setError('Network error.'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this memory?')) return;
    try {
      await fetch(`${API_BASE}/memories/${id}`, { method: 'DELETE' });
      fetchMemories();
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: '800' }}>Memories</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Shared photos, videos & links</p>
        </div>
        <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Add Memory
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px', marginBottom: '20px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" placeholder="Title *" className="input-field" value={title} onChange={e => setTitle(e.target.value)} required />
          <textarea placeholder="Description (optional)..." className="input-field" style={{ minHeight: '60px', resize: 'none' }} value={desc} onChange={e => setDesc(e.target.value)} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-primary" style={{ fontSize: '12px', padding: '8px 12px' }} onClick={() => fileRef.current?.click()}>
              <Image size={14} /> Upload File
            </button>
            <input type="file" ref={fileRef} style={{ display: 'none' }} accept="image/*,video/*" onChange={handleFileSelect} />
            <input type="text" placeholder="Or paste a URL..." className="input-field" style={{ flex: 1, fontSize: '12px' }} value={url} onChange={e => { setUrl(e.target.value); setSourceType('url'); setUploadFile(null); setUploadPreview(''); }} />
          </div>
          {uploadPreview && <img src={uploadPreview} alt="Preview" style={{ maxHeight: '100px', objectFit: 'contain', borderRadius: '8px' }} />}
          {error && <div style={{ color: 'var(--color-danger)', fontSize: '13px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={uploading}>{uploading ? 'Saving...' : 'Save Memory'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading memories...</div>
      ) : memories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No memories saved yet. Add your first!</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {memories.map(mem => (
            <div key={mem.id} style={{ background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)', position: 'relative' }}>
              {mem.mediaUrl && (
                <img src={resolveMediaUrl(mem.mediaUrl)} alt={mem.title} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
              )}
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '3px' }}>{mem.title}</div>
                {mem.description && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{mem.description}</div>}
              </div>
              {mem.authorId === user?.id && (
                <button
                  className="btn-icon"
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%', width: '28px', height: '28px' }}
                  onClick={() => handleDelete(mem.id)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Circles Sub-Tab ──────────────────────────────────────────────────────────
function CirclesSubTab({ user, socket }) {
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    fetchCircles();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('circle_created', (circle) => {
      setCircles(prev => prev.some(c => c.id === circle.id) ? prev : [...prev, circle]);
    });
    socket.on('circle_member_joined', ({ circleId, fullCircle }) => {
      setCircles(prev => prev.map(c => c.id === circleId ? fullCircle : c));
    });
    socket.on('circle_deleted', ({ id }) => {
      setCircles(prev => prev.filter(c => c.id !== id));
    });
    return () => {
      socket.off('circle_created');
      socket.off('circle_member_joined');
      socket.off('circle_deleted');
    };
  }, [socket]);

  const fetchCircles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/circles`, { credentials: 'include' });
      if (res.ok) setCircles(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/circles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc, icon: '⭕' })
      });
      if (res.ok) { setNewName(''); setNewDesc(''); }
    } catch (err) { console.error(err); }
  };

  const handleJoin = async (circleId) => {
    try { await fetch(`${API_BASE}/circles/${circleId}/join`, { method: 'POST', credentials: 'include' }); }
    catch (err) { console.error(err); }
  };

  const handleDelete = async (circleId) => {
    try { await fetch(`${API_BASE}/circles/${circleId}`, { method: 'DELETE', credentials: 'include' }); }
    catch (err) { console.error(err); }
  };

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: '800', marginBottom: '4px' }}>Circles</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Family interest groups and sub-teams</p>

      {/* Create Circle */}
      <form onSubmit={handleCreate} style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px', marginBottom: '20px', border: '1px solid var(--border-glass)', display: 'flex', gap: '8px' }}>
        <input type="text" placeholder="Circle name..." className="input-field" style={{ flex: 2, fontSize: '13px' }} value={newName} onChange={e => setNewName(e.target.value)} required />
        <input type="text" placeholder="Description..." className="input-field" style={{ flex: 3, fontSize: '13px' }} value={newDesc} onChange={e => setNewDesc(e.target.value)} />
        <button type="submit" className="btn-primary" style={{ padding: '10px 16px', fontSize: '13px' }}>Create</button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : circles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No circles yet. Create the first one!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {circles.map(circle => {
            const isMember = circle.members?.some(m => m.id === user?.id) || circle.CreatorId === user?.id;
            return (
              <div key={circle.id} style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                    {circle.icon || '⭕'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{circle.name}</div>
                    {circle.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '300px' }}>{circle.description}</div>}
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      <Users size={11} style={{ display: 'inline', marginRight: '4px' }} />
                      {circle.memberCount ?? circle.members?.length ?? 0} members
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!isMember && (
                    <button className="btn-primary" style={{ fontSize: '12px', padding: '8px 14px' }} onClick={() => handleJoin(circle.id)}>
                      Join
                    </button>
                  )}
                  {circle.CreatorId === user?.id && (
                    <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(circle.id)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Feed Page (Together Tab) ────────────────────────────────────────────
export function FeedSidebar({ togetherSubTab, setTogetherSubTab, feedPosts, sharedPhotos, circlesList, stories }) {
  return (
    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0, overflow: 'hidden' }}>
      <div>
        <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Together</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Family Feed, Memories &amp; Circles</p>
      </div>

      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[
          { id: 'feed', icon: '📰', label: 'Family Feed', desc: 'Posts & updates' },
          { id: 'memories', icon: '📷', label: 'Memories', desc: 'Shared photos & videos' },
          { id: 'circles', icon: '⭕', label: 'Circles', desc: 'Interest groups' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTogetherSubTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px', borderRadius: '14px', width: '100%',
              background: togetherSubTab === tab.id ? 'var(--color-primary-light)' : 'var(--bg-tertiary)',
              border: togetherSubTab === tab.id ? '1.5px solid var(--color-primary)' : '1.5px solid transparent',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{tab.icon}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: togetherSubTab === tab.id ? 'var(--color-primary)' : 'var(--text-primary)' }}>{tab.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tab.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto' }}>
        {[
          { count: feedPosts, label: 'Posts' },
          { count: sharedPhotos, label: 'Memories' },
          { count: circlesList, label: 'Circles' },
          { count: stories, label: 'Stories' }
        ].map(({ count, label }) => (
          <div key={label} style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>{count}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeedWorkspace({ togetherSubTab }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  return (
    <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
      {togetherSubTab === 'feed' && <FeedSubTab user={user} socket={socket} />}
      {togetherSubTab === 'memories' && <MemoriesSubTab user={user} />}
      {togetherSubTab === 'circles' && <CirclesSubTab user={user} socket={socket} />}
    </div>
  );
}
