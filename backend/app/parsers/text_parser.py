from typing import List, Dict, Any


def parse_text(file_path: str) -> List[Dict[str, Any]]:
    """
    Reads a plain text file. Splits into ~3000 char pages.
    """
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    if not content.strip():
        return []

    page_size = 3000
    pages = []
    for i, start in enumerate(range(0, len(content), page_size)):
        chunk = content[start : start + page_size].strip()
        if chunk:
            pages.append({
                "page": i + 1,
                "section": None,
                "text": chunk,
            })

    return pages
