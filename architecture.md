# NetSentinel AI — Architecture

## Overview

NetSentinel AI is a modular, API-first platform for network management, observability, and cybersecurity. The architecture is designed for long-term evolution from a monolithic MVP to a distributed microservices system.

---

## System Layers

```
┌─────────────────────────────────────────────────────┐
│                   Presentation Layer                 │
│              Next.js Dashboard (TypeScript)          │
│         Pages │ Components │ API Client              │
├─────────────────────────────────────────────────────┤
│                      API Gateway                     │
│                FastAPI (Python 3.12)                  │
│          /api/v1/* │ JWT Auth │ OpenAPI               │
├─────────────────────────────────────────────────────┤
│                   Business Logic                     │
│         Services │ Validators │ Policies             │
├─────────────────────────────────────────────────────┤
│                    Data Layer                         │
│     SQLAlchemy ORM │ Alembic Migrations              │
├─────────────────────────────────────────────────────┤
│                  Infrastructure                      │
│        PostgreSQL │ Redis │ Docker                    │
└─────────────────────────────────────────────────────┘
```

---

## Module Architecture

### Platform Pillars
1. **Core Asset & Network Inventory**
2. **Monitoring & Observability**
3. **Security Detection & Incident Management**
4. **AI Copilot & Operational Intelligence**
5. **Wireless Link Intelligence**

### Backend Modules

Each backend module follows a consistent 3-layer pattern:

```
Router (API endpoints)
  └── Schema (Request/Response validation)
        └── Model (Database ORM)
```

| Module         | Purpose                                        |
|----------------|------------------------------------------------|
| **Auth**       | User registration, login, JWT token management |
| **Organizations** | Multi-tenant organization management       |
| **Sites**      | Physical/logical network sites per org         |
| **Assets**     | Network devices, servers, endpoints            |
| **Wireless Links** | Outdoor radio links, CPEs, PTP/PTMP diagnostics |
| **Alerts**     | Security and health alerts with severity       |
| **Incidents**  | Grouped alerts for investigation workflow      |
| **AI Assistant** | AI-powered chat for troubleshooting          |

### Data Model

```
Organization (1)
  ├── Users (N)
  ├── Sites (N)
  │     ├── Assets (N)
  │     └── Wireless Links (N) ── connects ──> Sites/Assets
  ├── Alerts (N)
  │     └── linked to Asset OR Wireless Link (optional)
  └── Incidents (N)
        └── linked to Alerts (N)
```

---

## Security Model

### Authentication Flow

1. User registers with email + password
2. Password hashed with bcrypt (cost factor 12)
3. Login returns JWT access token (30 min) + refresh token (7 days)
4. Access token sent as `Authorization: Bearer <token>` header
5. Protected endpoints validate token via FastAPI dependency injection

### Security Principles

- **No plaintext secrets** — all credentials via environment variables
- **Parameterized queries** — SQLAlchemy ORM prevents SQL injection
- **Input validation** — Pydantic schemas validate all API inputs
- **CORS configured** — only allowed origins can call the API
- **Non-root Docker** — backend container runs as unprivileged user
- **Dependency pinning** — requirements.txt pins all versions

---

## Data Flow

### API Request Lifecycle

```
Client Request
  → CORS Middleware
    → JWT Authentication (if protected)
      → Router (path + method matching)
        → Schema Validation (Pydantic)
          → Service Logic
            → Database Query (SQLAlchemy)
              → Response Schema
                → JSON Response
```

### Future: Event Pipeline

```
Network Agent → Redis Queue → Event Processor → PostgreSQL
                                    ↓
                            Alert Engine → Incident Manager
                                    ↓
                            AI Analysis → Dashboard
```

---

## Scaling Strategy

### Phase 1 (Current — MVP)
- Monolithic FastAPI backend
- Single PostgreSQL instance
- Redis for caching only
- Docker Compose for local development

### Phase 2 (Growth)
- Add background task workers (Celery + Redis)
- Add network scanning agents
- Add WebSocket for real-time dashboard updates
- Read replicas for PostgreSQL

### Phase 3 (Scale)
- Extract services (auth, alerting, AI) into separate containers
- Add API gateway (Traefik/Kong)
- Add message queue (Redis Streams or RabbitMQ)
- Add time-series DB (TimescaleDB) for metrics
- Kubernetes deployment

### Phase 4 (Enterprise)
- Multi-region deployment
- RBAC with fine-grained permissions
- SSO/SAML integration
- Audit logging
- Compliance reporting (SOC 2, ISO 27001)

---

## Technology Rationale

| Choice | Why |
|--------|-----|
| **FastAPI** | Async-native, auto OpenAPI docs, excellent type safety with Pydantic |
| **SQLAlchemy 2.0** | Most mature Python ORM, async support, Alembic for migrations |
| **Next.js 14** | React-based, SSR-ready, App Router for modern patterns |
| **PostgreSQL** | Rock-solid RDBMS, JSON support, full-text search, extensible |
| **Redis** | Sub-millisecond caching, pub/sub for real-time, Celery-compatible |
| **Docker Compose** | One-command local development, mirrors production topology |
| **JWT** | Stateless auth, works across services, no session storage needed |

---

## Directory Conventions

```
backend/app/
├── models/     # One file per database table
├── schemas/    # One file per API module (Create, Update, Response schemas)
├── routers/    # One file per API module (endpoint definitions)
├── services/   # Business logic that doesn't belong in routers
└── security/   # Auth primitives (JWT, hashing)
```

**Naming rules:**
- Models: singular (`User`, `Asset`)
- Schemas: suffixed with purpose (`AssetCreate`, `AssetResponse`)
- Routers: plural (`assets.py`, `incidents.py`)
- API paths: plural, kebab-case (`/api/v1/assets`, `/api/v1/ai-assistant`)
