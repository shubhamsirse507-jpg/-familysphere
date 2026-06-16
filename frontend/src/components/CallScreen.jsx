import React from 'react';
import { Phone, PhoneOff, Volume2 } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import useCalls from '../hooks/useCalls.js';

export default function CallScreen() {
  const { user } = useAuth();
  const {
    activeCall,
    callTimer,
    isMuted, setIsMuted,
    localVideoRef,
    remoteVideoRef,
    acceptInboundCall,
    declineCall,
    endCall,
  } = useCalls();

  if (!activeCall) return null;

  const remotePerson = activeCall.caller?.id === user?.id
    ? activeCall.receiver
    : activeCall.caller;

  const timerLabel = `${Math.floor(callTimer / 60)}:${(callTimer % 60).toString().padStart(2, '0')}`;

  return (
    <div className="calling-overlay-fullscreen">
      <div className="calling-card glass-panel">

        {/* Caller avatar */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="ring-glow-active" style={{ display: 'inline-block', borderRadius: '50%' }}>
            <img
              src={remotePerson?.profilePhoto || ''}
              className="avatar lg"
              alt="Caller avatar"
            />
          </div>

          <h2 style={{ fontSize: '24px', color: '#fff', marginTop: '16px', fontFamily: 'Outfit' }}>
            {remotePerson?.name}
          </h2>

          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '4px' }}>
            {activeCall.status === 'ringing'
              ? 'FamilySphere Calling...'
              : `Active Call: ${timerLabel}`}
          </p>
        </div>

        {/* Video streams grid */}
        {activeCall.type === 'video' && activeCall.status === 'connected' && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
            width: '100%', height: '180px', background: '#000',
            borderRadius: '16px', overflow: 'hidden', marginBottom: '24px'
          }}>
            <div style={{ position: 'relative' }}>
              <video ref={localVideoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>You</span>
            </div>
            <div style={{ position: 'relative' }}>
              <video ref={remoteVideoRef} autoPlay playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Remote</span>
            </div>
          </div>
        )}

        {/* Voice call remote audio */}
        {activeCall.type === 'voice' && activeCall.status === 'connected' && (
          <audio ref={remoteVideoRef} autoPlay style={{ display: 'none' }} />
        )}

        {/* Control buttons */}
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          {activeCall.status === 'ringing' && activeCall.caller?.id !== user?.id ? (
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
              <button
                className={`btn-call-util ${isMuted ? 'active' : ''}`}
                onClick={() => setIsMuted(!isMuted)}
              >
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
  );
}
