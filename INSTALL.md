# NetSentinel AI — Installation Guide

This guide explains how to run NetSentinel AI locally and how to open it as a desktop application from the Linux application menu.

## Requirements

- Docker 20+
- Docker Compose v2+
- Node.js and npm for the Electron desktop shell
- Linux desktop environment for the `.desktop` launcher

## 1. Configure Environment

```bash
cp .env.example .env
```

For local development, the default values in `.env.example` are enough. Before using the platform outside a local test machine, change `SECRET_KEY` and database credentials.

## 2. Start The Platform

```bash
docker compose up --build -d
```

This starts:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Dashboard UI |
| Backend | http://localhost:8000 | FastAPI API |
| API Docs | http://localhost:8000/docs | Swagger UI |
| PostgreSQL | localhost:5432 | Main database |
| Redis | localhost:6379 | Queue/cache |

Check containers:

```bash
docker compose ps
```

## 3. Optional Demo Data

```bash
docker compose exec backend python -m app.seed
```

## 4. Desktop Mode

The project includes an Electron client in `desktop-client/`. It opens the local dashboard in a native desktop window.

Install Electron dependencies if needed:

```bash
cd desktop-client
npm install
cd ..
```

Launch manually:

```bash
./Launch_NetSentinel.sh
```

The launcher will:

- start Docker Compose services,
- wait for backend and frontend readiness,
- open the Electron desktop client.

## 5. Add To Linux Application Menu

Install the icon and desktop entry for the current user:

```bash
install -Dm644 frontend/public/logo.png "$HOME/.local/share/icons/hicolor/512x512/apps/netsentinel-ai.png"
install -Dm644 NetSentinel-AI.desktop "$HOME/.local/share/applications/NetSentinel-AI.desktop"
update-desktop-database "$HOME/.local/share/applications"
```

After that, search for **NetSentinel AI** in the application menu.

## 6. Stop The Platform

```bash
docker compose down
```

To remove local database/cache volumes too:

```bash
docker compose down -v
```

## Troubleshooting

### Docker permission denied

If Docker requires administrator permissions, the desktop launcher will try to use `pkexec`. You may be asked for your system password.

You can also add your user to the Docker group:

```bash
sudo usermod -aG docker "$USER"
```

Then log out and log back in.

### Ports already in use

NetSentinel AI uses ports `3000`, `8000`, `5432`, and `6379`. Stop conflicting services or update `docker-compose.yml`.

### Desktop window opens before services are ready

The Electron client retries `http://localhost:3000` automatically. If the platform is still building, wait until Docker Compose finishes.
