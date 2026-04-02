import fitz  # PyMuPDF
from typing import List, Dict, Any


def parse_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Returns list of {page, text, metadata} dicts, one per page.
    """
    doc = fitz.open(file_path)
    pages = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text").strip()
        if text:
            pages.append({
                "page": page_num + 1,
                "section": None,
                "text": text,
            })
    doc.close()
    return pages
