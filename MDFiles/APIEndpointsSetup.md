🔌 API Endpoints
Authentication (/api/auth)
Method	Endpoint	Auth	Description
POST	/api/auth/register	No	Create new user
POST	/api/auth/login	No	Login and get JWT
POST	/api/auth/refresh	Yes	Refresh access token
GET	/api/auth/me	Yes	Get current user
POST	/api/auth/logout	Yes	Invalidate session
Books (/api/books)
Method	Endpoint	Auth	Description
GET	/api/books	Yes	List user's books
POST	/api/books	Yes	Upload new book
GET	/api/books/:id	Yes	Get book metadata
PUT	/api/books/:id	Yes	Update book
DELETE	/api/books/:id	Yes	Delete book
GET	/api/books/:id/download	Yes	Get signed S3 URL
Rooms (/api/rooms)
Method	Endpoint	Auth	Description
GET	/api/rooms	Yes	List available rooms
POST	/api/rooms	Yes	Create new room
GET	/api/rooms/:id	Yes	Get room details
POST	/api/rooms/:id/join	Yes	Join room
POST	/api/rooms/:id/leave	Yes	Leave room
Voice Notes (/api/voice)
Method	Endpoint	Auth	Description
POST	/api/voice/upload	Yes	Upload voice note
GET	/api/voice/:id	Yes	Get voice note URL
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
