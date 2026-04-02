from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.answer import Answer
from app.models.question import Question
from app.schemas.answer import AnswerCreate, AnswerSchema, AnswerResponse, AnswerListResponse
from app.services.answer_service import commit_answer, revert_answer
from app.routers.questions import refresh_metrics

router = APIRouter(tags=["answers"])


def _get_question_or_404(project_id: str, question_id: str, db: Session) -> Question:
    q = db.query(Question).filter(
        Question.id == question_id, Question.project_id == project_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


@router.get("/projects/{project_id}/questions/{question_id}/answers/current", response_model=AnswerResponse)
def get_current_answer(project_id: str, question_id: str, db: Session = Depends(get_db)):
    _get_question_or_404(project_id, question_id, db)
    answer = db.query(Answer).filter(
        Answer.question_id == question_id, Answer.is_current == True
    ).first()
    if not answer:
        raise HTTPException(status_code=404, detail="No committed answer yet")
    return AnswerResponse(data=AnswerSchema.model_validate(answer))


@router.get("/projects/{project_id}/questions/{question_id}/answers", response_model=AnswerListResponse)
def list_answers(project_id: str, question_id: str, db: Session = Depends(get_db)):
    _get_question_or_404(project_id, question_id, db)
    answers = db.query(Answer).filter(
        Answer.question_id == question_id
    ).order_by(Answer.version.desc()).all()
    return AnswerListResponse(data=[AnswerSchema.model_validate(a) for a in answers])


@router.post("/projects/{project_id}/questions/{question_id}/answers", response_model=AnswerResponse)
def create_answer(
    project_id: str,
    question_id: str,
    body: AnswerCreate,
    db: Session = Depends(get_db),
):
    _get_question_or_404(project_id, question_id, db)
    answer = commit_answer(
        db,
        question_id=question_id,
        content=body.content,
        source=body.source,
        change_summary=body.change_summary,
    )
    refresh_metrics(db, project_id)
    return AnswerResponse(data=AnswerSchema.model_validate(answer))


@router.post("/projects/{project_id}/questions/{question_id}/answers/{answer_id}/revert", response_model=AnswerResponse)
def revert_to_version(
    project_id: str,
    question_id: str,
    answer_id: str,
    db: Session = Depends(get_db),
):
    _get_question_or_404(project_id, question_id, db)
    try:
        answer = revert_answer(db, question_id=question_id, answer_id=answer_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    refresh_metrics(db, project_id)
    return AnswerResponse(data=AnswerSchema.model_validate(answer))
