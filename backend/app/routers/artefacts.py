import os
import uuid
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.artefact import Artefact
from app.models.project import Project
from app.schemas.artefact import (
    ArtefactSchema, ArtefactUpdate, ArtefactResponse,
    ArtefactListResponse, ArtefactStatusResponse,
)
from app.services.artefact_parser import parse_artefact
from app.services.rag_service import ingest_artefact, delete_artefact_from_chroma
from app.utils.deadline_extractor import extract_deadline

logger = logging.getLogger(__name__)

router = APIRouter(tags=["artefacts"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "xlsx", "xls", "txt", "md"}


def _get_file_type(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"


def _background_parse_and_ingest(artefact_id: str, db_url: str):
    """Background task: parse file and ingest into ChromaDB."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.artefact import Artefact
    from app.models.project import Project

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        artefact = db.query(Artefact).filter(Artefact.id == artefact_id).first()
        if not artefact:
            return

        # Parsing
        artefact.parse_status = "parsing"
        db.commit()

        pages = parse_artefact(artefact.storage_path, artefact.file_type)

        if not pages:
            artefact.parse_status = "error"
            artefact.parse_error = "No text content found in file"
            db.commit()
            return

        artefact.page_count = max((p.get("page", 1) for p in pages), default=1)

        # Try to extract deadline from questionnaire docs
        if artefact.role == "questionnaire":
            full_text = " ".join(p["text"] for p in pages)
            deadline = extract_deadline(full_text)
            if deadline:
                project = db.query(Project).filter(Project.id == artefact.project_id).first()
                if project and not project.deadline:
                    project.deadline = deadline
                    project.deadline_source = "extracted"
                    db.commit()

        # Indexing
        artefact.parse_status = "indexing"
        db.commit()

        collection_name = ingest_artefact(artefact_id, artefact.project_id, pages)

        artefact.chroma_collection = collection_name
        artefact.parse_status = "ready"
        artefact.indexed_at = datetime.utcnow()
        db.commit()

        logger.info(f"Artefact {artefact_id} fully indexed")

    except Exception as e:
        logger.error(f"Parse/ingest failed for artefact {artefact_id}: {e}", exc_info=True)
        try:
            artefact = db.query(Artefact).filter(Artefact.id == artefact_id).first()
            if artefact:
                artefact.parse_status = "error"
                artefact.parse_error = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/projects/{project_id}/artefacts", response_model=ArtefactResponse)
async def upload_artefact(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    role: str = Form(default="supporting"),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_type = _get_file_type(file.filename or "file.txt")
    if file_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    if role not in ("questionnaire", "supporting", "pitch"):
        role = "supporting"

    artefact_id = str(uuid.uuid4())
    project_dir = os.path.join(settings.ARTEFACT_STORAGE_DIR, project_id)
    os.makedirs(project_dir, exist_ok=True)

    safe_filename = f"{artefact_id}.{file_type}"
    storage_path = os.path.join(project_dir, safe_filename)

    content = await file.read()
    with open(storage_path, "wb") as f:
        f.write(content)

    artefact = Artefact(
        id=artefact_id,
        project_id=project_id,
        filename=safe_filename,
        original_name=file.filename or "upload",
        file_type=file_type,
        file_size_bytes=len(content),
        storage_path=storage_path,
        role=role,
        parse_status="pending",
    )
    db.add(artefact)
    db.commit()
    db.refresh(artefact)

    background_tasks.add_task(
        _background_parse_and_ingest,
        artefact_id=artefact_id,
        db_url=str(settings.DATABASE_URL),
    )

    return ArtefactResponse(data=ArtefactSchema.model_validate(artefact))


@router.get("/projects/{project_id}/artefacts", response_model=ArtefactListResponse)
def list_artefacts(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    artefacts = db.query(Artefact).filter(Artefact.project_id == project_id).order_by(Artefact.uploaded_at.desc()).all()
    return ArtefactListResponse(data=[ArtefactSchema.model_validate(a) for a in artefacts])


@router.get("/projects/{project_id}/artefacts/{artefact_id}", response_model=ArtefactResponse)
def get_artefact(project_id: str, artefact_id: str, db: Session = Depends(get_db)):
    artefact = db.query(Artefact).filter(
        Artefact.id == artefact_id, Artefact.project_id == project_id
    ).first()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")
    return ArtefactResponse(data=ArtefactSchema.model_validate(artefact))


@router.get("/projects/{project_id}/artefacts/{artefact_id}/status", response_model=ArtefactStatusResponse)
def get_artefact_status(project_id: str, artefact_id: str, db: Session = Depends(get_db)):
    artefact = db.query(Artefact).filter(
        Artefact.id == artefact_id, Artefact.project_id == project_id
    ).first()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")
    return ArtefactStatusResponse(data={
        "parse_status": artefact.parse_status,
        "parse_error": artefact.parse_error,
        "indexed_at": artefact.indexed_at.isoformat() if artefact.indexed_at else None,
        "page_count": artefact.page_count,
    })


@router.patch("/projects/{project_id}/artefacts/{artefact_id}", response_model=ArtefactResponse)
def update_artefact(
    project_id: str,
    artefact_id: str,
    body: ArtefactUpdate,
    db: Session = Depends(get_db),
):
    artefact = db.query(Artefact).filter(
        Artefact.id == artefact_id, Artefact.project_id == project_id
    ).first()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")
    if body.role is not None:
        artefact.role = body.role
    db.commit()
    db.refresh(artefact)
    return ArtefactResponse(data=ArtefactSchema.model_validate(artefact))


@router.delete("/projects/{project_id}/artefacts/{artefact_id}")
def delete_artefact(project_id: str, artefact_id: str, db: Session = Depends(get_db)):
    artefact = db.query(Artefact).filter(
        Artefact.id == artefact_id, Artefact.project_id == project_id
    ).first()
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")

    # Remove from ChromaDB
    delete_artefact_from_chroma(artefact_id, project_id)

    # Remove file from disk
    try:
        if os.path.exists(artefact.storage_path):
            os.remove(artefact.storage_path)
    except Exception as e:
        logger.warning(f"Could not delete file {artefact.storage_path}: {e}")

    db.delete(artefact)
    db.commit()
    return {"data": {"deleted": True}, "error": None}
