'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { connectSocket, getSocket } from '../../../lib/socket';
import { api } from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import BookPanel from '../../../components/BookPanel';
import nextDynamic from 'next/dynamic';
import {
  Box,
  TextField,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Avatar,
  Tooltip,
  Stack,
  IconButton
} from '@mui/material';
import Grid from '@mui/material/Grid';

const LiveAudio = nextDynamic(() => import('../../../components/LiveAudio'), {
  ssr: false,
  loading: () => <Box sx={{ flexGrow: 1, bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography className="neon-text">ESTABLISHING_LINK...</Typography></Box>
});

export const dynamic = 'force-dynamic';

const DeleteIcon = () => <span style={{ fontSize: '0.8rem' }}>🗑️</span>;

interface RoomData {
    id: string;
    name: string;
    description: string;
    books?: {
        id: string;
        title: string;
        author?: string;
        coverUrl?: string;
        description?: string;
        isbn?: string;
    }[];
    messages?: Message[];
}

interface Message {
  id: string;
  text: string;
  sender: { name: string; email: string; id: string };
  createdAt: string;
  isFlagged?: boolean;
  isSystem?: boolean;
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
  const [inputText, setInputText] = useState('');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
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
          setRoomData(data);
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

    function onMessageDeleted({ messageId }: { messageId: string }) {
      setMessages((prev) => prev.filter(m => m.id !== messageId));
    }

    function onUserJoined(user: Participant) {
      setParticipants((prev) => {
        if (prev.find(p => p.userId === user.userId)) return prev;
        return [...prev, user];
      });
      // Add system message
      setMessages((prev) => [...prev, {
        id: Math.random().toString(),
        text: `${user.email} joined the archives.`,
        sender: { name: 'SYSTEM', email: '', id: '' },
        createdAt: new Date().toISOString(),
        isSystem: true
      }]);
    }

    function onUserLeft({ userId }: { userId: string }) {
      setParticipants((prev) => prev.filter(p => p.userId !== userId));
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message', (data: unknown) => onMessage(data as Message));
    socket.on('messageDeleted', (data: unknown) => onMessageDeleted(data as { messageId: string }));
    socket.on('userJoined', (data: unknown) => onUserJoined(data as Participant));
    socket.on('userLeft', (data: unknown) => onUserLeft(data as { userId: string }));

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
      socket.off('messageDeleted');
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

  const handleDelete = (messageId: string) => {
    const socket = getSocket();
    socket.emit('deleteMessage', { roomId, messageId });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return '#ef4444';
      case 'MODERATOR': return '#d946ef';
      default: return '#64748b';
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" sx={{ borderBottom: '1px solid', borderColor: 'primary.dark' }}>
        <Toolbar>
          <Button onClick={() => router.push('/dashboard')} sx={{ color: 'text.secondary', mr: 2 }}>← HUB</Button>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'primary.main', fontWeight: 'bold' }}>
            {roomData?.name?.toUpperCase() || 'LOADING...'}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isConnected ? '#10b981' : '#ef4444', boxShadow: isConnected ? '0 0 10px #10b981' : 'none' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{isConnected ? "CONNECTED" : "OFFLINE"}</Typography>
             </Box>
          </Stack>
        </Toolbar>
      </AppBar>

      <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Main Content Area (Live Audio/Video) */}
        <Grid size={{ xs: 12, md: 8 }} sx={{
          borderRight: { md: '1px solid #333' },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          height: { xs: '50vh', md: '100%' },
          position: 'relative'
        }}>
           {/* Book Overlay/Header */}
           {roomData?.books && roomData.books.length > 0 && (
               <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, p: 2, background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)' }}>
                   <BookPanel book={roomData.books[0]} />
               </Box>
           )}
           <LiveAudio roomId={roomId} />
        </Grid>

        {/* Right Sidebar: Chat + Participants */}
        <Grid size={{ xs: 12, md: 4 }} sx={{
          display: 'flex',
          flexDirection: 'column',
          height: { xs: '50vh', md: '100%' },
          borderTop: { xs: '1px solid #333', md: 'none' }
        }}>
          <Box sx={{ height: '20%', borderBottom: '1px solid #333', p: 2, overflowY: 'auto' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 1, display: 'block' }}>NEURAL_PARTICIPANTS ({participants.length})</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {participants.map((p) => (
                <Tooltip title={`${p.email} (${p.role})`} key={p.userId}>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: getRoleColor(p.role), fontSize: '0.7rem' }}>
                    {p.email[0]?.toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {messages.map((msg, index) => (
              msg.isSystem ? (
                <Typography key={msg.id} variant="caption" sx={{ textAlign: 'center', color: 'text.secondary', fontStyle: 'italic', my: 1 }}>
                  {msg.text}
                </Typography>
              ) : (
                <Box key={msg.id || index} sx={{ display: 'flex', gap: 1, group: 'hover' }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: msg.isFlagged ? 'error.dark' : 'secondary.main', opacity: 0.8 }}>{msg.sender.name ? msg.sender.name[0] : '?'}</Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography variant="caption" sx={{ color: msg.isFlagged ? 'error.main' : 'primary.light', fontWeight: 'bold' }}>{msg.sender.name || 'Anonymous'}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>{new Date(msg.createdAt).toLocaleTimeString()}</Typography>
                      {/* Deletion Button for Admins/Mods */}
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(msg.id)} 
                        sx={{ ml: 'auto', opacity: 0.2, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    <Paper sx={{ 
                      p: 1.5, 
                      bgcolor: msg.isFlagged ? 'rgba(239, 68, 68, 0.1)' : 'background.paper', 
                      border: '1px solid', 
                      borderColor: msg.isFlagged ? 'error.main' : '#333',
                      borderRadius: '0 12px 12px 12px'
                    }}>
                      <Typography variant="body2" sx={{ color: msg.isFlagged ? 'error.light' : 'text.primary' }}>{msg.text}</Typography>
                    </Paper>
                  </Box>
                </Box>
              )
            ))}
            <div ref={messagesEndRef} />
          </Box>

          <Box component="form" onSubmit={handleSend} sx={{ p: 2, bgcolor: '#050505', borderTop: '1px solid #333' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth variant="outlined" placeholder="TRANSMIT_DATA..." size="small" value={inputText}
                onChange={(e) => setInputText(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#000' } }}
              />
              <Button type="submit" variant="contained" disabled={!inputText.trim()} sx={{ minWidth: 80, borderRadius: 0 }}>SEND</Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
