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
    withCredentials: true,
    auth: { token: localStorage.getItem("socket_token") || "" },
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      // Socket authentication is now verified via HTTP-only JWT cookies automatically
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    socketInstance.on('family:updated', () => {
      console.log('[Socket] Family updated, reconnecting socket to fetch new JWT cookies...');
      socketInstance.disconnect();
      setTimeout(() => {
        if (socketRef.current === socketInstance) {
          socketInstance.connect();
        }
      }, 200);
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
