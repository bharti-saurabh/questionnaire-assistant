from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import create_tables
from app.routers import projects, artefacts, questions, chat, answers, export, llm_config
import os

os.makedirs(settings.ARTEFACT_STORAGE_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs("data", exist_ok=True)

app = FastAPI(
    title="Questionnaire Assistant API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api/v1")
app.include_router(artefacts.router, prefix="/api/v1")
app.include_router(questions.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(answers.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(llm_config.router, prefix="/api/v1")


@app.on_event("startup")
async def startup():
    create_tables()


@app.get("/health")
def health():
    return {"status": "ok"}
