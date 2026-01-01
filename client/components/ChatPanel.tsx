import { useEffect, useState } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemText } from '@mui/material';

export default function ChatPanel({ socket, myId }: { socket: any; myId: string }) {
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<any[]>([]);

  useEffect(() => {
    socket.on('chat', (msg: any) => setMsgs(m => [...m, msg]));
    return () => socket.off('chat');
  }, [socket]);

  const send = () => {
    if (!text.trim()) return;
    socket.emit('chat', { roomId: socket.id, text });
    setText('');
  };

  return (
    <Box sx={{ flex: 1 }}>
      <List sx={{ height: 200, overflow: 'auto' }}>
        {msgs.map((m) => (
          <ListItem key={m.id}>
            <ListItemText primary={`${m.senderId === myId ? 'Me' : m.senderId}: ${m.text}`} />
          </ListItem>
        ))}
      </List>

      <Box sx={{ display: 'flex', mt: 1 }}>
        <TextField
          fullWidth
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && send()}
        />
        <Button variant="contained" onClick={send} sx={{ ml: 1 }}>
          Send
        </Button>
      </Box>
    </Box>
  );
}
