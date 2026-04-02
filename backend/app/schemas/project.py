from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProjectMetricsSchema(BaseModel):
    total_questions: int = 0
    approved_count: int = 0
    answered_count: int = 0
    in_progress_count: int = 0
    skipped_count: int = 0

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    deadline_source: Optional[str] = "manual"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    deadline_source: Optional[str] = None


class ProjectSchema(ProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime
    metrics: Optional[ProjectMetricsSchema] = None

    class Config:
        from_attributes = True


class ProjectResponse(BaseModel):
    data: ProjectSchema
    error: Optional[str] = None


class ProjectListResponse(BaseModel):
    data: list[ProjectSchema]
    error: Optional[str] = None
