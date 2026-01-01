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
  Grid,
  Avatar,
  Chip,
  Tooltip,
  Divider
} from '@mui/material';

const LiveAudio = nextDynamic(() => import('../../../components/LiveAudio'), { 
  ssr: false,
  loading: () => <Box sx={{ flexGrow: 1, bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography className="neon-text">SYNCING_STREAMS...</Typography></Box>
});

export const dynamic = 'force-dynamic';

interface Message {
  id: string;
  text: string;
  sender: { name: string; email: string; id: string };
  createdAt: string;
}

interface Participant {
  userId: string;
  email: string;
  role: 'ADMIN' | 'MODERATOR' | 'LISTENER';
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myRole, setMyRole] = useState<string>('LISTENER');
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

    function onUserJoined(user: Participant) {
      setParticipants((prev) => {
        if (prev.find(p => p.userId === user.userId)) return prev;
        return [...prev, user];
      });
      // Logic to determine "my" role could be added here if userId matches
    }

    function onUserLeft({ userId }: { userId: string }) {
      setParticipants((prev) => prev.filter(p => p.userId !== userId));
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message', (data: unknown) => onMessage(data as Message));
    socket.on('userJoined', (data: unknown) => onUserJoined(data as Participant));
    socket.on('userLeft', (data: unknown) => onUserLeft(data as { userId: string }));

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message');
      socket.off('userJoined');
      socket.off('userLeft');
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return '#ef4444'; // Red
      case 'MODERATOR': return '#d946ef'; // Purple
      default: return '#64748b'; // Gray
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar position="static" sx={{ borderBottom: '1px solid', borderColor: 'primary.dark' }}>
        <Toolbar>
          <Button onClick={() => router.push('/dashboard')} sx={{ color: 'text.secondary', mr: 2 }}>← HUB</Button>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'primary.main', fontWeight: 'bold' }}>
            {roomName.toUpperCase()}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
             <Chip label={myRole} size="small" sx={{ bgcolor: getRoleColor(myRole), color: 'white', fontWeight: 'bold' }} />
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isConnected ? '#10b981' : '#ef4444', boxShadow: isConnected ? '0 0 10px #10b981' : 'none' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{isConnected ? "CONNECTED" : "OFFLINE"}</Typography>
             </Box>
          </Stack>
        </Toolbar>
      </AppBar>

      <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Main Content Area (Live Audio/Video) */}
        <Grid item xs={12} md={8} sx={{ borderRight: '1px solid #333', display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: 'background.paper' }}>
           <LiveAudio roomId={roomId} />
        </Grid>

        {/* Right Sidebar: Chat + Participants */}
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Participants Area */}
          <Box sx={{ height: '25%', borderBottom: '1px solid #333', p: 2, overflowY: 'auto' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 1, display: 'block' }}>ACTIVE_PARTICIPANTS ({participants.length})</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {participants.map((p) => (
                <Tooltip title={`${p.email} (${p.role})`} key={p.userId}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: getRoleColor(p.role), fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {p.email[0].toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
            </Box>
          </Box>

          {/* Chat Area */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.map((msg, index) => (
              <Box key={msg.id || index} sx={{ display: 'flex', gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>{msg.sender.name ? msg.sender.name[0] : '?'}</Avatar>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 'bold' }}>{msg.sender.name || 'Anonymous'}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>{new Date(msg.createdAt).toLocaleTimeString()}</Typography>
                  </Box>
                  <Paper sx={{ p: 1.5, bgcolor: 'background.paper', border: '1px solid #333', borderRadius: '0 12px 12px 12px', maxWidth: '100%' }}>
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
                fullWidth variant="outlined" placeholder="Transmit message..." size="small" value={inputText}
                onChange={(e) => setInputText(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#000' } }}
              />
              <Button type="submit" variant="contained" disabled={!inputText.trim()} sx={{ minWidth: 100 }}>SEND</Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}