'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

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
    <div className="w-[300px] flex flex-col h-full bg-background border-l border-border p-4">
      <h6 className="font-bold mb-4 text-primary">Room Chat</h6>
      <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-2">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={cn(
              "p-2 rounded text-sm break-words",
              msg.senderId === myId 
                ? "bg-primary/20 text-primary-foreground ml-auto max-w-[90%]" 
                : "bg-muted text-foreground mr-auto max-w-[90%]"
            )}
          >
            <p>{msg.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          className="h-9"
        />
        <Button onClick={sendMessage} size="sm">Send</Button>
      </div>
    </div>
  );
}
