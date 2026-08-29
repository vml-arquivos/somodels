from __future__ import annotations

import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: extract_coolify_logs.py HTML_FILE")
    path = Path(sys.argv[1])
    soup = BeautifulSoup(path.read_text(errors="replace"), "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    text = soup.get_text("\n")
    patterns = re.compile(
        r"(pre-deployment|post-deployment|drizzle|migration|migrate|health|container|started|created|failed|error|success|pnpm|database|mysql|new container|old container)",
        re.IGNORECASE,
    )
    seen: set[str] = set()
    for raw in text.splitlines():
        line = " ".join(raw.split())
        if not line or not patterns.search(line):
            continue
        # Never print URL query strings or environment assignments.
        line = re.sub(r"(DATABASE_URL|JWT_SECRET|PASSWORD|TOKEN|KEY)\s*=\s*[^\s]+", r"\1=<redacted>", line, flags=re.IGNORECASE)
        if line not in seen:
            seen.add(line)
            print(line)


if __name__ == "__main__":
    main()
