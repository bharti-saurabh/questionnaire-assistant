from pydantic_settings import BaseSettings
from typing import List, Union


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/questionnaire.db"
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    ARTEFACT_STORAGE_DIR: str = "./data/artefacts"
    ANTHROPIC_API_KEY: str = ""
    DEFAULT_LLM_MODEL: str = "claude-opus-4-5"
    MAX_CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 64
    RAG_TOP_K: int = 8
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
