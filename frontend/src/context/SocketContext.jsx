import React, { createContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_BASE } from '../utils/config.js';
import useAuth from '../hooks/useAuth.js';

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState({ count: 0, users: [] });
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      setActiveUsers({ count: 0, users: [] });
      return;
    }

    const socketInstance = io(SOCKET_BASE, {
      withCredentials: true
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      socketInstance.emit('auth', user.id);
    });

    socketInstance.on('active_users_update', (data) => {
      setActiveUsers(data);
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, activeUsers, setActiveUsers }}>
      {children}
    </SocketContext.Provider>
  );
}
