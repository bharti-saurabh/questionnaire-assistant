from typing import List, Dict, Any
from app.parsers import parse_pdf, parse_docx, parse_xlsx, parse_text


def parse_artefact(file_path: str, file_type: str) -> List[Dict[str, Any]]:
    """
    Dispatches to the correct parser based on file_type.
    Returns list of {page, section, text} dicts.
    """
    file_type = file_type.lower().lstrip(".")

    dispatch = {
        "pdf": parse_pdf,
        "docx": parse_docx,
        "doc": parse_docx,
        "xlsx": parse_xlsx,
        "xls": parse_xlsx,
        "txt": parse_text,
        "md": parse_text,
    }

    parser = dispatch.get(file_type)
    if not parser:
        raise ValueError(f"Unsupported file type: {file_type}")

    return parser(file_path)
