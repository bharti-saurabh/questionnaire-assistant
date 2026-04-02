# Questionnaire Assistant

An AI-powered tool to help teams respond to questionnaires, RFPs, and surveys using RAG over uploaded project documents.

## Features

- **Project management** — create projects, track multiple questionnaires
- **Document upload** — PDF, DOCX, XLSX, plain text; auto-parsed and indexed
- **AI question extraction** — LLM extracts questions from questionnaire files; user reviews and approves
- **RAG-powered chat** — conversational clarification phase before answer generation; sources cited inline
- **Answer management** — commit answers, full version history with revert
- **Word export** — download all answers as a structured .docx file
- **Configurable LLM** — Anthropic (default) or any OpenAI-compatible endpoint

## Quick Start

### Prerequisites

- Docker & Docker Compose
- An Anthropic API key (or OpenAI-compatible key)

### Setup

```bash
git clone <repo>
cd questionnaire-assistant

cp backend/.env.example backend/.env
# Edit backend/.env and set ANTHROPIC_API_KEY=sk-ant-...

docker compose up --build
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **API docs**: http://localhost:8000/docs

### Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # fill in your API key
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Usage

1. **Create a project** — click "New Project" from the dashboard
2. **Upload artefacts** — go to project settings, drag-and-drop files
   - Set the questionnaire file role to "Questionnaire"
   - Wait for status to show "Ready"
3. **Extract questions** — click "Extract Questions" in the project header; review and approve
4. **Answer questions** — click any question in the left panel
   - Chat with the AI to provide context (clarifying phase)
   - Click "Generate Answer" to draft the response
   - Validate, edit if needed, then "Commit Answer"
5. **Download** — click "Download Answers (.docx)" in the right panel

## Configuration

### LLM Settings

Click the Bot icon in the sidebar to configure:
- **Provider**: Anthropic or OpenAI-compatible (Azure, Ollama, etc.)
- **API Key**: your key (stored server-side, never in the browser)
- **Model**: e.g. `claude-opus-4-5`, `gpt-4o`, `llama3`
- **Temperature / Max Tokens**: tunable

### Environment Variables (backend)

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for Anthropic provider |
| `DATABASE_URL` | `sqlite:///./data/questionnaire.db` | SQLite DB path |
| `CHROMA_PERSIST_DIR` | `./data/chroma` | ChromaDB storage |
| `ARTEFACT_STORAGE_DIR` | `./data/artefacts` | Uploaded files |
| `DEFAULT_LLM_MODEL` | `claude-opus-4-5` | Default model |
| `MAX_CHUNK_SIZE` | `512` | RAG chunk size (words) |
| `CHUNK_OVERLAP` | `64` | Chunk overlap (words) |
| `RAG_TOP_K` | `8` | Retrieved chunks per query |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |

## Architecture

```
frontend/          Next.js 14 + TypeScript + Tailwind + shadcn/ui
backend/
  app/
    routers/       FastAPI route handlers
    services/      Business logic (RAG, LLM, parsing, export)
    parsers/       PDF / DOCX / XLSX / TXT parsers
    models/        SQLAlchemy ORM (SQLite)
    schemas/       Pydantic request/response models
    utils/         Chunker, deadline extractor
  data/            Runtime data (gitignored)
    questionnaire.db
    chroma/        Vector embeddings
    artefacts/     Uploaded files
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Zustand |
| Backend | Python, FastAPI, SQLAlchemy, Alembic |
| Database | SQLite (file-based, zero-config) |
| Vector Store | ChromaDB (local, persistent) |
| LLM | Anthropic Claude (configurable) |
| Document parsing | PyMuPDF, python-docx, openpyxl |
| Export | python-docx |

## Data Persistence

All data is stored locally:
- `backend/data/questionnaire.db` — projects, questions, answers
- `backend/data/chroma/` — document embeddings
- `backend/data/artefacts/` — uploaded files

Back up the `backend/data/` directory to preserve your work.
