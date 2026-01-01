📡 WebSocket Events
Client → Server
Event	Payload	Description
joinRoom	{ roomId: string }	Join a room
leaveRoom	{ roomId: string }	Leave a room
chat	{ roomId: string, text: string }	Send chat message
signal	{ roomId: string, targetId: string, signal: any }	WebRTC signaling
voiceNote	{ roomId: string, fileUrl: string }	Share voice note
Server → Client
Event	Payload	Description
peerList	string[]	Updated list of peer IDs
message	{ id: string, senderId: string, text: string, createdAt: Date }	New chat message
signal	{ from: string, signal: any }	Incoming WebRTC signal
userJoined	{ userId: string }	User joined room
userLeft	{ userId: string }	User left room
error	{ message: string }	Error notification
