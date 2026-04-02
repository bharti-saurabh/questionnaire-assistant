# Questionnaire Assistant — Requirements Document

## 1. Overview

A GenAI-powered web application that helps users respond to questionnaires (RFPs, surveys, compliance forms) by leveraging AI and RAG (Retrieval-Augmented Generation) over uploaded project documents. Users can upload supporting materials, extract questions automatically, answer them through a conversational AI interface, and export finalized answers as a Word document.

---

## 2. Functional Requirements

### 2.1 Project Management

- Users can create multiple projects, each representing a questionnaire response effort
- Each project has: name, description (optional), deadline (optional)
- Projects are listed on a dashboard with progress indicators (answered / total questions)
- Projects can be deleted (cascades to all artefacts, questions, and answers)
- Deadline can be set manually or auto-extracted from the uploaded questionnaire document

### 2.2 Artefact Management

- Users can upload multiple files per project
- Supported file formats: **PDF, DOCX, XLSX, TXT**
- Each artefact is assigned a role:
  - **Questionnaire** — the document containing questions to be answered
  - **Supporting** — background documents (e.g. capability statements, case studies)
  - **Pitch** — pitch decks or proposal documents
- Artefact role can be changed after upload
- Artefacts are parsed and indexed automatically in the background after upload
- Users can see the processing status of each artefact: Pending → Parsing → Indexing → Ready / Error
- Artefacts can be deleted (removes file from disk and embeddings from vector store)

### 2.3 Question Extraction

- Users trigger AI extraction of questions from a questionnaire artefact (must be role=Questionnaire and status=Ready)
- The AI parses the full document text and returns a structured list of questions including:
  - Question number, text, section/heading, source page, required flag
- Users review extracted questions before they are added to the project:
  - Approve or reject each question individually
  - Edit question text before approving
  - Bulk approve all / reject all
- Approved questions appear in the project todo list
- Users can also manually add questions

### 2.4 Question Todo List (Left Panel)

- Displays all approved, in-progress, answered, and skipped questions
- Questions grouped by section (if extracted from document)
- Filter questions by status: All / Todo / In Progress / Done / Skipped
- Shows live counts per filter
- Clicking a question opens the chat/answer workspace

### 2.5 Chat & Answer Workflow (Center Panel)

**Phase 1 — Clarifying:**
- When a question is selected, an AI chat session begins
- The AI asks up to 3 targeted clarifying questions to gather context
- All AI responses are grounded in the project artefacts via RAG
- Inline source citations shown per message (filename + page number)
- User responds conversationally to provide context
- A "Generate Answer" button appears after at least 1 user exchange
- Alternatively, user can click "Let AI ask questions" to start automatically

**Phase 2 — Answer Generation:**
- AI generates a complete, professional answer using:
  - Full conversation history from the clarifying phase
  - Top-K relevant chunks retrieved from all project artefacts
- Answer is streamed in real time via SSE (Server-Sent Events)
- Answer draft appears in an editor below the chat

**Phase 3 — Review:**
- User can:
  - **Commit** the answer as-is
  - **Request Changes** — type a revision request which re-triggers the clarifying/answer loop
  - **Manually Edit** — directly edit the answer text before committing
- Once committed, the answer is saved with a version number

### 2.6 Answer Management & Version History

- Every committed answer creates a new version (v1, v2, v3…)
- All versions are stored and accessible via a Version History drawer
- Each version shows: version number, source (AI / Manual / AI+Edited), timestamp, change summary, content preview
- Users can revert to any previous version (creates a new version cloned from the selected one)
- Question status is automatically updated to "answered" on first commit

### 2.7 Progress Tracker (Right Panel)

- Circular SVG progress ring showing % of questions answered
- Answered count vs total approved questions
- Deadline display with days-remaining countdown (red if < 3 days, "Overdue" if past)
- Status breakdown: Answered / In Progress / Pending / Skipped
- Download Answers button (disabled until at least 1 answer is committed)

### 2.8 Export

- Users can download all committed answers as a **Word (.docx)** document at any time
- Export format: question + answer pairs, grouped by section
- Document includes project title, deadline, section headings
- Unanswered questions shown as italic placeholder text (optional)

