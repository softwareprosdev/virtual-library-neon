import { useEffect, useRef } from 'react';
import { Box, Avatar, Typography, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import Peer from 'simple-peer';

interface VideoPanelProps {
  roomId: string;
  socket: any;
  localPeerId: string;
  peers: string[]; // array of remote user IDs
}

const localVideo = document.createElement('video');
localVideo.autoplay = true;
localVideo.muted = true;

export default function VideoPanel({ roomId, socket, localPeerId, peers }: VideoPanelProps) {
  const peerInstances = useRef<Record<string, Peer>>({});

  // create local stream once
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        localVideo.srcObject = stream;
        localVideo.onloadedmetadata = () => localVideo.play();
      });
  }, []);

  // handle receiving signals for new peers
  useEffect(() => {
    // cleanup
    return () => {
      Object.values(peerInstances.current).forEach((p) => p.destroy());
    };
  }, []);

  // add new peers
  useEffect(() => {
    peers.forEach((peerId) => {
      if (peerId === localPeerId) return;
      if (peerInstances.current[peerId]) return; // already added

      // Create a new peer (initiator or not depends on ID compare)
      const initiator = peerId < localPeerId; // keep deterministic order
      const p = new Peer({
        initiator,
        trickle: false,
        stream: localVideo.captureStream(),
      });

      p.on('signal', (data: any) => {
        socket.emit('signal', { roomId, targetId: peerId, signal: data });
      });

      p.on('stream', (remoteStream) => {
        // Create a new <video> for the remote stream
        const el = document.getElementById(`remote-${peerId}`) as HTMLVideoElement;
        if (el) el.srcObject = remoteStream;
      });

      peerInstances.current[peerId] = p;
    });
  }, [peers, roomId, localPeerId]);

  // handle incoming signals from other peers
  useEffect(() => {
    socket.on('signal', ({ from, signal }) => {
      const p = peerInstances.current[from];
      if (p) p.signal(signal);
    });
    return () => socket.off('signal');
  }, [socket]);

  // render peer videos
  return (
    <Box sx={{ flex: 3, mr: 1 }}>
      <Typography variant="h6">Video</Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <video ref={r => r?.appendChild(localVideo)} autoPlay muted style={{ width: 200, height: 150, background: '#000' }} />

        {peers.map((id) => (
          <video
            key={id}
            id={`remote-${id}`}
            autoPlay
            style={{ width: 200, height: 150, background: '#000' }}
          />
        ))}
      </Box>
    </Box>
  );
}
