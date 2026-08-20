import json
from pathlib import Path

MODULE_DATA_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = MODULE_DATA_DIR.parent.parent
SOURCE_ARCHETYPES_DIR = WORKSPACE_ROOT / "archtypes"
TARGET_DIR = MODULE_DATA_DIR / "archetypes"
TARGET_FILE = TARGET_DIR / "index.json"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main() -> None:
    if not SOURCE_ARCHETYPES_DIR.exists():
        raise SystemExit(f"Source archetypes folder not found: {SOURCE_ARCHETYPES_DIR}")

    docs = []
    skipped = 0

    for path in sorted(SOURCE_ARCHETYPES_DIR.rglob("*.json")):
        try:
            doc = load_json(path)
        except Exception:
            skipped += 1
            continue

        doc_type = str(doc.get("type") or "")
        if doc_type not in {"subclass", "feat"}:
            continue

        docs.append(doc)

    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "items": docs,
        "meta": {
            "source": str(SOURCE_ARCHETYPES_DIR),
            "count": len(docs),
            "skipped": skipped
        }
    }
    TARGET_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"source={SOURCE_ARCHETYPES_DIR}")
    print(f"target={TARGET_FILE}")
    print(f"items={len(docs)}")
    print(f"skipped={skipped}")


if __name__ == "__main__":
    main()
