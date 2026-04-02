import uuid
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.project import Project, ProjectMetrics
from app.models.artefact import Artefact
from app.models.question import Question
from app.schemas.question import (
    QuestionCreate, QuestionUpdate, QuestionResponse,
    QuestionListResponse, QuestionSchema, QuestionReviewRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["questions"])


def refresh_metrics(db: Session, project_id: str):
    """Recomputes and saves project metrics."""
    qs = db.query(Question).filter(Question.project_id == project_id).all()
    approved = [q for q in qs if q.status in ("approved", "in_progress", "answered", "skipped")]
    metrics = db.query(ProjectMetrics).filter(ProjectMetrics.project_id == project_id).first()
    if not metrics:
        metrics = ProjectMetrics(project_id=project_id)
        db.add(metrics)
    metrics.total_questions = len(approved)
    metrics.approved_count = len(approved)
    metrics.answered_count = sum(1 for q in qs if q.status == "answered")
    metrics.in_progress_count = sum(1 for q in qs if q.status == "in_progress")
    metrics.skipped_count = sum(1 for q in qs if q.status == "skipped")
    metrics.updated_at = datetime.utcnow()
    db.commit()


def _background_extract(artefact_id: str, project_id: str, db_url: str):
    """Background task: extract questions from artefact using LLM."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.artefact import Artefact
    from app.models.question import Question
    from app.models.project import ProjectMetrics
    from app.services.question_extractor import extract_questions_from_artefact

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        artefact = db.query(Artefact).filter(Artefact.id == artefact_id).first()
        if not artefact:
            return

        extracted = extract_questions_from_artefact(
            artefact.storage_path, artefact.file_type, db=db
        )

        for item in extracted:
            q = Question(
                id=str(uuid.uuid4()),
                project_id=project_id,
                artefact_id=artefact_id,
                number=item.get("number"),
                section=item.get("section"),
                text=str(item.get("text", "")),
                original_text=str(item.get("text", "")),
                status="pending",
                is_required=item.get("is_required", True),
                source_page=item.get("source_page"),
            )
            db.add(q)

        db.commit()
        logger.info(f"Extracted {len(extracted)} questions from artefact {artefact_id}")

    except Exception as e:
        logger.error(f"Question extraction failed: {e}", exc_info=True)
    finally:
        db.close()


@router.post("/projects/{project_id}/extract-questions")
def extract_questions(
    project_id: str,
    body: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    artefact_id = body.get("artefact_id")
    if not artefact_id:
        raise HTTPException(status_code=400, detail="artefact_id is required")

    artefact = db.query(Artefact).filter(
        Artefact.id == artefact_id, Artefact.project_id == project_id
    ).first()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")
    if artefact.parse_status != "ready":
        raise HTTPException(status_code=400, detail="Artefact is not yet indexed. Wait for parse_status=ready.")

    background_tasks.add_task(
        _background_extract,
        artefact_id=artefact_id,
        project_id=project_id,
        db_url=str(settings.DATABASE_URL),
    )
    return {"data": {"status": "extracting"}, "error": None}


@router.get("/projects/{project_id}/extracted-questions", response_model=QuestionListResponse)
def get_extracted_questions(project_id: str, db: Session = Depends(get_db)):
    """Returns questions with status='pending' (awaiting user review)."""
    questions = db.query(Question).filter(
        Question.project_id == project_id,
        Question.status == "pending",
    ).order_by(Question.number).all()
    return QuestionListResponse(data=[QuestionSchema.model_validate(q) for q in questions])


@router.post("/projects/{project_id}/questions/review")
def review_questions(
    project_id: str,
    body: QuestionReviewRequest,
    db: Session = Depends(get_db),
):
    approved_count = 0
    rejected_count = 0
    for item in body.approvals:
        q = db.query(Question).filter(
            Question.id == item.question_id,
            Question.project_id == project_id,
        ).first()
        if not q:
            continue
        if item.approved:
            q.status = "approved"
            if item.text:
                q.text = item.text
            approved_count += 1
        else:
            q.status = "rejected"
            rejected_count += 1
        q.updated_at = datetime.utcnow()

    db.commit()
    refresh_metrics(db, project_id)
    return {"data": {"approved": approved_count, "rejected": rejected_count}, "error": None}


@router.get("/projects/{project_id}/questions", response_model=QuestionListResponse)
def list_questions(
    project_id: str,
    status: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.project_id == project_id)
    if status:
        statuses = status.split(",")
        q = q.filter(Question.status.in_(statuses))
    if section:
        q = q.filter(Question.section == section)

    total = q.count()
    questions = q.order_by(Question.number, Question.created_at).offset((page - 1) * per_page).limit(per_page).all()

    return QuestionListResponse(
        data=[QuestionSchema.model_validate(qu) for qu in questions],
        meta={"total": total, "page": page, "per_page": per_page},
    )


@router.post("/projects/{project_id}/questions", response_model=QuestionResponse)
def create_question(project_id: str, body: QuestionCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Auto-assign number
    max_num = db.query(Question).filter(Question.project_id == project_id).count()
    q = Question(
        id=str(uuid.uuid4()),
        project_id=project_id,
        number=body.number or (max_num + 1),
        section=body.section,
        text=body.text,
        original_text=body.text,
        status="approved",
        is_required=body.is_required,
        notes=body.notes,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    refresh_metrics(db, project_id)
    return QuestionResponse(data=QuestionSchema.model_validate(q))


@router.get("/projects/{project_id}/questions/{question_id}", response_model=QuestionResponse)
def get_question(project_id: str, question_id: str, db: Session = Depends(get_db)):
    q = db.query(Question).filter(
        Question.id == question_id, Question.project_id == project_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return QuestionResponse(data=QuestionSchema.model_validate(q))


@router.patch("/projects/{project_id}/questions/{question_id}", response_model=QuestionResponse)
def update_question(
    project_id: str, question_id: str, body: QuestionUpdate, db: Session = Depends(get_db)
):
    q = db.query(Question).filter(
        Question.id == question_id, Question.project_id == project_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(q, field, value)
    q.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(q)
    refresh_metrics(db, project_id)
    return QuestionResponse(data=QuestionSchema.model_validate(q))


@router.delete("/projects/{project_id}/questions/{question_id}")
def delete_question(project_id: str, question_id: str, db: Session = Depends(get_db)):
    q = db.query(Question).filter(
        Question.id == question_id, Question.project_id == project_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    refresh_metrics(db, project_id)
    return {"data": {"deleted": True}, "error": None}
