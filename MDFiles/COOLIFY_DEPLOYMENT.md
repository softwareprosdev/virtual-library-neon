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

You can also run the full stack on any server with Docker Compose using the included production configuration.

1.  **Configure Environment:**
    Ensure you have a `.env` file in the root directory with the necessary variables (see above or `.env.example`).
    **Crucial:** For the client build, `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` must be set in your `.env` file *before* running the build command.

2.  **Deploy:**
    ```bash
    # Build and start all services in production mode
    docker-compose -f docker-compose.prod.yml up -d --build
    ```

    The `docker-compose.prod.yml` is configured to:
    - Use production-ready images (Postgres 15, Redis 7).
    - Persist data using named volumes (`postgres_data`, `redis_data`).
    - Restart services automatically (`restart: always`).
    - Build the client with provided environment variables.

