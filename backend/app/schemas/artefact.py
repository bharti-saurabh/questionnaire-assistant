from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ArtefactSchema(BaseModel):
    id: str
    project_id: str
    filename: str
    original_name: str
    file_type: str
    file_size_bytes: int
    role: str
    parse_status: str
    parse_error: Optional[str] = None
    chroma_collection: Optional[str] = None
    page_count: Optional[int] = None
    uploaded_at: datetime
    indexed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ArtefactUpdate(BaseModel):
    role: Optional[str] = None


class ArtefactResponse(BaseModel):
    data: ArtefactSchema
    error: Optional[str] = None


class ArtefactListResponse(BaseModel):
    data: list[ArtefactSchema]
    error: Optional[str] = None


class ArtefactStatusResponse(BaseModel):
    data: dict
    error: Optional[str] = None
