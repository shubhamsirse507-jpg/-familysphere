import React from 'react';
import { Check, CheckCheck, Smile, MapPin } from 'lucide-react';
import { resolveMediaUrl } from '../utils/config.js';

/**
 * MessageBubble — renders a single chat message bubble.
 *
 * Props:
 *   msg              – message object from the API
 *   isMe             – boolean: current user sent this message
 *   isGroup          – boolean: inside a group chat
 *   reactionPickerMsgId – currently open reaction picker message id
 *   setReactionPickerMsgId
 *   setLightboxSrc   – open the image lightbox
 *   setEditingMessage
 *   setInputText
 *   onReact          – (msgId, emoji) => void
 *   onPin            – (msgId) => void
 *   onTranslate      – (msgId, content) => void
 *   onDelete         – (msgId) => void
 */
export default function MessageBubble({
  msg,
  isMe,
  isGroup,
  reactionPickerMsgId,
  setReactionPickerMsgId,
  setLightboxSrc,
  setEditingMessage,
  setInputText,
  onReact,
  onPin,
  onTranslate,
  onDelete,
}) {
  const isAi = msg.sender?.role === 'AI';

  const bubbleBg = isMe
    ? 'var(--bubble-user)'
    : isAi
    ? 'var(--bubble-ai)'
    : 'var(--bubble-other)';

  const bubbleColor = isMe
    ? 'var(--bubble-user-text)'
    : isAi
    ? 'var(--bubble-ai-text)'
    : 'var(--bubble-other-text)';

  const borderRadius = isMe
    ? '16px 16px 4px 16px'
    : '16px 16px 16px 4px';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
        marginBottom: '16px',
        animation: 'fadeIn 0.25s forwards',
        position: 'relative',
      }}
    >
      {/* Group chat sender name */}
      {isGroup && !isMe && !msg.isDeleted && (
        <span style={{
          fontSize: '11px', fontWeight: '600',
          color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '8px'
        }}>
          {msg.sender?.name} ({msg.sender?.role})
        </span>
      )}

      {/* Bubble */}
      <div
        onContextMenu={(e) => {
          if (msg.isDeleted) return;
          e.preventDefault();
          setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id);
        }}
        style={{
          display: 'flex', flexDirection: 'column',
          maxWidth: '75%',
          background: bubbleBg,
          color: bubbleColor,
          borderRadius,
          padding: '12px 16px',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
        }}
      >
        {/* Reaction picker popover */}
        {reactionPickerMsgId === msg.id && !msg.isDeleted && (
          <div className="reaction-picker-menu" style={{
            top: '-46px',
            [isMe ? 'right' : 'left']: '10px'
          }}>
            {['❤️', '😂', '😮', '😢', '🙏', '👍'].map(emoji => (
              <span
                key={emoji}
                className="reaction-picker-emoji"
                onClick={() => onReact(msg.id, emoji)}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}

        {/* Deleted placeholder */}
        {msg.isDeleted ? (
          <span style={{ fontStyle: 'italic', opacity: 0.6, fontSize: '13px' }}>
            🚫 This message was deleted
          </span>
        ) : msg.type === 'image' ? (
          <img
            src={resolveMediaUrl(msg.content)}
            alt="Shared media"
            style={{ maxWidth: '220px', borderRadius: '10px', cursor: 'pointer' }}
            onClick={() => setLightboxSrc(resolveMediaUrl(msg.content))}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : msg.type === 'video' ? (
          <video
            src={resolveMediaUrl(msg.content)}
            controls
            style={{ maxWidth: '240px', borderRadius: '10px' }}
          />
        ) : msg.type === 'audio' ? (
          <audio src={resolveMediaUrl(msg.content)} controls style={{ maxWidth: '220px' }} />
        ) : msg.type === 'poll' ? (() => {
          let pollData = null;
          try { pollData = JSON.parse(msg.content); } catch (e) { /* skip */ }
          if (!pollData) return <span>{msg.content}</span>;
          return (
            <div style={{ minWidth: '180px' }}>
              <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '13px' }}>
                📊 {pollData.question}
              </div>
              {pollData.options?.map((opt, idx) => (
                <div key={idx} style={{
                  padding: '6px 10px', borderRadius: '8px', marginBottom: '4px', fontSize: '13px',
                  background: 'rgba(255,255,255,0.12)', cursor: 'default'
                }}>
                  {opt}
                </div>
              ))}
            </div>
          );
        })() : msg.type === 'location' ? (() => {
          const match = msg.content?.match(/lat:([-\d.]+),lng:([-\d.]+)/);
          if (!match) return <span>{msg.content}</span>;
          const [, lat, lng] = match;
          return (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 10px', background: 'rgba(0,0,0,0.12)',
                borderRadius: '8px', fontSize: '13px'
              }}>
                <MapPin size={14} />
                📍 Lat: {parseFloat(lat).toFixed(5)}, Lng: {parseFloat(lng).toFixed(5)} (Click to view)
              </div>
            </a>
          );
        })() : (
          <div style={{ fontSize: '14px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {msg.content}
          </div>
        )}

        {/* Translation */}
        {msg.translatedContent && !msg.isDeleted && (
          <div style={{
            marginTop: '8px', paddingTop: '6px',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            fontSize: '13px', fontStyle: 'italic', opacity: 0.9
          }}>
            🌎 {msg.translatedContent}
          </div>
        )}

        {/* Timestamp + receipt */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          gap: '4px', fontSize: '10px', color: 'var(--text-secondary)',
          marginTop: '4px', opacity: 0.8
        }}>
          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isMe && (() => {
            if (!msg.MessageStatuses || msg.MessageStatuses.length === 0)
              return <Check size={12} style={{ color: 'var(--text-tertiary)' }} />;
            const statuses = msg.MessageStatuses;
            const isRead = statuses.every(s => s.status === 'read');
            const isDelivered = statuses.every(s => s.status === 'delivered' || s.status === 'read');
            if (isRead) return <CheckCheck size={12} style={{ color: 'var(--color-primary)' }} />;
            if (isDelivered) return <CheckCheck size={12} style={{ color: 'var(--text-tertiary)' }} />;
            return <Check size={12} style={{ color: 'var(--text-tertiary)' }} />;
          })()}
        </div>
      </div>

      {/* Reaction badges */}
      {msg.MessageReactions?.length > 0 && !msg.isDeleted && (
        <div className="reaction-badge-list" style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
          {Object.entries(
            msg.MessageReactions.reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {})
          ).map(([emoji, count]) => (
            <div
              key={emoji}
              className="reaction-badge"
              onClick={() => onReact(msg.id, emoji)}
              title={msg.MessageReactions.filter(r => r.emoji === emoji).map(r => r.User?.name || 'Someone').join(', ')}
            >
              <span>{emoji}</span>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Context toolbar (hover) */}
      {!msg.isDeleted && (
        <div className="msg-actions-row" style={{
          display: 'flex', gap: '6px', marginTop: '4px',
          opacity: 0, transition: 'opacity 0.2s',
          justifyContent: isMe ? 'flex-end' : 'flex-start'
        }}>
          <button
            style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)' }}
            onClick={() => onPin(msg.id)}
          >📌 Pin</button>
          <button
            style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)' }}
            onClick={() => onTranslate(msg.id, msg.content)}
          >🌎 Translate</button>
          <button
            style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
          >
            <Smile size={12} /> React
          </button>
          {isMe && (
            <>
              <button
                style={{ fontSize: '11px', color: 'var(--color-primary)', padding: '3px 8px', borderRadius: '6px', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)' }}
                onClick={() => { setEditingMessage(msg); setInputText(msg.content); }}
              >✏️ Edit</button>
              <button
                style={{ fontSize: '11px', color: 'var(--color-danger)', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
                onClick={() => { if (window.confirm('Delete this message?')) onDelete(msg.id); }}
              >🗑️ Delete</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
