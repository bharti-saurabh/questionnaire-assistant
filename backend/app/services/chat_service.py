import json
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Generator

from sqlalchemy.orm import Session

from app.models.answer import ChatSession, ChatMessage, Answer
from app.models.question import Question
from app.models.artefact import Artefact
from app.services.rag_service import query_project
from app.services.llm_client import stream_llm

logger = logging.getLogger(__name__)

CLARIFY_SYSTEM = """You are an expert questionnaire assistant helping someone prepare a high-quality response to a questionnaire, RFP, or survey.

Your job in this CLARIFYING phase is to ask the user up to 3 focused questions to gather the context you need to write an excellent answer.

Guidelines:
- Ask targeted questions that will genuinely improve the answer quality
- Use the provided context from the project documents to ask informed questions
- Do NOT draft the answer yet
- When you have enough context (after at least 1 user response), emit the exact token <READY_TO_ANSWER/> on its own line to signal readiness
- Keep your messages concise and professional

Relevant context from project documents:
{context}
"""

ANSWER_SYSTEM = """You are an expert questionnaire assistant writing a professional, polished response.

Write a complete, well-structured answer to the question below.

Guidelines:
- Use information from the project documents and the conversation above
- Be specific and factual — cite sources inline as [Source: filename, p.N]
- Professional tone, clear structure (use bullet points or paragraphs as appropriate)
- Do NOT include preamble like "Here is the answer:" — start the answer directly
- Length should match the question's scope

Project context:
{context}
"""


def get_or_create_session(db: Session, question_id: str) -> ChatSession:
    """Gets existing active session or creates a new one."""
    session = (
        db.query(ChatSession)
        .filter(ChatSession.question_id == question_id)
        .order_by(ChatSession.created_at.desc())
        .first()
    )
    if not session:
        session = ChatSession(
            id=str(uuid.uuid4()),
            question_id=question_id,
            phase="clarifying",
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


def get_session_messages(db: Session, session_id: str) -> List[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )


def build_rag_context(project_id: str, query: str, role_preference: str = "supporting") -> tuple[str, list]:
    """Queries ChromaDB and formats context string + citation list."""
    chunks = query_project(project_id, query, n_results=5)
    if not chunks:
        return "", []

    context_parts = []
    citations = []
    seen = set()

    for chunk in chunks:
        meta = chunk.get("metadata", {})
        artefact_id = meta.get("artefact_id", "")
        page = meta.get("page", 1)
        text = chunk.get("text", "")
        section = meta.get("section", "")

        key = f"{artefact_id}_{page}"
        if key in seen:
            continue
        seen.add(key)

        context_parts.append(f"[Source: artefact {artefact_id[:8]}..., p.{page}]\n{text}")
        citations.append({
            "artefact_id": artefact_id,
            "artefact_name": f"Document (p.{page})",
            "page": page,
            "snippet": text[:200],
        })

    return "\n\n---\n\n".join(context_parts), citations


def build_message_history(messages: List[ChatMessage]) -> List[Dict[str, str]]:
    """Converts DB messages to Anthropic message format."""
    history = []
    for msg in messages:
        if msg.role in ("user", "assistant"):
            history.append({"role": msg.role, "content": msg.content})
    return history


def stream_clarify_response(
    db: Session,
    session: ChatSession,
    question: Question,
    user_message: str,
) -> Generator[str, None, None]:
    """
    Handles clarifying phase: saves user message, queries RAG, streams AI response.
    Yields SSE-formatted strings.
    """
    # Save user message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session.id,
        role="user",
        content=user_message,
        phase="clarifying",
    )
    db.add(user_msg)
    db.commit()

    # Build RAG context
    rag_query = f"{question.text} {user_message}"
    context, citations = build_rag_context(question.project_id, rag_query)

    # Build conversation history
    messages = get_session_messages(db, session.id)
    history = build_message_history(messages)

    system_prompt = CLARIFY_SYSTEM.format(context=context or "No project documents available.")

    # Emit citations
    for citation in citations:
        yield f"data: {json.dumps({'type': 'citation', **citation})}\n\n"

    # Stream LLM response
    full_response = ""
    ready_to_answer = False

    try:
        with stream_llm(history, system=system_prompt, db=db) as stream:
            for text in stream.text_stream:
                if "<READY_TO_ANSWER/>" in text:
                    ready_to_answer = True
                    text = text.replace("<READY_TO_ANSWER/>", "")
                if text:
                    full_response += text
                    yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"
    except Exception as e:
        logger.error(f"LLM streaming error: {e}", exc_info=True)
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        return

    # Save assistant message
    ai_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session.id,
        role="assistant",
        content=full_response,
        phase="clarifying",
        citations=json.dumps(citations),
    )
    db.add(ai_msg)

    if ready_to_answer:
        session.phase = "answering"
        yield f"data: {json.dumps({'type': 'phase_change', 'phase': 'answering'})}\n\n"

    db.commit()

    msg_id = ai_msg.id
    yield f"data: {json.dumps({'type': 'done', 'message_id': msg_id, 'ready_to_answer': ready_to_answer})}\n\n"


def stream_generate_answer(
    db: Session,
    session: ChatSession,
    question: Question,
) -> Generator[str, None, None]:
    """
    Handles answer generation phase. Streams the full answer draft.
    """
    session.phase = "answering"
    db.commit()

    yield f"data: {json.dumps({'type': 'phase_change', 'phase': 'answering'})}\n\n"

    # Build rich RAG context for answer (prefer supporting + pitch docs)
    context, citations = build_rag_context(question.project_id, question.text)

    # Build full conversation history
    messages = get_session_messages(db, session.id)
    history = build_message_history(messages)

    # Add the answer generation instruction
    history.append({
        "role": "user",
        "content": f"Now please write a complete, polished answer to the question: {question.text}"
    })

    system_prompt = ANSWER_SYSTEM.format(context=context or "No project documents available.")

    for citation in citations:
        yield f"data: {json.dumps({'type': 'citation', **citation})}\n\n"

    full_answer = ""
    try:
        with stream_llm(history, system=system_prompt, db=db) as stream:
            for text in stream.text_stream:
                full_answer += text
                yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"
    except Exception as e:
        logger.error(f"Answer generation error: {e}", exc_info=True)
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        return

    # Save assistant answer message
    ai_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session.id,
        role="assistant",
        content=full_answer,
        phase="answering",
        citations=json.dumps(citations),
    )
    db.add(ai_msg)
    session.phase = "review"
    db.commit()

    yield f"data: {json.dumps({'type': 'answer_draft', 'content': full_answer})}\n\n"
    yield f"data: {json.dumps({'type': 'phase_change', 'phase': 'review'})}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'message_id': ai_msg.id})}\n\n"
