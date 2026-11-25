"""Pydantic v2 API request and response schemas."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    objective: str = Field(..., min_length=5, max_length=8000)
    project_id: Optional[str] = None
    research_depth: str = Field(default="standard", pattern="^(quick|standard|deep)$")
    priority: str = Field(default="high", pattern="^(low|medium|high|critical)$")
    execution_mode: str = Field(default="autonomous", pattern="^(autonomous|supervised)$")
    attached_document_ids: list[str] = Field(default_factory=list)


class TaskOut(BaseModel):
    id: str
    project_id: Optional[str]
    objective: str
    research_depth: str
    priority: str
    execution_mode: str
    status: str
    progress: float
    current_agent: Optional[str]
    plan: list[Any]
    result_summary: Optional[str]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentUpdate(BaseModel):
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    system_instructions: Optional[str] = None
    enabled: Optional[bool] = None


class AgentOut(BaseModel):
    id: str
    name: str
    role: str
    description: str
    system_instructions: str
    model_provider: str
    model_name: str
    tools: list[str]
    capabilities: list[str]
    color_theme: str
    enabled: bool

    model_config = {"from_attributes": True}


class ApprovalDecision(BaseModel):
    decision: str = Field(..., pattern="^(approved|rejected)$")
    reviewer_note: str = ""


class MemoryCreate(BaseModel):
    layer: str = Field(default="long_term", pattern="^(short_term|long_term|episodic)$")
    category: str = "general"
    content: str = Field(..., min_length=2)
    source: str = "user"
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    session_id: Optional[str] = None
    ttl_hours: Optional[int] = Field(default=None, ge=1, le=8760)


class UserRegister(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    full_name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: str
    password: str


class RAGQuestionRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)
    collection: Optional[str] = None


class MCPToolInvoke(BaseModel):
    server_id: str
    tool_name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class A2ATaskRequest(BaseModel):
    sender_agent: str
    target_agent: str
    objective: str
    payload: dict[str, Any] = Field(default_factory=dict)


class SettingsUpdate(BaseModel):
    default_llm_provider: Optional[str] = None
    default_llm_model: Optional[str] = None
    max_workflow_retries: Optional[int] = Field(default=None, ge=0, le=5)
    require_approval_for_reports: Optional[bool] = None
