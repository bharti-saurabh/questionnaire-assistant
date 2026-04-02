import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.answer import Answer
from app.models.question import Question


def _next_version(db: Session, question_id: str) -> int:
    max_ver = db.query(Answer).filter(Answer.question_id == question_id).count()
    return max_ver + 1


def commit_answer(
    db: Session,
    question_id: str,
    content: str,
    source: str = "ai",
    session_id: Optional[str] = None,
    change_summary: Optional[str] = None,
) -> Answer:
    """Creates a new answer version, marks previous versions as not current."""
    # Unset current on all existing answers
    db.query(Answer).filter(
        Answer.question_id == question_id, Answer.is_current == True
    ).update({"is_current": False})

    version = _next_version(db, question_id)
    answer = Answer(
        id=str(uuid.uuid4()),
        question_id=question_id,
        session_id=session_id,
        version=version,
        content=content,
        is_current=True,
        source=source,
        change_summary=change_summary,
    )
    db.add(answer)

    # Update question status
    question = db.query(Question).filter(Question.id == question_id).first()
    if question:
        question.status = "answered"
        question.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(answer)
    return answer


def revert_answer(db: Session, question_id: str, answer_id: str) -> Answer:
    """Creates a new version cloned from a specific historical version."""
    source_answer = db.query(Answer).filter(
        Answer.id == answer_id, Answer.question_id == question_id
    ).first()
    if not source_answer:
        raise ValueError("Answer version not found")

    return commit_answer(
        db,
        question_id=question_id,
        content=source_answer.content,
        source=source_answer.source,
        change_summary=f"Reverted to version {source_answer.version}",
    )
