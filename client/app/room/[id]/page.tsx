'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { connectSocket, getSocket } from '../../../lib/socket';
import { getToken } from '../../../lib/auth';
import BookPanel from '../../../components/BookPanel';
import nextDynamic from 'next/dynamic';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { Trash2, ArrowLeft, Send } from 'lucide-react';
import { cn } from '../../../lib/utils';

const LiveAudio = nextDynamic(() => import('../../../components/LiveAudio'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-black flex items-center justify-center">
      <p className="text-primary font-mono animate-pulse">ESTABLISHING_LINK...</p>
    </div>
  )
});

export const dynamic = 'force-dynamic';

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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const emitTypingStart = useCallback(() => {
    const socket = getSocket();
    if (socket && token) {
      socket.emit('typingStart', { roomId });
    }
  }, [roomId, token]);

  const emitTypingStop = useCallback(() => {
    const socket = getSocket();
    if (socket && token) {
      socket.emit('typingStop', { roomId });
    }
  }, [roomId, token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Emit typing start if not already typing
    if (e.target.value && !typingTimeoutRef.current) {
      emitTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
      typingTimeoutRef.current = null;
    }, 2000); // Stop typing indicator after 2 seconds of inactivity
  };

  const handleInputFocus = () => {
    if (inputText.trim()) {
      emitTypingStart();
    }
  };

  const handleInputBlur = () => {
    emitTypingStop();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/rooms/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setRoomData(data);
          setMessages(data.messages || []);
          scrollToBottom();
        }
      } catch (error) {
        console.error('Failed to fetch room data:', error);
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
        text: `${user.email.split('@')[0]} joined the archives.`,
        sender: { name: 'SYSTEM', email: '', id: '' },
        createdAt: new Date().toISOString(),
        isSystem: true
      }]);
    }

    function onUserLeft({ userId }: { userId: string }) {
      setParticipants((prev) => prev.filter(p => p.userId !== userId));
      // Remove from typing users if they leave
      setTypingUsers((prev) => prev.filter(id => id !== userId));
    }

    function onTypingStart({ userId }: { userId: string }) {
      setTypingUsers((prev) => {
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });
    }

    function onTypingStop({ userId }: { userId: string }) {
      setTypingUsers((prev) => prev.filter(id => id !== userId));
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message', (data: unknown) => onMessage(data as Message));
    socket.on('messageDeleted', (data: unknown) => onMessageDeleted(data as { messageId: string }));
    socket.on('userJoined', (data: unknown) => onUserJoined(data as Participant));
    socket.on('userLeft', (data: unknown) => onUserLeft(data as { userId: string }));
    socket.on('typingStart', (data: unknown) => onTypingStart(data as { userId: string }));
    socket.on('typingStop', (data: unknown) => onTypingStop(data as { userId: string }));

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
      socket.off('typingStart');
      socket.off('typingStop');

      // Stop typing when leaving
      emitTypingStop();

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
      // Stop typing indicator when sending message
      emitTypingStop();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleDelete = (messageId: string) => {
    const socket = getSocket();
    socket.emit('deleteMessage', { roomId, messageId });
  };

  const getRoleColorClass = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-destructive';
      case 'MODERATOR': return 'bg-primary';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            HUB
          </Button>
          <h1 className="flex-1 text-lg font-bold text-primary truncate">
            {roomData?.name?.toUpperCase() || 'LOADING...'}
          </h1>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-destructive")} />
            <span className="text-xs text-muted-foreground font-mono">{isConnected ? "CONNECTED" : "OFFLINE"}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Main Content Area (Live Audio/Video) */}
        <div className="flex-1 flex flex-col bg-secondary/5 h-[50vh] md:h-full overflow-hidden border-r border-border">
           {/* Book Panel - shows book being discussed */}
            {roomData?.books && roomData.books.length > 0 && (
                <div className="flex-shrink-0 p-2 sm:p-3 bg-background/95 border-b border-primary/30 z-10">
                   <BookPanel 
                     book={roomData.books[0]} 
                     onReadBook={(book) => {
                       // Open book in read page within same tab
                       window.open(`/read/${book.id}`, '_blank');
                     }}
                   />
               </div>
           )}
           {/* LiveAudio takes remaining space */}
           <div className="flex-1 min-h-0 overflow-hidden relative">
             <LiveAudio roomId={roomId} />
           </div>
        </div>

        {/* Right Sidebar: Chat + Participants */}
        <div className="w-full md:w-96 flex flex-col h-[50vh] md:h-full border-t md:border-t-0 md:border-l border-border bg-background">
          <div className="h-[20%] min-h-[120px] border-b border-border p-4 overflow-y-auto bg-muted/10">
            <span className="text-xs font-bold text-muted-foreground mb-2 block tracking-wider">NEURAL_PARTICIPANTS ({participants.length})</span>
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                {participants.map((p) => (
                  <Tooltip key={p.userId}>
                    <TooltipTrigger>
                      <Avatar className={cn("w-8 h-8 text-[0.7rem] border border-border", getRoleColorClass(p.role))}>
                        <AvatarFallback className="bg-transparent text-white">
                          {p.email[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{p.email.split('@')[0]} ({p.role})</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map((msg, index) => (
              msg.isSystem ? (
                <p key={msg.id} className="text-xs text-center text-muted-foreground italic my-2">
                  {msg.text}
                </p>
              ) : (
                <div key={msg.id || index} className="flex gap-2 group">
                  <Avatar className={cn("w-8 h-8 opacity-80", msg.isFlagged ? "bg-destructive" : "bg-secondary")}>
                    <AvatarFallback>{msg.sender.name ? msg.sender.name[0] : '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={cn("text-xs font-bold truncate", msg.isFlagged ? "text-destructive" : "text-primary")}>
                        {msg.sender.name || 'Anonymous'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                      {/* Deletion Button for Admins/Mods */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(msg.id)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    <div className={cn(
                      "p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl text-sm border",
                      msg.isFlagged 
                        ? "bg-destructive/10 border-destructive text-destructive" 
                        : "bg-muted/30 border-border text-foreground"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              )
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/5">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {typingUsers.slice(0, 3).map(userId => (
                    <div key={userId} className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  ))}
                </div>
                <span>
                  {typingUsers.length === 1
                    ? `${participants.find(p => p.userId === typingUsers[0])?.email.split('@')[0] || 'Someone'} is typing...`
                    : typingUsers.length === 2
                    ? `${participants.find(p => p.userId === typingUsers[0])?.email.split('@')[0] || 'Someone'} and ${participants.find(p => p.userId === typingUsers[1])?.email.split('@')[0] || 'someone'} are typing...`
                    : `${typingUsers.length} people are typing...`
                  }
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="p-4 bg-muted/5 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="TRANSMIT_DATA..."
                value={inputText}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="bg-background font-mono text-sm"
              />
              <Button type="submit" disabled={!inputText.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
