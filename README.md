# NetSentinel AI

**AI-powered network management, observability, and cybersecurity platform for modern, hybrid infrastructures.**

NetSentinel AI provides a unified view of your network infrastructure. By blending standard network telemetry with specialized radio diagnostics, it empowers operators to secure their core network, troubleshoot field deployments, and leverage an AI copilot to explain complex incidents—whether they stem from a cyber threat, a misconfigured switch, or a misaligned outdoor radio link.

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

### 1. Clone and configure

```bash
git clone <your-repo-url> "NetSentinel AI"
cd "NetSentinel AI"
cp .env.example .env
```

### 2. Start all services

```bash
docker-compose up --build
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
docker-compose exec backend python -m app.seed
```

### 4. Open the dashboard

Navigate to **http://localhost:3000** in your browser.

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
├── frontend/         # Next.js TypeScript frontend
│   └── src/
│       ├── app/      # Pages (App Router)
│       ├── components/  # Reusable UI components
│       └── lib/      # API client & types
├── docker/           # Docker configuration
└── docs/             # Architecture & roadmap
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
| Backend    | Python 3.12, FastAPI, SQLAlchemy 2.0 |
| Database   | PostgreSQL 16                 |
| Cache      | Redis 7                       |
| Auth       | JWT (access + refresh tokens) |
| Container  | Docker, Docker Compose        |

---

## Contributing

See [architecture.md](./architecture.md) for system design details and [roadmap.md](./roadmap.md) for planned features.

---

## License

Proprietary — All rights reserved.
