from typing import List, Dict, Any
from app.config import settings


def chunk_text(
    text: str,
    metadata: Dict[str, Any],
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> List[Dict[str, Any]]:
    """
    Splits text into overlapping chunks, preserving metadata.
    Returns list of {text, metadata} dicts.
    """
    chunk_size = chunk_size or settings.MAX_CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP

    # Simple character-based chunking with word boundary awareness
    words = text.split()
    if not words:
        return []

    chunks = []
    chunk_index = 0
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_words = words[start:end]
        chunk_text_str = " ".join(chunk_words)

        if chunk_text_str.strip():
            chunks.append({
                "text": chunk_text_str,
                "metadata": {**metadata, "chunk_index": chunk_index},
            })
            chunk_index += 1

        if end >= len(words):
            break
        start = end - chunk_overlap

    return chunks
