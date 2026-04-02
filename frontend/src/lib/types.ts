export interface ProjectMetrics {
  total_questions: number
  approved_count: number
  answered_count: number
  in_progress_count: number
  skipped_count: number
}

export interface Project {
  id: string
  name: string
  description: string | null
  deadline: string | null
  deadline_source: "extracted" | "manual"
  created_at: string
  updated_at: string
  metrics?: ProjectMetrics
}

export interface Artefact {
  id: string
  project_id: string
  filename: string
  original_name: string
  file_type: "pdf" | "docx" | "xlsx" | "txt"
  file_size_bytes: number
  role: "questionnaire" | "supporting" | "pitch"
  parse_status: "pending" | "parsing" | "indexing" | "ready" | "error"
  parse_error: string | null
  page_count: number | null
  uploaded_at: string
  indexed_at: string | null
}

export interface Citation {
  artefact_id: string
  artefact_name: string
  page: number
  snippet: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: "user" | "assistant" | "system"
  content: string
  phase: "clarifying" | "answering" | "review" | null
  citations: Citation[]
  created_at: string
}

export interface ChatSession {
  id: string
  question_id: string
  phase: "clarifying" | "answering" | "review"
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  project_id: string
  artefact_id: string | null
  number: number
  section: string | null
  text: string
  original_text: string
  status: "pending" | "approved" | "rejected" | "in_progress" | "answered" | "skipped"
  is_required: boolean
  source_page: number | null
  source_context: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Answer {
  id: string
  question_id: string
  session_id: string | null
  version: number
  content: string
  is_current: boolean
  source: "ai" | "manual" | "ai_edited"
  committed_by: string
  change_summary: string | null
  created_at: string
}

export interface LLMConfig {
  provider: "anthropic" | "openai_compat"
  base_url: string | null
  api_key_hint: string | null
  model_name: string
  embedding_model: string
  max_tokens: number
  temperature: number
  updated_at: string
}
