'use client';

import { useEffect, useState } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = getSocket();
    
    // Connect to socket
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      connectSocket();
      setSocket(socketInstance);
    }

    // Listen for connection events
    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
    };
  }, []);

  return {
    socket,
    isConnected
  };
};