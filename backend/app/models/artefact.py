import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Artefact(Base):
    __tablename__ = "artefacts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf | docx | xlsx | txt
    file_size_bytes = Column(Integer, nullable=False)
    storage_path = Column(String, nullable=False)
    role = Column(String, default="supporting")  # questionnaire | supporting | pitch
    parse_status = Column(String, default="pending")  # pending | parsing | indexing | ready | error
    parse_error = Column(Text, nullable=True)
    chroma_collection = Column(String, nullable=True)
    page_count = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    indexed_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="artefacts")
    questions = relationship("Question", back_populates="artefact")
