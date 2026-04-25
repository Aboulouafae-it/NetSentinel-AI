# NetSentinel AI

**AI-powered network management, observability, and cybersecurity platform for modern, hybrid infrastructures.**

NetSentinel AI provides a unified view of your network infrastructure. By blending standard network telemetry with specialized radio diagnostics, it empowers operators to secure their core network, troubleshoot field deployments, and leverage an AI copilot to explain complex incidents—whether they stem from a cyber threat, a misconfigured switch, or a misaligned outdoor radio link.

> **Project status:** Work in progress. The local MVP runs with Docker Compose and includes a desktop launcher, but several monitoring, AI, automation, and enterprise features are still under active development.

---

## Highlights

- Unified dark dashboard for operations, assets, incidents, wireless diagnostics, logs, and automation.
- FastAPI backend with OpenAPI/Swagger documentation.
- PostgreSQL and Redis infrastructure via Docker Compose.
- Electron desktop client so the platform can be opened from the Linux application menu.
- Custom NetSentinel AI identity: red sentinel eye, three inner nodes, and a white brow mark.
- Roadmap-driven structure for discovery, observability, security, AI analysis, and response automation.

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- Node.js/npm if you want to run the Electron desktop client outside Docker

### 1. Clone and configure

```bash
git clone https://github.com/Aboulouafae-it/NetSentinel-AI.git "NetSentinel AI"
cd "NetSentinel AI"
cp .env.example .env
```

### 2. Start all services

```bash
docker compose up --build -d
```

This starts:
| Service    | URL                          | Description              |
|------------|------------------------------|--------------------------|
| Frontend   | http://localhost:3000         | Dashboard UI             |
| Backend    | http://localhost:8000         | API server               |
| API Docs   | http://localhost:8000/docs    | Interactive Swagger UI   |
| PostgreSQL | localhost:5432               | Database                 |
| Redis      | localhost:6379               | Cache / queue            |

### 3. Seed demo data

```bash
docker compose exec backend python -m app.seed
```

### 4. Open the platform

- Web dashboard: http://localhost:3000
- API docs: http://localhost:8000/docs

### Desktop launcher

On Linux, the repository includes a desktop entry and launcher script:

```bash
./Launch_NetSentinel.sh
```

After installing the desktop entry, open **NetSentinel AI** from the application menu. The launcher starts the local Docker services and opens the Electron desktop window, so daily use does not depend on manually opening a browser.

See [INSTALL.md](./INSTALL.md) for full local and desktop setup instructions.

For repository publishing notes, see [GITHUB_UPLOAD.md](./GITHUB_UPLOAD.md).

---

## Project Structure

```
├── backend/          # Python FastAPI backend
│   ├── app/
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── schemas/  # Pydantic validation schemas
│   │   ├── routers/  # API endpoint routers
│   │   ├── services/ # Business logic
│   │   └── security/ # Auth & JWT utilities
│   └── alembic/      # Database migrations
├── desktop-client/   # Electron desktop shell
├── frontend/         # Next.js TypeScript frontend
│   └── src/
│       ├── app/      # Pages (App Router)
│       ├── components/  # Reusable UI components
│       └── lib/      # API client & types
├── docker/           # Docker configuration
├── docs/             # Generated reports and supporting documentation
├── architecture.md   # System architecture
├── roadmap.md        # Product roadmap
├── INSTALL.md        # Installation and desktop setup
├── SECURITY.md       # Security policy and local deployment warnings
└── GITHUB_UPLOAD.md  # Pre-push checklist
```

## Development

### Backend only

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

### Running database migrations

```bash
cd backend
alembic upgrade head
```

---

## API Documentation

Once the backend is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Tech Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Frontend   | Next.js 14, TypeScript, CSS Modules |
| Desktop    | Electron                      |
| Backend    | Python 3.12, FastAPI, SQLAlchemy 2.0 |
| Database   | PostgreSQL 16                 |
| Cache      | Redis 7                       |
| Worker     | ARQ + Redis                   |
| Auth       | JWT (access + refresh tokens) |
| Container  | Docker, Docker Compose        |

---

## Repository Notes

- `.env` is intentionally ignored. Use `.env.example` as the template.
- `node_modules`, Docker volumes, build outputs, and local Codex files are ignored.
- The project is currently optimized for local/on-premise development rather than production hosting.
- The Desktop launcher is Linux-focused because it installs a `.desktop` application entry.

---

## Contributing

See [architecture.md](./architecture.md) for system design details and [roadmap.md](./roadmap.md) for planned features.

---

## License

Proprietary — All rights reserved.
