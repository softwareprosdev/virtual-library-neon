'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { connectSocket, getSocket } from '../../../lib/socket';
import { api } from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import nextDynamic from 'next/dynamic';
import { 
  Box, 
  TextField, 
  Paper, 
  Typography, 
  AppBar,
  Toolbar,
  Button,
  Grid,
  IconButton,
  Avatar
} from '@mui/material';

const VideoPanel = nextDynamic(() => import('../../../components/VideoPanel'), { 
  ssr: false,
  loading: () => <Box sx={{ flexGrow: 1, bgcolor: 'black' }} />
});

export const dynamic = 'force-dynamic';

interface Message {
  id: string;
  text: string;
  sender: { name: string; email: string; id: string };
  createdAt: string;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [roomName, setRoomName] = useState('Loading...');
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const s = connectSocket();
    setSocket(s);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/');
      return;
    }

    const fetchRoomData = async () => {
      try {
        const res = await api(`/rooms/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          setRoomName(data.name);
          setMessages(data.messages || []);
          scrollToBottom();
        }
      } catch (error) {
        console.error("Failed to load room", error);
      }
    };

    fetchRoomData();
  }, [roomId, router]);

  useEffect(() => {
    if (!socket) return;

    function onConnect() {
      setIsConnected(true);
      socket?.emit('joinRoom', { roomId });
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onMessage(message: any) {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message', onMessage);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message', onMessage);
      socket.emit('leaveRoom', { roomId });
    };
  }, [roomId, socket]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      socket?.emit('chat', { roomId, text: inputText });
      setInputText('');
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar position="static" sx={{ borderBottom: '1px solid', borderColor: 'primary.dark' }}>
        <Toolbar>
          <Button 
            onClick={() => router.push('/dashboard')}
            sx={{ color: 'text.secondary', mr: 2 }}
          >
            ← Back
          </Button>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'primary.main', fontWeight: 'bold' }}>
            {roomName.toUpperCase()}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: isConnected ? '#10b981' : '#ef4444',
                boxShadow: isConnected ? '0 0 10px #10b981' : 'none'
              }} 
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {isConnected ? "ONLINE" : "OFFLINE"}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Main Content Area (Video) */}
        <Grid size={{ xs: 12, md: 8 }} sx={{ borderRight: '1px solid #333', display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: 'background.paper' }}>
           {socket && <VideoPanel roomId={roomId} socket={socket} />}
        </Grid>

        {/* Chat Panel */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.map((msg, index) => (
              <Box key={msg.id || index} sx={{ display: 'flex', gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>{msg.sender.name[0]}</Avatar>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 'bold' }}>
                      {msg.sender.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </Typography>
                  </Box>
                  <Paper 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: 'background.paper', 
                      border: '1px solid #333',
                      borderRadius: '0 12px 12px 12px',
                      maxWidth: '100%'
                    }}
                  >
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input Area */}
          <Box component="form" onSubmit={handleSend} sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid #333' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Transmit message..."
                size="small"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': { bgcolor: '#000' } 
                }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                disabled={!inputText.trim()}
                sx={{ minWidth: 100 }}
              >
                SEND
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
