import React from 'react';
import { Trash2, X, Eye, Send } from 'lucide-react';
import { resolveMediaUrl } from '../utils/config.js';
import Avatar from './Avatar.jsx';

/**
 * StoryViewer — fullscreen story overlay modal.
 *
 * Props:
 *   activeStoryViewer      – { user, stories, index }
 *   setActiveStoryViewer   – setState setter
 *   stories                – all story groups (for cross-user navigation)
 *   storyPaused            – boolean
 *   setStoryPaused
 *   showStoryViewersList   – boolean
 *   setShowStoryViewersList
 *   storyReplyText         – string
 *   setStoryReplyText
 *   usersList              – full user list (for reaction display)
 *   currentUser            – logged-in user object
 *   onDeleteStory          – (storyId) => void
 *   onReactToStory         – (storyId, emoji) => void
 *   onSendStoryReply       – (e) => void  (form submit handler)
 *   onViewStory            – (storyId) => void
 */
export default function StoryViewer({
  activeStoryViewer,
  setActiveStoryViewer,
  stories,
  storyPaused,
  setStoryPaused,
  showStoryViewersList,
  setShowStoryViewersList,
  storyReplyText,
  setStoryReplyText,
  usersList,
  currentUser,
  onDeleteStory,
  onReactToStory,
  onSendStoryReply,
  onViewStory,
}) {
  if (!activeStoryViewer) return null;

  const { stories: list, index } = activeStoryViewer;
  const story = list[index];
  const isOwnStory = story.userId === currentUser?.id;
  const reactions = JSON.parse(story.reactions || '{}');
  const reactionEntries = Object.entries(reactions);

  const navigate = (nextIndex, nextGroup) => {
    if (nextGroup) {
      setActiveStoryViewer({ user: nextGroup.user, stories: nextGroup.stories, index: nextGroup.startIdx || 0 });
      onViewStory(nextGroup.stories[nextGroup.startIdx || 0].id);
    } else if (nextIndex >= 0 && nextIndex < list.length) {
      setActiveStoryViewer(prev => ({ ...prev, index: nextIndex }));
      onViewStory(list[nextIndex].id);
    } else {
      setActiveStoryViewer(null);
    }
  };

  const handleTap = (e) => {
    if (e.target.closest('.interactive-area')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = (e.clientX - rect.left) / rect.width;
    const activeUserIdx = stories.findIndex(g => g.user.id === activeStoryViewer.user.id);

    if (clickRatio < 0.35) {
      if (index > 0) {
        navigate(index - 1);
      } else if (activeUserIdx > 0) {
        const prev = stories[activeUserIdx - 1];
        navigate(null, { ...prev, startIdx: prev.stories.length - 1 });
      }
    } else {
      if (index < list.length - 1) {
        navigate(index + 1);
      } else if (activeUserIdx < stories.length - 1) {
        navigate(null, { ...stories[activeUserIdx + 1], startIdx: 0 });
      } else {
        setActiveStoryViewer(null);
      }
    }
  };

  const handleProgressEnd = () => {
    if (storyPaused) return;
    const activeUserIdx = stories.findIndex(g => g.user.id === activeStoryViewer.user.id);
    if (index < list.length - 1) {
      navigate(index + 1);
    } else if (activeUserIdx < stories.length - 1) {
      navigate(null, { ...stories[activeUserIdx + 1], startIdx: 0 });
    } else {
      setActiveStoryViewer(null);
    }
  };

  return (
    <div className="story-overlay-bg">
      <div className="story-viewer-modal animate-fade-in">

        {/* Progress bars */}
        <div className="story-progress-bar-container">
          {list.map((s, idx) => (
            <div key={s.id} className="story-progress-bg">
              <div
                className={`story-progress-fill ${idx < index ? 'completed' : idx === index ? 'active' : ''}`}
                style={{
                  animationDuration: idx === index ? '5s' : '0s',
                  animationPlayState: (idx === index && storyPaused) ? 'paused' : 'running'
                }}
                onAnimationEnd={idx === index ? handleProgressEnd : undefined}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="story-viewer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar user={activeStoryViewer.user} size="sm" />
            <div>
              <div style={{ fontWeight: '600' }}>{activeStoryViewer.user.name}</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>
                {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isOwnStory && (
              <button
                className="btn-icon interactive-area"
                style={{ color: '#ef4444' }}
                onClick={() => onDeleteStory(story.id)}
                title="Delete status"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              className="btn-icon interactive-area"
              style={{ color: '#fff' }}
              onClick={() => setActiveStoryViewer(null)}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewer count (own stories) */}
        {isOwnStory && (
          <div
            className="story-viewers-tag interactive-area"
            style={{ cursor: 'pointer', zIndex: 30 }}
            onClick={() => { setStoryPaused(true); setShowStoryViewersList(true); }}
          >
            <Eye size={14} style={{ marginRight: '5px' }} />
            <span>{story.StoryViews?.length || 0} views</span>
          </div>
        )}

        {/* Content */}
        <div className="story-content-body" onClick={handleTap} style={{ cursor: 'pointer' }}>
          {story.type === 'text' ? (
            <div
              className="story-text-container"
              style={{
                background: (story.mediaUrl && story.mediaUrl.startsWith('linear-gradient'))
                  ? story.mediaUrl
                  : undefined
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

          {/* Floating reactions */}
          {reactionEntries.length > 0 && (
            <div
              className="interactive-area"
              style={{
                position: 'absolute',
                bottom: isOwnStory ? '60px' : '150px',
                left: '20px',
                display: 'flex', flexDirection: 'column', gap: '6px',
                background: 'rgba(0,0,0,0.5)',
                padding: '8px 12px', borderRadius: '12px', maxWidth: '80%'
              }}
            >
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>Story Reactions</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {reactionEntries.map(([uid, rEmoji]) => {
                  const rUser = usersList.find(u => u.id === uid) || (uid === currentUser?.id ? currentUser : null);
                  return (
                    <span
                      key={uid}
                      title={rUser?.name || 'User'}
                      style={{ fontSize: '16px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <span>{rEmoji}</span>
                      <span style={{ fontSize: '10px' }}>{rUser?.name?.split(' ')[0]}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Reaction + reply bar (others' stories) */}
        {!isOwnStory && (
          <div className="interactive-area" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.4))',
            padding: '16px 20px 30px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 30
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              {['❤️', '😂', '😮', '😢', '🙏', '👍'].map(em => (
                <button
                  key={em}
                  style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}
                  className="hover-scale"
                  onClick={() => onReactToStory(story.id, em)}
                >
                  {em}
                </button>
              ))}
            </div>
            <form onSubmit={onSendStoryReply} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder={`Reply to ${activeStoryViewer.user.name}...`}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '24px',
                  padding: '10px 16px', color: '#fff', outline: 'none', fontSize: '14px'
                }}
                value={storyReplyText}
                onChange={e => setStoryReplyText(e.target.value)}
                onFocus={() => setStoryPaused(true)}
                onBlur={() => { if (!storyReplyText.trim()) setStoryPaused(false); }}
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

        {/* Viewers drawer */}
        {isOwnStory && showStoryViewersList && (
          <div
            className="modal-backdrop-blur interactive-area"
            style={{ position: 'absolute', zIndex: 100 }}
            onClick={() => { setShowStoryViewersList(false); setStoryPaused(false); }}
          >
            <div
              className="modal-card animate-slide-up"
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                width: '100%', maxWidth: '480px', margin: '0 auto',
                borderRadius: '20px 20px 0 0',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                border: '1px solid var(--border-glass)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px' }}>
                <h4 style={{ fontWeight: '700', fontSize: '15px' }}>Views ({story.StoryViews?.length || 0})</h4>
                <button className="btn-icon" onClick={() => { setShowStoryViewersList(false); setStoryPaused(false); }}>
                  <X size={20} />
                </button>
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
                        <Avatar user={view.User} size="sm" />
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px' }}>{view.User?.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{view.User?.role}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {new Date(view.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
}
