import re
from datetime import datetime
from typing import Optional


DATE_PATTERNS = [
    # "by March 31, 2025" or "by 31 March 2025"
    r"(?:by|due|deadline[:\s]+|submit(?:ted)?\s+by)\s+(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})",
    r"(?:by|due|deadline[:\s]+|submit(?:ted)?\s+by)\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})",
    # ISO-ish: 2025-03-31 or 31/03/2025
    r"(?:by|due|deadline[:\s]+)\s+(\d{4}-\d{2}-\d{2})",
    r"(?:by|due|deadline[:\s]+)\s+(\d{1,2}/\d{1,2}/\d{4})",
    # "due date: ..."
    r"due\s+date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})",
    r"due\s+date[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
    r"submission\s+deadline[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})",
]

DATE_FORMATS = [
    "%B %d, %Y", "%B %d %Y", "%d %B %Y", "%d %B, %Y",
    "%b %d, %Y", "%b %d %Y", "%d %b %Y",
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
]


def extract_deadline(text: str) -> Optional[datetime]:
    text_lower = text.lower()
    for pattern in DATE_PATTERNS:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            # Clean ordinal suffixes
            clean = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", match, flags=re.IGNORECASE).strip()
            for fmt in DATE_FORMATS:
                try:
                    return datetime.strptime(clean, fmt)
                except ValueError:
                    continue
    return None
