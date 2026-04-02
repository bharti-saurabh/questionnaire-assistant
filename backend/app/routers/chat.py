import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.question import Question
from app.models.answer import ChatSession, ChatMessage
from app.schemas.chat import (
    ChatSessionResponse, ChatSessionSchema,
    ChatMessageListResponse, ChatMessageSchema,
    SendMessageRequest,
)
from app.services.chat_service import (
    get_or_create_session,
    get_session_messages,
    stream_clarify_response,
    stream_generate_answer,
)
import json

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


def _get_question_or_404(project_id: str, question_id: str, db: Session) -> Question:
    q = db.query(Question).filter(
        Question.id == question_id,
        Question.project_id == project_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


@router.post(
    "/projects/{project_id}/questions/{question_id}/sessions",
    response_model=ChatSessionResponse,
)
def create_or_get_session(project_id: str, question_id: str, db: Session = Depends(get_db)):
    question = _get_question_or_404(project_id, question_id, db)

    # Mark question in_progress if it was approved
    if question.status == "approved":
        question.status = "in_progress"
        db.commit()

    session = get_or_create_session(db, question_id)
    return ChatSessionResponse(data=ChatSessionSchema.model_validate(session))


@router.get(
    "/projects/{project_id}/questions/{question_id}/sessions/{session_id}/messages",
    response_model=ChatMessageListResponse,
)
def get_messages(
    project_id: str,
    question_id: str,
    session_id: str,
    db: Session = Depends(get_db),
):
    _get_question_or_404(project_id, question_id, db)
    messages = get_session_messages(db, session_id)
    result = []
    for msg in messages:
        schema = ChatMessageSchema.model_validate(msg)
        # Parse citations JSON
        if msg.citations:
            try:
                schema.citations = json.loads(msg.citations)
            except Exception:
                schema.citations = []
        result.append(schema)
    return ChatMessageListResponse(data=result)


@router.post(
    "/projects/{project_id}/questions/{question_id}/sessions/{session_id}/messages",
)
def send_message(
    project_id: str,
    question_id: str,
    session_id: str,
    body: SendMessageRequest,
    db: Session = Depends(get_db),
):
    question = _get_question_or_404(project_id, question_id, db)
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    def generate():
        yield from stream_clarify_response(db, session, question, body.content)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/projects/{project_id}/questions/{question_id}/sessions/{session_id}/generate-answer",
)
def generate_answer(
    project_id: str,
    question_id: str,
    session_id: str,
    db: Session = Depends(get_db),
):
    question = _get_question_or_404(project_id, question_id, db)
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    def generate():
        yield from stream_generate_answer(db, session, question)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
