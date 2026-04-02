import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    artefact_id = Column(String, ForeignKey("artefacts.id", ondelete="SET NULL"), nullable=True)
    number = Column(Integer, nullable=True)
    section = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    original_text = Column(Text, nullable=False)
    status = Column(String, default="pending")
    # pending | approved | rejected | in_progress | answered | skipped
    is_required = Column(Boolean, default=True)
    source_page = Column(Integer, nullable=True)
    source_context = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="questions")
    artefact = relationship("Artefact", back_populates="questions")
    chat_sessions = relationship("ChatSession", back_populates="question", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")
