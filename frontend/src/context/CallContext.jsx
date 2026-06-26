import React, { createContext, useState, useEffect, useRef } from 'react';
import useAuth from '../hooks/useAuth.js';
import useSocket from '../hooks/useSocket.js';
import useChats from '../hooks/useChats.js';
import { API_BASE } from '../utils/config.js';

export const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { activeChat } = useChats();

  const [activeCall, setActiveCall] = useState(null);
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

  const audioContextRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingSignalRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerIntervalRef = useRef(null);

  // Calling timer trigger
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
      setLocalStream(null);
      setRemoteStream(null);
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

  // Load call history if user logged in
  useEffect(() => {
    if (user) {
      fetchCallHistory();
    } else {
      setCallHistory([]);
      cleanupCallState();
    }
  }, [user]);

  // Handle socket event registrations for Calling
  useEffect(() => {
    if (!socket || !user) return;

    socket.on('incoming_call', async (data) => {
      const { from, signal, type, chatId, dbId } = data;
      
      if (signal && signal.type === 'offer') {
        pendingSignalRef.current = signal;
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socket.emit('accept_call', {
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

    return () => {
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('webrtc_ice');
      socket.off('call_declined');
      socket.off('call_ended');
    };
  }, [socket, user]);

  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;
      
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

  const fetchCallHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/calls`);
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

  const startOutboundCall = (type) => {
    if (!activeChat) return;
    const isGroup = activeChat.isGroup;
    const partner = activeChat.Users?.find(u => u.id !== user.id);
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

    if (partner) {
      logCallStart(partner.id, type, 'ringing', activeChat.id).then(callLog => {
        if (callLog) {
          setActiveCall(prev => prev ? { ...prev, dbId: callLog.id } : null);
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
    if (socket && activeCall) {
      socket.emit('decline_call', { toUser: activeCall.caller.id });
      if (activeCall.dbId) {
        logCallUpdate(activeCall.dbId, 'declined');
      }
    }
    cleanupCallState();
  };

  const endCall = () => {
    stopRingtone();
    if (socket && activeCall) {
      const partnerId = activeCall.caller.id === user.id ? activeCall.receiver.id : activeCall.caller.id;
      socket.emit('end_call', { toUser: partnerId });
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

    if (localStreamObj) {
      localStreamObj.getTracks().forEach(track => {
        pc.addTrack(track, localStreamObj);
      });
    }

    pc.ontrack = (event) => {
      const remoteStreamObj = event.streams[0];
      setRemoteStream(remoteStreamObj);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamObj;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice', {
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
      if (!activeCallRef.current) return;
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

    const partner = activeCall?.caller.id === user.id ? activeCall?.receiver : activeCall?.caller;
    if (partner?.role === 'AI') {
      setRemoteStream(stream);
    }
    
    const partnerId = partner?.id;
    if (partnerId && partner?.role !== 'AI') {
      const pc = createPeerConnection(partnerId, stream);
      
      if (activeCall.caller.id === user.id) {
        if (pendingSignalRef.current && pendingSignalRef.current.type === 'answer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(pendingSignalRef.current));
            pendingSignalRef.current = null;
          } catch (e) {
            console.error('Error applying pending remote answer:', e);
          }
        } else if (!pc.remoteDescription && pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socket) {
            socket.emit('call_user', {
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
        const signalToApply = pendingSignalRef.current || activeCall.signal;
        if (signalToApply && signalToApply.type === 'offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalToApply));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('accept_call', {
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

  return (
    <CallContext.Provider value={{
      activeCall, setActiveCall,
      callTimer, setCallTimer,
      localStream, setLocalStream,
      remoteStream, setRemoteStream,
      isMuted, setIsMuted,
      isCameraOff, setIsCameraOff,
      callHistory, setCallHistory,
      localVideoRef, remoteVideoRef,
      startOutboundCall,
      acceptInboundCall,
      declineCall,
      endCall,
      fetchCallHistory
    }}>
      {children}
    </CallContext.Provider>
  );
}
