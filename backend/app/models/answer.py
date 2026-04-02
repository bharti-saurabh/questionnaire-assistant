import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    phase = Column(String, default="clarifying")  # clarifying | answering | review
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    question = relationship("Question", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="session")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # user | assistant | system
    content = Column(Text, nullable=False)
    phase = Column(String, nullable=True)
    citations = Column(Text, nullable=True)  # JSON string
    token_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="SET NULL"), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    content = Column(Text, nullable=False)
    is_current = Column(Boolean, default=True)
    source = Column(String, default="ai")  # ai | manual | ai_edited
    committed_by = Column(String, default="user")
    change_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question", back_populates="answers")
    session = relationship("ChatSession", back_populates="answers")
