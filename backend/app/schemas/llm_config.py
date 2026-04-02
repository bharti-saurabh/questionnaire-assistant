from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LLMConfigUpdate(BaseModel):
    provider: str = "anthropic"
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    embedding_model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None


class LLMConfigPublic(BaseModel):
    provider: str
    base_url: Optional[str] = None
    api_key_hint: Optional[str] = None
    model_name: str
    embedding_model: str
    max_tokens: int
    temperature: float
    updated_at: datetime

    class Config:
        from_attributes = True


class LLMConfigResponse(BaseModel):
    data: LLMConfigPublic
    error: Optional[str] = None
