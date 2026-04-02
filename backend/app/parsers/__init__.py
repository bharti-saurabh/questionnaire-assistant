from app.parsers.pdf_parser import parse_pdf
from app.parsers.docx_parser import parse_docx
from app.parsers.xlsx_parser import parse_xlsx
from app.parsers.text_parser import parse_text

__all__ = ["parse_pdf", "parse_docx", "parse_xlsx", "parse_text"]
