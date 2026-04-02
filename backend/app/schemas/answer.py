from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AnswerCreate(BaseModel):
    content: str
    source: str = "ai"  # ai | manual | ai_edited
    change_summary: Optional[str] = None


class AnswerSchema(BaseModel):
    id: str
    question_id: str
    session_id: Optional[str] = None
    version: int
    content: str
    is_current: bool
    source: str
    committed_by: str
    change_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnswerResponse(BaseModel):
    data: AnswerSchema
    error: Optional[str] = None


class AnswerListResponse(BaseModel):
    data: List[AnswerSchema]
    error: Optional[str] = None
