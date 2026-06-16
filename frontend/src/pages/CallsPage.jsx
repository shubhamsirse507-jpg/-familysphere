import React, { useEffect } from 'react';
import { Phone, Video } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import useCalls from '../hooks/useCalls.js';
import Avatar from '../components/Avatar.jsx';

export function CallsSidebar() {
  const { user } = useAuth();
  const { callHistory, fetchCallHistory } = useCalls();

  useEffect(() => {
    if (user) {
      fetchCallHistory();
    }
  }, [user]);

  return (
    <div style={{ padding: '20px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', marginBottom: '16px' }}>Call History</h3>
      
      {callHistory.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
          No call logs available.
        </div>
      ) : (
        callHistory.map(call => {
          const partner = call.callerId === user?.id ? call.receiver : call.caller;
          if (!partner) return null;
          
          const isIncoming = call.receiverId === user?.id;
          
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
                <Avatar user={partner} size="sm" />
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
  );
}
