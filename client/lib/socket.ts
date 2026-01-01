import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    const token = getToken();
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
      auth: { token },
      autoConnect: false
    });
  }
  return socket;
};

export const connectSocket = () => {
  const socket = getSocket();
  const token = getToken();
  if (token) {
    socket.auth = { token };
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
