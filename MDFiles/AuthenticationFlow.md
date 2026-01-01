Authentication Flow
Registration

Client: POST /api/auth/register with email, password, name
Server: Hash password, create user, return JWT
Login

Client: POST /api/auth/login with credentials
Server: Verify password, generate JWT (15min) + Refresh token (7d)
Client: Store tokens in httpOnly cookies
Socket Connection

Client: Connect with socket.io-client and send JWT in auth header
Server: Verify JWT in io.use() middleware
Server: Store userId in socket data for all subsequent events
Token Refresh

Client: Auto-refresh before expiry using setTimeout
Server: Validate refresh token, issue new JWT