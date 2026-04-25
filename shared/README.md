# NetSentinel AI — Shared Contracts

This directory serves as the contract layer between the FastAPI backend, the Edge Agents, and the Next.js frontend.

## Workflow

1. **Backend updates**: When you modify API routers or Pydantic schemas in the backend.
2. **Generate Spec**: Dump the OpenAPI specification to this directory.
   ```bash
   # (From backend directory)
   python -c "import json; from app.main import app; print(json.dumps(app.openapi(), indent=2))" > ../shared/openapi.json
   ```
3. **Generate Frontend Types**: Use an automated tool to generate TypeScript interfaces.
   ```bash
   npx openapi-typescript ../shared/openapi.json -o src/lib/generated/api.d.ts
   ```

By centralizing `openapi.json` here, we prevent silent schema drift and ensure the Edge Agent and Frontend are always strongly typed against the Backend.
