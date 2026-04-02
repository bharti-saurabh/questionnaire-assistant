from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class QuestionBase(BaseModel):
    text: str
    section: Optional[str] = None
    number: Optional[int] = None
    is_required: bool = True
    notes: Optional[str] = None


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    status: Optional[str] = None
    is_required: Optional[bool] = None
    notes: Optional[str] = None
    section: Optional[str] = None


class QuestionSchema(QuestionBase):
    id: str
    project_id: str
    artefact_id: Optional[str] = None
    original_text: str
    status: str
    source_page: Optional[int] = None
    source_context: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuestionReviewItem(BaseModel):
    question_id: str
    approved: bool
    text: Optional[str] = None  # user can edit text before approving


class QuestionReviewRequest(BaseModel):
    approvals: List[QuestionReviewItem]


class QuestionResponse(BaseModel):
    data: QuestionSchema
    error: Optional[str] = None


class QuestionListResponse(BaseModel):
    data: List[QuestionSchema]
    error: Optional[str] = None
    meta: Optional[dict] = None
