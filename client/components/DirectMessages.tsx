'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Search,
  UserPlus,
  Check,
  CheckCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useSocket } from '@/hooks/useSocket';

interface User {
  id: string;
  name: string;
  displayName?: string;
  avatarUrl?: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  readAt?: string;
  createdAt: string;
  sender?: User;
  receiver?: User;
}

interface Conversation {
  partnerId: string;
  name: string;
  displayName?: string;
  avatarUrl?: string;
  lastMessageAt: string;
  unreadCount: number;
}

export default function DirectMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  useEffect(() => {
    setCurrentUserId(getUser()?.id || null);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('directMessage', (message: Message) => {
        if (selectedUser && 
            (message.senderId === selectedUser.id || message.receiverId === selectedUser.id)) {
          setMessages(prev => [...prev, message]);
        }
        
        // Update conversations list
        fetchConversations();
      });

      socket.on('messagesRead', ({ readerId }) => {
        if (readerId === currentUserId && selectedUser) {
          setMessages(prev => 
            prev.map(msg => 
              msg.senderId === selectedUser.id 
                ? { ...msg, readAt: new Date().toISOString() }
                : msg
            )
          );
        }
      });

      return () => {
        socket.off('directMessage');
        socket.off('messagesRead');
      };
    }
  }, [socket, selectedUser, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await api('/direct-messages/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const response = await api(`/direct-messages/conversation/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        
        // Mark messages as read
        await api(`/direct-messages/read/${userId}`, { method: 'PUT' });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    const user: User = {
      id: conversation.partnerId,
      name: conversation.name,
      displayName: conversation.displayName,
      avatarUrl: conversation.avatarUrl
    };
    
    setSelectedUser(user);
    fetchMessages(conversation.partnerId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || sending) return;

    setSending(true);
    try {
      const response = await api('/direct-messages/send', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: selectedUser.id,
          text: newMessage.trim()
        })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        fetchConversations(); // Update conversations list
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.displayName && conv.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getMessageStatus = (message: Message) => {
    if (message.senderId !== currentUserId) return null;
    if (message.readAt) return <CheckCheck className="w-4 h-4 text-blue-500" />;
    return <Check className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Conversations List */}
      <div className="w-80 border-r bg-card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages
          </h2>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100%-5rem)]">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.partnerId}
                onClick={() => selectConversation(conversation)}
                className={`p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                  selectedUser?.id === conversation.partnerId ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conversation.avatarUrl} />
                      <AvatarFallback>
                        {(conversation.displayName || conversation.name).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs p-0">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {conversation.displayName || conversation.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      Last message {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-card">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedUser.avatarUrl} />
                  <AvatarFallback>
                    {(selectedUser.displayName || selectedUser.name).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {selectedUser.displayName || selectedUser.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">Active now</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isSent = message.senderId === currentUserId;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isSent 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm break-words">{message.text}</p>
                      <div className={`flex items-center justify-between gap-2 mt-1 text-xs ${
                        isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                        {getMessageStatus(message)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-card">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="icon"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p>Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}