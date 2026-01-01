'use client';

import { useState } from 'react';
import { Box, TextField, Button, Paper, Typography } from '@mui/material';

interface Message {
  text: string;
  senderId: string;
}

interface ChatPanelProps {
  socket: {
    emit: (event: string, data: { roomId: string; text: string }) => void;
  };
  myId: string;
  roomId?: string; // Adding optional roomId
}

export default function ChatPanel({ socket, myId, roomId = 'default' }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit('chat', { roomId, text: input });
      setMessages([...messages, { text: input, senderId: myId }]);
      setInput('');
    }
  };

  return (
    <Box sx={{ width: 300, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper', p: 2 }}>
      <Typography variant="h6" gutterBottom>Room Chat</Typography>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
        {messages.map((msg, i) => (
          <Paper key={i} sx={{ p: 1, mb: 1, bgcolor: msg.senderId === myId ? 'primary.dark' : 'background.default' }}>
            <Typography variant="body2">{msg.text}</Typography>
          </Paper>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField 
          fullWidth 
          size="small" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
        />
        <Button variant="contained" onClick={sendMessage}>Send</Button>
      </Box>
    </Box>
  );
}