from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import httpx

from app.database import get_db
from app.models.llm_config import LLMConfig
from app.schemas.llm_config import LLMConfigUpdate, LLMConfigPublic, LLMConfigResponse

router = APIRouter(prefix="/llm-config", tags=["llm-config"])


def _get_or_create(db: Session) -> LLMConfig:
    config = db.query(LLMConfig).filter(LLMConfig.id == 1).first()
    if not config:
        config = LLMConfig(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("", response_model=LLMConfigResponse)
def get_config(db: Session = Depends(get_db)):
    config = _get_or_create(db)
    return LLMConfigResponse(data=LLMConfigPublic.model_validate(config))


@router.put("", response_model=LLMConfigResponse)
def update_config(body: LLMConfigUpdate, db: Session = Depends(get_db)):
    config = _get_or_create(db)

    if body.provider is not None:
        config.provider = body.provider
    if body.base_url is not None:
        config.base_url = body.base_url
    if body.api_key is not None:
        # Store key and hint (last 4 chars)
        config.api_key_encrypted = body.api_key
        config.api_key_hint = body.api_key[-4:] if len(body.api_key) >= 4 else "****"
    if body.model_name is not None:
        config.model_name = body.model_name
    if body.embedding_model is not None:
        config.embedding_model = body.embedding_model
    if body.max_tokens is not None:
        config.max_tokens = body.max_tokens
    if body.temperature is not None:
        config.temperature = body.temperature

    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)
    return LLMConfigResponse(data=LLMConfigPublic.model_validate(config))


@router.post("/test")
def test_connection(db: Session = Depends(get_db)):
    config = _get_or_create(db)
    import time

    start = time.time()
    try:
        from app.services.llm_client import call_llm
        result = call_llm("Say 'OK' in one word.", db=db)
        latency_ms = int((time.time() - start) * 1000)
        return {"data": {"ok": True, "latency_ms": latency_ms, "response": result[:50]}}
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return {"data": {"ok": False, "latency_ms": latency_ms, "error": str(e)}}
