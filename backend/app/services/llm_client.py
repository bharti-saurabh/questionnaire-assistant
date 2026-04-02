import os
import logging
from typing import Optional, AsyncIterator
from app.config import settings

logger = logging.getLogger(__name__)


def get_anthropic_client():
    """Returns an Anthropic client using the configured API key."""
    try:
        import anthropic
        api_key = settings.ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set")
        return anthropic.Anthropic(api_key=api_key)
    except ImportError:
        raise RuntimeError("anthropic package not installed")


def get_llm_config_from_db(db) -> dict:
    """Reads LLM config from DB if present, falls back to env settings."""
    from app.models.llm_config import LLMConfig
    config = db.query(LLMConfig).filter(LLMConfig.id == 1).first()
    if config:
        return {
            "provider": config.provider,
            "base_url": config.base_url,
            "model_name": config.model_name,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "api_key_encrypted": config.api_key_encrypted,
        }
    return {
        "provider": "anthropic",
        "base_url": None,
        "model_name": settings.DEFAULT_LLM_MODEL,
        "max_tokens": 4096,
        "temperature": 0.3,
        "api_key_encrypted": None,
    }


def call_llm(prompt: str, system: str = "", model: str = None, max_tokens: int = 4096, db=None) -> str:
    """Synchronous LLM call. Returns the full response text."""
    import anthropic

    cfg = get_llm_config_from_db(db) if db else {
        "provider": "anthropic",
        "model_name": settings.DEFAULT_LLM_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.3,
        "api_key_encrypted": None,
        "base_url": None,
    }

    api_key = cfg.get("api_key_encrypted") or settings.ANTHROPIC_API_KEY
    model_name = model or cfg.get("model_name") or settings.DEFAULT_LLM_MODEL

    if cfg.get("provider") == "openai_compat" and cfg.get("base_url"):
        # OpenAI-compatible endpoint
        try:
            import openai
            client = openai.OpenAI(api_key=api_key, base_url=cfg["base_url"])
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                max_tokens=cfg.get("max_tokens", max_tokens),
                temperature=cfg.get("temperature", 0.3),
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI-compat LLM call failed: {e}")
            raise

    # Default: Anthropic
    client = anthropic.Anthropic(api_key=api_key)
    messages = [{"role": "user", "content": prompt}]
    kwargs = {
        "model": model_name,
        "max_tokens": cfg.get("max_tokens", max_tokens),
        "messages": messages,
    }
    if system:
        kwargs["system"] = system

    response = client.messages.create(**kwargs)
    return response.content[0].text if response.content else ""


def stream_llm(messages: list, system: str = "", model: str = None, max_tokens: int = 4096, db=None):
    """Returns a streaming context manager for Anthropic or OpenAI-compat."""
    import anthropic

    cfg = get_llm_config_from_db(db) if db else {
        "provider": "anthropic",
        "model_name": settings.DEFAULT_LLM_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.3,
        "api_key_encrypted": None,
        "base_url": None,
    }

    api_key = cfg.get("api_key_encrypted") or settings.ANTHROPIC_API_KEY
    model_name = model or cfg.get("model_name") or settings.DEFAULT_LLM_MODEL

    client = anthropic.Anthropic(api_key=api_key)
    kwargs = {
        "model": model_name,
        "max_tokens": cfg.get("max_tokens", max_tokens),
        "messages": messages,
    }
    if system:
        kwargs["system"] = system
    return client.messages.stream(**kwargs)
