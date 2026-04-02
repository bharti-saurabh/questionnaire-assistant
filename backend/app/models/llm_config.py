from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime
from app.database import Base


class LLMConfig(Base):
    __tablename__ = "llm_configs"

    id = Column(Integer, primary_key=True, default=1)
    provider = Column(String, default="anthropic")  # anthropic | openai_compat
    base_url = Column(String, nullable=True)
    api_key_encrypted = Column(String, nullable=True)  # store key securely
    api_key_hint = Column(String, nullable=True)  # last 4 chars for display
    model_name = Column(String, default="claude-opus-4-5")
    embedding_model = Column(String, default="text-embedding-3-small")
    max_tokens = Column(Integer, default=4096)
    temperature = Column(Float, default=0.3)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
