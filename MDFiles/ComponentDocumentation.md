Component Documentation
RoomSelector.tsx
Purpose: Create and list available rooms
State: roomName, rooms[]
API Calls: POST /api/rooms, GET /api/rooms
Navigation: Redirects to /room?id={roomId}
VideoPanel.tsx
Purpose: Manage WebRTC video/audio connections
Props: roomId, socket, localPeerId, peers
Features:
Local media stream management
Peer connection initialization
Signal handling
Video element rendering
ChatPanel.tsx
Purpose: Real-time chat interface
Props: socket, myId
Features:
Message history
Input with Enter key support
Auto-scroll to latest messages
BookReader.tsx
Purpose: Render PDF/ePub files
Props: url, bookId
Features:
Page navigation
Zoom controls
Text selection
Sync reading position (future enhancement)
VoiceRecorder.tsx
Purpose: Record and upload voice notes
Features:
MediaRecorder API
Blob to S3 upload
Duration tracking
Playback controls
