import glob
import json
import os

CLASSES_SRC = r"c:\Users\thugg\Downloads\New folder\classes"
ITEMS_SRC = r"c:\Users\thugg\Downloads\New folder\class armor and weapons"
OUT_CLASSES = r"c:\Users\thugg\Downloads\New folder\crimson scaler\data\classes\classes.json"
OUT_ITEMS = r"c:\Users\thugg\Downloads\New folder\crimson scaler\data\class-armor-weapons\items.json"


def load_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def main():
    classes = []
    for path in sorted(glob.glob(os.path.join(CLASSES_SRC, "*.json"))):
        data = load_json(path)
        if data.get("type") != "class":
            continue

        stats = data.get("_stats") or {}
        export_source = stats.get("exportSource") or {}

        classes.append({
            "id": data.get("_id") or export_source.get("uuid"),
            "name": data.get("name"),
            "type": data.get("type"),
            "system": {
                "identifier": data.get("system", {}).get("identifier"),
                "description": data.get("system", {}).get("description", {}),
                "advancement": data.get("system", {}).get("advancement", [])
            },
            "flags": data.get("flags", {}),
            "_stats": stats
        })

    items = []
    for path in sorted(glob.glob(os.path.join(ITEMS_SRC, "*.json"))):
        data = load_json(path)
        t = data.get("type")
        is_weapon = t == "weapon"
        is_armor = t == "equipment" and isinstance(data.get("system", {}).get("armor"), dict)
        if not (is_weapon or is_armor):
            continue

        stats = data.get("_stats") or {}
        export_source = stats.get("exportSource") or {}

        items.append({
            "id": data.get("_id") or export_source.get("uuid"),
            "name": data.get("name"),
            "type": data.get("type"),
            "system": {
                "armor": data.get("system", {}).get("armor"),
                "damage": data.get("system", {}).get("damage")
            },
            "flags": data.get("flags", {}),
            "_stats": stats
        })

    with open(OUT_CLASSES, "w", encoding="utf-8") as f:
        json.dump({"classes": classes}, f, indent=2, ensure_ascii=False)
        f.write("\n")

    with open(OUT_ITEMS, "w", encoding="utf-8") as f:
        json.dump({"items": items}, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print("classes", len(classes))
    print("items", len(items))


if __name__ == "__main__":
    main()
