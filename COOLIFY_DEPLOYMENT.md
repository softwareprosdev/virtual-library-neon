# Coolify / VPS Deployment Guide

This project is containerized and ready for deployment using Docker.

## Structure
- **Client:** Next.js (Standalone Mode) running on Port 3000
- **Server:** Express.js + Socket.io running on Port 4000
- **Database:** PostgreSQL (Port 5432)
- **Cache:** Redis (Port 6379)

## Deployment via Coolify

1.  **Create a Project:** In your Coolify dashboard, create a new project.
2.  **Source:** Connect your GitHub repository.
3.  **Application (Server):**
    *   **Build Pack:** Dockerfile
    *   **Context:** `/server`
    *   **Environment Variables:**
        *   `PORT`: 4000
        *   `DATABASE_URL`: `postgresql://user:pass@postgres:5432/vlib`
        *   `REDIS_URL`: `redis://redis:6379`
        *   `JWT_SECRET`: (Generate a strong secret)
4.  **Application (Client):**
    *   **Build Pack:** Dockerfile
    *   **Context:** `/client`
    *   **Environment Variables:**
        *   `NEXT_PUBLIC_API_URL`: `https://your-server-domain.com/api`
        *   `NEXT_PUBLIC_SOCKET_URL`: `https://your-server-domain.com`
5.  **Databases:**
    *   Add a PostgreSQL service (Version 15+).
    *   Add a Redis service (Version 7+).

## Manual Docker Deployment

You can also run the full stack on any server with Docker Compose:

```bash
# Build and start all services in production mode
docker-compose -f docker-compose.prod.yml up -d --build
```
*(Note: You need to create `docker-compose.prod.yml` slightly modified from the dev version to remove volume bindings for code)*
