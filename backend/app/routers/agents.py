"""Edge Agent registration and heartbeat API."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.edge_agent import EdgeAgent, EdgeAgentStatus
from app.models.user import User
from app.schemas.agent import AgentHeartbeatRequest, AgentRegisterRequest, AgentRegisterResponse, EdgeAgentResponse
from app.services.activity import create_activity_event
from app.services.agent_security import generate_agent_token, hash_agent_token, verify_agent_token

router = APIRouter(prefix="/agents", tags=["Edge Agents"])


async def authenticate_agent(db: AsyncSession, agent_uid: str | None, token: str | None) -> EdgeAgent:
    if not agent_uid or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing agent credentials")
    agent = await db.scalar(select(EdgeAgent).where(EdgeAgent.agent_uid == agent_uid))
    if not agent or not verify_agent_token(token, agent.token_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid agent credentials")
    if agent.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Agent has been revoked")
    return agent


@router.post("/register", response_model=AgentRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_agent(data: AgentRegisterRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent_uid = data.agent_uid or f"agent-{uuid4()}"
    if await db.scalar(select(EdgeAgent).where(EdgeAgent.agent_uid == agent_uid)):
        raise HTTPException(status_code=409, detail="Agent UID already exists")
    token = generate_agent_token()
    agent = EdgeAgent(
        organization_id=current_user.organization_id,
        site_id=data.site_id,
        name=data.name,
        agent_uid=agent_uid,
        token_hash=hash_agent_token(token),
        version=data.version,
        hostname=data.hostname,
        ip_address=data.ip_address,
        status=EdgeAgentStatus.UNKNOWN,
    )
    db.add(agent)
    await db.flush()
    await create_activity_event(db, current_user.organization_id, "agent_registered", "edge_agent", f"Edge agent registered: {agent.name}", actor_type="user", actor_id=str(current_user.id), entity_id=str(agent.id))
    return {"id": str(agent.id), "agent_uid": agent.agent_uid, "token": token}


@router.post("/heartbeat")
async def heartbeat(
    data: AgentHeartbeatRequest,
    db: AsyncSession = Depends(get_db),
    x_agent_uid: str | None = Header(default=None),
    x_agent_token: str | None = Header(default=None),
):
    agent = await authenticate_agent(db, data.agent_uid or x_agent_uid, x_agent_token)
    previous_status = agent.status
    agent.status = EdgeAgentStatus(data.status)
    agent.last_seen = datetime.now(timezone.utc)
    agent.version = data.version or agent.version
    agent.hostname = data.hostname or agent.hostname
    agent.ip_address = data.ip_address or agent.ip_address
    agent.health_metadata = data.health_metadata or agent.health_metadata
    await db.flush()
    if agent.status != EdgeAgentStatus.HEALTHY or previous_status != agent.status:
        metadata = {"status": agent.status.value, **(data.health_metadata or {})}
        await create_activity_event(db, agent.organization_id, "agent_heartbeat", "edge_agent", f"Agent {agent.name} heartbeat: {agent.status.value}", actor_type="agent", actor_id=str(agent.id), entity_id=str(agent.id), severity="warning" if agent.status != EdgeAgentStatus.HEALTHY else "info", metadata=metadata)
    return {"status": "accepted", "agent_id": str(agent.id), "last_seen": agent.last_seen.isoformat()}


@router.get("/", response_model=list[EdgeAgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(EdgeAgent).where(EdgeAgent.organization_id == current_user.organization_id).order_by(EdgeAgent.name))
    return result.scalars().all()


@router.get("/{agent_id}", response_model=EdgeAgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = await db.scalar(select(EdgeAgent).where(EdgeAgent.id == agent_id, EdgeAgent.organization_id == current_user.organization_id))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("/{agent_id}/revoke", response_model=EdgeAgentResponse)
async def revoke_agent(agent_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = await db.scalar(select(EdgeAgent).where(EdgeAgent.id == agent_id, EdgeAgent.organization_id == current_user.organization_id))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.revoked_at = datetime.now(timezone.utc)
    agent.status = EdgeAgentStatus.OFFLINE
    await db.flush()
    await create_activity_event(db, current_user.organization_id, "agent_revoked", "edge_agent", f"Edge agent revoked: {agent.name}", actor_type="user", actor_id=str(current_user.id), entity_id=str(agent.id), severity="warning")
    await db.refresh(agent)
    return agent


@router.post("/{agent_id}/rotate-token")
async def rotate_agent_token(agent_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = await db.scalar(select(EdgeAgent).where(EdgeAgent.id == agent_id, EdgeAgent.organization_id == current_user.organization_id))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.revoked_at is not None:
        raise HTTPException(status_code=409, detail="Cannot rotate token for a revoked agent")
    token = generate_agent_token()
    agent.token_hash = hash_agent_token(token)
    await db.flush()
    await create_activity_event(db, current_user.organization_id, "agent_token_rotated", "edge_agent", f"Agent token rotated: {agent.name}", actor_type="user", actor_id=str(current_user.id), entity_id=str(agent.id), severity="warning")
    return {"id": str(agent.id), "agent_uid": agent.agent_uid, "token": token}
