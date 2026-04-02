from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import uuid
from datetime import datetime

from app.database import get_db
from app.models.project import Project, ProjectMetrics
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse, ProjectSchema
)

router = APIRouter(prefix="/projects", tags=["projects"])


def ensure_metrics(db: Session, project: Project):
    if not project.metrics:
        metrics = ProjectMetrics(project_id=project.id)
        db.add(metrics)
        db.commit()
        db.refresh(project)


@router.get("", response_model=ProjectListResponse)
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    for p in projects:
        ensure_metrics(db, p)
    return ProjectListResponse(data=[ProjectSchema.model_validate(p) for p in projects])


@router.post("", response_model=ProjectResponse)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        id=str(uuid.uuid4()),
        name=body.name,
        description=body.description,
        deadline=body.deadline,
        deadline_source=body.deadline_source or "manual",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    ensure_metrics(db, project)
    db.refresh(project)
    return ProjectResponse(data=ProjectSchema.model_validate(project))


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    ensure_metrics(db, project)
    db.refresh(project)
    return ProjectResponse(data=ProjectSchema.model_validate(project))


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    ensure_metrics(db, project)
    db.refresh(project)
    return ProjectResponse(data=ProjectSchema.model_validate(project))


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"data": {"deleted": True}, "error": None}
