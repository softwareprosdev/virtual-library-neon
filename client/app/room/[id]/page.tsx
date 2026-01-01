'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  Avatar
} from '@mui/material';
import Grid from '@mui/material/Grid';

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

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
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

    const token = getToken();
    if (!token) {
      router.push('/');
      return;
    }

    fetchRoomData();
    
    // Socket setup
    const socket = connectSocket();

    function onConnect() {
      setIsConnected(true);
      socket.emit('joinRoom', { roomId });
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onMessage(message: Message) {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message', (data: unknown) => onMessage(data as Message));

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message');
      socket.emit('leaveRoom', { roomId });
      socket.disconnect();
    };
  }, [roomId, router, scrollToBottom]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const socket = getSocket();
    if (inputText.trim() && socket) {
      socket.emit('chat', { roomId, text: inputText });
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
        <Grid item xs={12} md={8} sx={{ borderRight: '1px solid #333', display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: 'background.paper' }}>
           <VideoPanel roomId={roomId} socket={getSocket()} />
        </Grid>

        {/* Chat Panel */}
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.map((msg, index) => (
              <Box key={msg.id || index} sx={{ display: 'flex', gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>{msg.sender.name ? msg.sender.name[0] : '?'}</Avatar>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 'bold' }}>
                      {msg.sender.name || 'Anonymous'}
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
