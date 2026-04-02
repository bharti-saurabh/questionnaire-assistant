import json
import logging
import re
from typing import List, Dict, Any

from app.services.llm_client import call_llm
from app.services.artefact_parser import parse_artefact

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM = """You are a document analyzer specializing in extracting questions from questionnaires, RFPs, and surveys.
Your task is to extract all questions from the provided document text.
Return ONLY a valid JSON array — no explanation, no markdown, no code fences."""

EXTRACTION_PROMPT_TEMPLATE = """Extract all questions from the following document. Return a JSON array where each item has:
- "number": sequential integer starting from 1
- "section": the heading or section name under which this question appears (null if none)
- "text": the full verbatim question text, cleaned of numbering artifacts
- "source_page": page number where the question appears (integer, use 1 if unknown)
- "is_required": true unless the document explicitly marks it as optional

Document text:
{document_text}

Return only the JSON array, nothing else."""


def extract_questions_from_text(full_text: str, db=None) -> List[Dict[str, Any]]:
    """Calls LLM to extract structured questions from document text."""
    # Truncate to ~60k chars to stay within token limits
    truncated = full_text[:60000]

    prompt = EXTRACTION_PROMPT_TEMPLATE.format(document_text=truncated)

    try:
        raw = call_llm(prompt, system=EXTRACTION_SYSTEM, max_tokens=8192, db=db)
    except Exception as e:
        logger.error(f"LLM call failed during question extraction: {e}")
        raise

    # Strip markdown fences if LLM added them despite instructions
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    raw = raw.strip()

    try:
        questions = json.loads(raw)
        if not isinstance(questions, list):
            raise ValueError("Response is not a JSON array")
        return questions
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Failed to parse LLM extraction response: {e}\nRaw: {raw[:500]}")
        raise ValueError(f"LLM returned invalid JSON: {e}")


def extract_questions_from_artefact(artefact_path: str, file_type: str, db=None) -> List[Dict[str, Any]]:
    """Parses artefact file then calls LLM to extract questions."""
    pages = parse_artefact(artefact_path, file_type)
    full_text = "\n\n".join(
        f"[Page {p['page']}]\n{p['text']}" for p in pages
    )
    return extract_questions_from_text(full_text, db=db)