### 2.9 LLM Configuration

- Users configure the LLM from a modal in the sidebar (🤖 icon)
- Configurable fields:
  - Provider: **Anthropic** or **OpenAI-Compatible** (Azure, Ollama, etc.)
  - Base URL (required for OpenAI-compatible providers)
  - API Key (stored server-side, never exposed to browser; only last 4 chars shown as hint)
  - Model name
  - Max tokens
  - Temperature
- "Test Connection" button verifies the config and shows latency

---

## 3. Non-Functional Requirements

### 3.1 Performance
- File upload supports PDF/DOCX/XLSX/TXT up to reasonable sizes (tested up to ~50MB)
- Background parsing and indexing does not block the UI
- SSE streaming renders answer tokens in real time with no perceptible lag on local
- ChromaDB query latency < 500ms for top-K retrieval

### 3.2 Data Persistence
- All data stored locally (SQLite database + ChromaDB vector store + uploaded files)
- Data survives application restarts
- No external database dependency

### 3.3 Security
- API keys never stored in the frontend or browser
- API keys stored server-side (in DB or env var)
- Only last 4 characters of API key shown in UI as confirmation hint
- `.env` file excluded from git via `.gitignore`

### 3.4 Single User
- No authentication or multi-user support required
- Designed for a single local user

### 3.5 Deployability
- Runs fully with `docker compose up --build` (one command)
- No external services required beyond an LLM API key
- Can also run without Docker (Python venv + npm)

---

## 4. Technical Architecture

### 4.1 Frontend
| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Component Library | shadcn/ui (Radix UI primitives) |
| State Management | Zustand |
| Real-time streaming | Native `fetch` with SSE (ReadableStream) |
| File upload | react-dropzone |
| Date utilities | date-fns |

### 4.2 Backend
| Concern | Choice |
|---|---|
| Framework | FastAPI (Python) |
| Language | Python 3.11+ |
| ORM | SQLAlchemy 2.x |
| Database | SQLite (file-based) |
| Migrations | Alembic |
| Config | pydantic-settings |
| Async server | Uvicorn |
| Background tasks | FastAPI BackgroundTasks |

### 4.3 AI / RAG
| Concern | Choice |
|---|---|
| LLM Provider | Anthropic Claude (default) / OpenAI-compatible |
| Embeddings | SentenceTransformer (all-MiniLM-L6-v2, local) |
| Vector Store | ChromaDB (persistent, local) |
| Chunking | Sliding window, 512 words, 64 word overlap |
| Retrieval | Top-K cosine similarity (K=8 by default) |

### 4.4 Document Parsing
| Format | Library |
|---|---|
| PDF | PyMuPDF (fitz) |
| DOCX | python-docx |
| XLSX | openpyxl |
| TXT / MD | Built-in Python |

### 4.5 Export
| Format | Library |
|---|---|
| Word (.docx) | python-docx |

### 4.6 Infrastructure
| Concern | Choice |
|---|---|
| Containerisation | Docker + Docker Compose |
| Data volumes | Named Docker volume for SQLite + ChromaDB + artefacts |

---

## 5. Data Model

### Tables
| Table | Purpose |
|---|---|
| `projects` | Project name, description, deadline |
| `artefacts` | Uploaded files, parse status, role, ChromaDB collection name |
| `questions` | Extracted/manual questions, status, section, source page |
| `chat_sessions` | One session per question, tracks clarify/answer/review phase |
| `chat_messages` | Full message history per session, includes citations (JSON) |
| `answers` | Versioned committed answers per question |
| `project_metrics` | Cached counts (answered, in-progress, etc.) per project |
| `llm_configs` | Singleton row storing LLM provider config and API key |

---

