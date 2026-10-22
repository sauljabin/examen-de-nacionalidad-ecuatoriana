#!/usr/bin/env python3
"""Convert a RemNote JSON export (.rem) into the static exam data used by docs/.

The .rem file is a zip archive with, among others:
  - rem.json:   every note ("rem") with its text, children and images.
  - cards.json: every flashcard RemNote generated, as "<remId>.<suffix>",
                where suffix is "f" (forward), "b" (backward) or a cloze id.

Only cards that exist in cards.json are exported, so the exam has exactly the
cards the original RemNote deck had.

Cards are grouped as in the RemNote document: category (first level below
the root) and subcategory (second level).

Usage:
  python3 scripts/convert_remnote.py backup/export.rem
  python3 scripts/convert_remnote.py backup/export.rem --category "Símbolos Patrios"
"""

import argparse
import collections
import hashlib
import json
import pathlib
import re
import sys
import unicodedata
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
DATA_FILE = DOCS / "data" / "cards.json"
IMAGES_DIR = DOCS / "images"

IGNORED_CATEGORIES = {"Archivados"}

# RemNote numeric text colors.
COLORS = {
    1: "red", 2: "orange", 3: "yellow", 4: "green", 5: "purple",
    6: "blue", 7: "gray", 8: "brown", 9: "pink",
}


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


class Export:
    def __init__(self, path):
        with zipfile.ZipFile(path) as archive:
            self.rems = json.loads(archive.read("rem.json"))["docs"]
            self.cards = json.loads(archive.read("cards.json"))["docs"]
        self.by_id = {rem["_id"]: rem for rem in self.rems}
        self.children = collections.defaultdict(list)
        for rem in self.rems:
            self.children[rem.get("parent")].append(rem)
        for siblings in self.children.values():
            siblings.sort(key=lambda rem: rem.get("f", ""))
        self.cards_by_rem = collections.defaultdict(list)
        for card in self.cards:
            rem_id, _, suffix = card["k"].partition(".")
            self.cards_by_rem[rem_id].append(suffix)

    def root(self):
        return next(rem for rem in self.rems if not rem.get("parent"))

    def plain_text(self, rich):
        return "".join(segment["text"] for segment in self.segments(rich, None))

    def segments(self, rich, hidden_cloze_id):
        """Turn RemNote rich text into a flat list of display segments.

        Each segment is {"text", "bold"?, "color"?, "cloze"?}; "cloze" marks
        text that is hidden until the answer is shown.
        """
        result = []
        for element in rich or []:
            if isinstance(element, str):
                result.append({"text": element})
                continue
            kind = element.get("i")
            if kind == "m":
                segment = {"text": element.get("text", "")}
                if element.get("b"):
                    segment["bold"] = True
                color = element.get("tc")
                if isinstance(color, int) and color in COLORS:
                    segment["color"] = COLORS[color]
                if hidden_cloze_id and element.get("cId") == hidden_cloze_id:
                    segment["cloze"] = True
                result.append(segment)
            elif kind == "q":
                target = self.by_id.get(element.get("_id"))
                if target:
                    result.append({"text": self.plain_text(target.get("key"))})
        return merge_segments(result)

    def image(self, rem):
        return next(
            (element for element in rem.get("key") or []
             if isinstance(element, dict) and element.get("i") == "i"),
            None,
        )


def merge_segments(segments):
    """Join neighbouring segments with the same formatting."""
    merged = []
    for segment in segments:
        if not segment["text"]:
            continue
        if merged and {k: v for k, v in merged[-1].items() if k != "text"} == \
                {k: v for k, v in segment.items() if k != "text"}:
            merged[-1]["text"] += segment["text"]
        else:
            merged.append(dict(segment))
    return merged


def download_image(url):
    """Download an image once into docs/images and return its site path."""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    suffix = pathlib.Path(url.split("?")[0]).suffix or ".png"
    name = hashlib.sha1(url.encode()).hexdigest()[:16] + suffix
    target = IMAGES_DIR / name
    if not target.exists():
        with urllib.request.urlopen(url, timeout=60) as response:
            target.write_bytes(response.read())
    return f"images/{name}"


