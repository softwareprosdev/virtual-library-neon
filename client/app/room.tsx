import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useSession } from 'next-auth/react';
import ChatPanel from '../components/ChatPanel';
import VideoPanel from '../components/VideoPanel';
import BookReader from '../components/BookReader';
import { getSocket } from '../lib/socket.io';

export default function RoomPage() {
  const router = useRouter();
  const { id: roomId } = router.query as { id: string };
  const { data: session } = useSession();
  const [peerIds, setPeerIds] = useState<string[]>([]);

  const socket = getSocket();

  // join room on mount
  useEffect(() => {
    if (!roomId) return;
    socket.auth = { token: session?.user?.id }; // send JWT
    socket.emit('joinRoom', { roomId });

    socket.on('peerList', (list: string[]) => setPeerIds(list));
    return () => {
      socket.emit('leaveRoom', { roomId });
      socket.off('peerList');
    };
  }, [roomId, session?.user?.id]);

  if (!roomId) return <div>Loading…</div>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Optional book section: */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <BookReader url="/assets/sample.pdf" />
      </Box>

      {/* Video panel */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', p: 2 }}>
        <VideoPanel roomId={roomId} socket={socket} localPeerId={session?.user?.id!} peers={peerIds} />
        <ChatPanel socket={socket} myId={session?.user?.id!} />
      </Box>
    </Box>
  );
}
