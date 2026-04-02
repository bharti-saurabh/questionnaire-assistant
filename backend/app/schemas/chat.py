from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CitationSchema(BaseModel):
    artefact_id: str
    artefact_name: str
    page: int
    snippet: str


class ChatMessageSchema(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    phase: Optional[str] = None
    citations: List[CitationSchema] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionSchema(BaseModel):
    id: str
    question_id: str
    phase: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    data: ChatMessageSchema
    error: Optional[str] = None


class ChatSessionResponse(BaseModel):
    data: ChatSessionSchema
    error: Optional[str] = None


class ChatMessageListResponse(BaseModel):
    data: List[ChatMessageSchema]
    error: Optional[str] = None
