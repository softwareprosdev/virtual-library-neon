Security Checklist
 HTTPS: Enforce TLS 1.2+ on all connections
 CORS: Restrict origins to specific domains
 CSP: Implement Content Security Policy headers
 Rate Limiting: 100 requests/minute per IP
 File Upload: Scan for malware, limit size (50MB), whitelist MIME types
 SQL Injection: Use Prisma ORM (prevents injection)
 XSS: Sanitize all user inputs, use React automatic escaping
 CSRF: Use SameSite cookies, implement CSRF tokens for mutations
 Secrets: Rotate JWT secrets every 90 days
 TURN Server: Use long, random credentials, rate limit
 S3: Enable versioning, MFA delete on production bucket
 Monitoring: Alert on failed auth attempts (>5/min)