def image_data(image, active_id):
    return {
        "src": image["url"],
        "width": image.get("width"),
        "height": image.get("height"),
        "blocks": [
            {
                "x": block["x"], "y": block["y"],
                "width": block["width"], "height": block["height"],
                "active": block.get("cId") == active_id,
            }
            for block in image.get("blocks", [])
        ],
    }


def answer_segments(export, rem):
    """Back of a basic card; multi-line cards keep their answer in children."""
    if rem.get("value"):
        return export.segments(rem.get("value"), None)
    lines = []
    for child in export.children[rem["_id"]]:
        line = export.segments(child.get("key"), None)
        if line:
            lines += [{"text": "\n• " if lines else "• "}] + line
    return merge_segments(lines)


def build_card(export, rem, suffix, topic):
    card = {"id": f"{rem['_id']}.{suffix}"}
    if topic:
        card["topic"] = topic
    image = export.image(rem)
    block_ids = {block.get("cId") for block in (image or {}).get("blocks", [])}
    if image and suffix in block_ids:
        card["type"] = "image"
        card["image"] = image_data(image, suffix)
        return card
    if suffix == "f":
        card["type"] = "basic"
        card["front"] = export.segments(rem.get("key"), None)
        card["back"] = answer_segments(export, rem)
    elif suffix == "b":
        card["type"] = "basic"
        card["front"] = answer_segments(export, rem)
        card["back"] = export.segments(rem.get("key"), None)
    else:
        card["type"] = "cloze"
        card["front"] = export.segments(rem.get("key"), suffix)
        if not any(segment.get("cloze") for segment in card["front"]):
            return None
    if image:
        card["image"] = image_data(image, None)
    if not card["front"] and "image" not in card:
        return None
    return card


def is_folder(export, rem):
    """A rem that only groups other rems (it has children but no cards)."""
    return bool(export.children[rem["_id"]]) and not export.cards_by_rem.get(rem["_id"])


def collect_cards(export, rem, path=()):
    """Return the cards below a rem in document order.

    Each card gets a "topic" with the folder path below the subcategory,
    for example "Poder Ejecutivo" inside "Poderes del Estado".
    """
    cards = []
    for suffix in export.cards_by_rem.get(rem["_id"], []):
        card = build_card(export, rem, suffix, " › ".join(path))
        if card:
            cards.append(card)
    for child in export.children[rem["_id"]]:
        child_path = path
        if is_folder(export, child):
            child_path = path + (export.plain_text(child.get("key")).strip(),)
        cards += collect_cards(export, child, child_path)
    return cards


def build_category(export, category_rem):
    title = export.plain_text(category_rem["key"]).strip()
    subcategories = []
    for child in export.children[category_rem["_id"]]:
        cards = collect_cards(export, child)
        if not cards:
            continue
        sub_title = export.plain_text(child.get("key")).strip()
        if sub_title == title:
            sub_title = "General"
        for card in cards:
            if "image" in card:
                card["image"]["src"] = download_image(card["image"]["src"])
        subcategories.append({
            "id": slugify(sub_title),
            "title": sub_title,
            "cards": cards,
        })
    return {"id": slugify(title), "title": title, "subcategories": subcategories}


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("export", type=pathlib.Path, help="RemNote .rem export file")
    parser.add_argument("--category", action="append",
                        help="category to export (repeatable); default: all")
    args = parser.parse_args()

    export = Export(args.export)
    categories = [rem for rem in export.children[export.root()["_id"]]
                  if export.plain_text(rem.get("key")) not in IGNORED_CATEGORIES]
    if args.category:
        categories = [rem for rem in categories
                      if export.plain_text(rem.get("key")) in args.category]
        if not categories:
            sys.exit(f"Category not found: {args.category}")

    data = {"categories": []}
    for category_rem in categories:
        category = build_category(export, category_rem)
        data["categories"].append(category)
        total = sum(len(sub["cards"]) for sub in category["subcategories"])
        print(f"{category['title']}: {total} cards in "
              f"{len(category['subcategories'])} subcategories")

    used = {card["image"]["src"].split("/")[-1]
            for category in data["categories"]
            for sub in category["subcategories"]
            for card in sub["cards"] if "image" in card}
    for stale in IMAGES_DIR.glob("*"):
        if stale.name not in used:
            stale.unlink()

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print(f"Wrote {DATA_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