## 6. Key API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/v1/projects` | List / create projects |
| GET/PATCH/DELETE | `/api/v1/projects/{id}` | Get / update / delete project |
| POST | `/api/v1/projects/{id}/artefacts` | Upload artefact (multipart) |
| GET | `/api/v1/projects/{id}/artefacts/{aid}/status` | Poll parse status |
| POST | `/api/v1/projects/{id}/extract-questions` | Trigger AI question extraction |
| GET | `/api/v1/projects/{id}/extracted-questions` | Get pending (unreviewed) questions |
| POST | `/api/v1/projects/{id}/questions/review` | Approve/reject extracted questions |
| GET/POST | `/api/v1/projects/{id}/questions` | List / create questions |
| POST | `/api/v1/projects/{id}/questions/{qid}/sessions` | Create/get chat session |
| POST | `.../sessions/{sid}/messages` | Send message (SSE stream) |
| POST | `.../sessions/{sid}/generate-answer` | Generate answer (SSE stream) |
| GET/POST | `/api/v1/projects/{id}/questions/{qid}/answers` | List / commit answers |
| POST | `.../answers/{aid}/revert` | Revert to a previous version |
| POST | `/api/v1/projects/{id}/export` | Download answers as .docx |
| GET/PUT | `/api/v1/llm-config` | Get / update LLM config |
| POST | `/api/v1/llm-config/test` | Test LLM connection |

---

## 7. Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | — | Yes (for Anthropic) | Anthropic API key |
| `DATABASE_URL` | `sqlite:///./data/questionnaire.db` | No | SQLite DB path |
| `CHROMA_PERSIST_DIR` | `./data/chroma` | No | ChromaDB storage directory |
| `ARTEFACT_STORAGE_DIR` | `./data/artefacts` | No | Uploaded files directory |
| `DEFAULT_LLM_MODEL` | `claude-opus-4-5` | No | Default model name |
| `MAX_CHUNK_SIZE` | `512` | No | RAG chunk size in words |
| `CHUNK_OVERLAP` | `64` | No | Overlap between chunks in words |
| `RAG_TOP_K` | `8` | No | Number of chunks retrieved per query |
| `CORS_ORIGINS` | `http://localhost:3000` | No | Comma-separated allowed origins |

---

## 8. Project Structure

```
questionnaire-assistant/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── REQUIREMENTS.md
│
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── .env.example
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py              # FastAPI app, CORS, router registration
│       ├── config.py            # pydantic-settings env config
│       ├── database.py          # SQLAlchemy engine, session, create_tables
│       ├── models/              # SQLAlchemy ORM models
│       ├── schemas/             # Pydantic request/response schemas
│       ├── routers/             # FastAPI route handlers
│       ├── services/            # Business logic (RAG, LLM, parsing, export)
│       ├── parsers/             # PDF / DOCX / XLSX / TXT parsers
│       └── utils/               # Chunker, deadline extractor
│
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.ts
    ├── Dockerfile
    └── src/
        ├── app/                 # Next.js App Router pages
        ├── components/          # React components
        ├── hooks/               # Custom React hooks
        ├── lib/                 # API client, types, utilities
        └── store/               # Zustand state stores
```

---

## 9. UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar (icons: Projects, LLM Config, Settings)                │
├───────────────┬──────────────────────────┬──────────────────────┤
│  LEFT PANEL   │    CENTER PANEL          │   RIGHT PANEL        │
│               │                          │                      │
│  Question     │  Chat messages           │  Progress ring       │
│  todo list    │  (clarify phase)         │  Deadline countdown  │
│               │                          │  Status breakdown    │
│  Filter tabs  │  Answer draft editor     │  Download button     │
│               │  (review phase)          │                      │
│  ~280px       │  flex-1                  │  ~280px              │
└───────────────┴──────────────────────────┴──────────────────────┘
```

---

## 10. User Flow

```
Create Project
     │
     ▼
Upload Artefacts (Questionnaire + Supporting docs)
     │  (background: parse → chunk → embed → ChromaDB)
     ▼
Extract Questions from Questionnaire
     │  (background LLM call → pending questions)
     ▼
Review & Approve Questions → Todo List
     │
     ▼
Select Question
     │
     ▼
Clarifying Chat (RAG-grounded, up to 3 AI questions)
     │
     ▼
Generate Answer (SSE streamed)
     │
     ▼
Review Draft → Commit / Request Changes / Manual Edit
     │
     ▼
Answer Committed (versioned) → Question marked Done
     │
     ▼
Repeat for all questions
     │
     ▼
Download Answers as .docx
```
