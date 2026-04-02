import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    deadline_source = Column(String, default="manual")  # 'extracted' | 'manual'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    artefacts = relationship("Artefact", back_populates="project", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="project", cascade="all, delete-orphan")
    metrics = relationship("ProjectMetrics", back_populates="project", uselist=False, cascade="all, delete-orphan")


class ProjectMetrics(Base):
    __tablename__ = "project_metrics"

    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    total_questions = Column(Integer, default=0)
    approved_count = Column(Integer, default=0)
    answered_count = Column(Integer, default=0)
    in_progress_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="metrics")
