import React from 'react';
import { resolveMediaUrl } from '../utils/config.js';

export default function Avatar({ user, size = 'md', borderStyle = {} }) {
  const photoUrl = user?.profilePhoto || user?.avatar;
  
  if (
    photoUrl && 
    photoUrl.trim() !== '' && 
    !photoUrl.includes('placeholder.com') && 
    !photoUrl.includes('ui-avatars.com')
  ) {
    return (
      <img
        src={resolveMediaUrl(photoUrl)}
        alt={user?.name}
        className={`avatar ${size}`}
        style={borderStyle}
      />
    );
  }
  
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : '?';
  const sizeMap = {
    sm: { width: '32px', height: '32px', fontSize: '11px' },
    md: { width: '44px', height: '44px', fontSize: '15px' },
    lg: { width: '80px', height: '80px', fontSize: '26px' }
  };
  const sizeStyle = sizeMap[size] || sizeMap.md;
  
  const role = user?.role?.toLowerCase() || '';
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
}
