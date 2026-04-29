"""
Excel → Notion idempotent sync.

Phase 3 of the Wise AI build. Drop an .xlsx file in wise-os/data/ and run:

    python3 excel_to_notion.py --inspect-only              # report shape + sample rows, write nothing
    python3 excel_to_notion.py --dry-run                   # show planned upserts, write nothing
    python3 excel_to_notion.py                             # actually sync

Idempotency: every row is keyed by a stable column declared in MAPPINGS. Re-running
never creates duplicates — it updates the existing page if found, otherwise creates one.

Until the .xlsx file is reviewed and MAPPINGS is filled in, the script runs in
inspection mode only and refuses to write.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import openpyxl  # noqa: F401 (engine for pandas read_excel)
import pandas as pd
from dotenv import load_dotenv
from notion_client import Client

from config import DATA_SOURCES

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
LOG_PATH = ROOT / "sync.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG_PATH), logging.StreamHandler()],
)
log = logging.getLogger("excel_to_notion")


@dataclass
class Mapping:
    """How one Excel sheet maps to one Notion data source."""

    sheet_name: str
    target_data_source: str          # key in DATA_SOURCES
    key_column: str                  # the Excel column whose value uniquely identifies a row
    notion_title_property: str       # the Notion title property name
    column_to_property: dict[str, str]  # {excel_col: notion_property_name}


# Filled in once the .xlsx file is reviewed. Until then, leave empty —
# the script will refuse to write.
MAPPINGS: list[Mapping] = []


def find_workbook() -> Path:
    candidates = sorted(DATA_DIR.glob("*.xlsx"))
    if not candidates:
        log.error("No .xlsx found in %s. Drop wise-ai.xlsx there.", DATA_DIR)
        sys.exit(1)
    if len(candidates) > 1:
        log.warning("Multiple .xlsx files found — using %s", candidates[0].name)
    return candidates[0]


def inspect(path: Path) -> None:
    """Print every tab, columns, row counts, and sample rows."""
    log.info("Inspecting %s", path)
    xl = pd.ExcelFile(path)
    print(f"\n=== Workbook: {path.name} ===")
    print(f"Tabs ({len(xl.sheet_names)}): {xl.sheet_names}\n")
    for sheet in xl.sheet_names:
        df = pd.read_excel(path, sheet_name=sheet)
        print(f"--- Tab: {sheet}")
        print(f"  Rows: {len(df)}")
        print(f"  Columns: {list(df.columns)}")
        if not df.empty:
            print(f"  Sample rows (up to 3):")
            print(df.head(3).to_string(index=False))
        print()


def existing_pages_by_key(notion: Client, data_source: str, key_property: str) -> dict[str, str]:
    """Return {key_value: page_id} for every existing row in the target data source."""
    out: dict[str, str] = {}
    cursor = None
    while True:
        resp = notion.databases.query(
            database_id=data_source,
            start_cursor=cursor,
            page_size=100,
        )
        for page in resp.get("results", []):
            prop = page["properties"].get(key_property)
            value = _read_property_text(prop)
            if value:
                out[value] = page["id"]
        if not resp.get("has_more"):
            break
        cursor = resp.get("next_cursor")
    return out


def _read_property_text(prop: dict | None) -> str | None:
    if not prop:
        return None
    t = prop.get("type")
    if t == "title":
        return "".join(part["plain_text"] for part in prop["title"])
    if t == "rich_text":
        return "".join(part["plain_text"] for part in prop["rich_text"])
    if t == "number":
        return str(prop["number"]) if prop["number"] is not None else None
    return None


def build_properties(row: pd.Series, mapping: Mapping) -> dict[str, Any]:
    """Convert one Excel row into a Notion properties dict."""
    props: dict[str, Any] = {}
    for excel_col, notion_prop in mapping.column_to_property.items():
        value = row.get(excel_col)
        if pd.isna(value):
            continue
        if notion_prop == mapping.notion_title_property:
            props[notion_prop] = {"title": [{"text": {"content": str(value)}}]}
        elif isinstance(value, (int, float)):
            props[notion_prop] = {"number": float(value)}
        elif isinstance(value, pd.Timestamp):
            props[notion_prop] = {"date": {"start": value.date().isoformat()}}
        else:
            props[notion_prop] = {"rich_text": [{"text": {"content": str(value)}}]}
    return props


def sync_sheet(notion: Client, path: Path, mapping: Mapping, dry_run: bool) -> None:
    df = pd.read_excel(path, sheet_name=mapping.sheet_name)
    log.info("Sheet %s: %d rows", mapping.sheet_name, len(df))

    target_id = DATA_SOURCES[mapping.target_data_source]
    existing = existing_pages_by_key(notion, target_id, mapping.notion_title_property)

    created = updated = skipped = 0
    for _, row in df.iterrows():
        key = row.get(mapping.key_column)
        if pd.isna(key):
            skipped += 1
            continue
        key = str(key)

        properties = build_properties(row, mapping)
        page_id = existing.get(key)

        if dry_run:
            log.info("[DRY] %s '%s'", "UPDATE" if page_id else "CREATE", key)
            continue

        if page_id:
            notion.pages.update(page_id=page_id, properties=properties)
            updated += 1
        else:
            notion.pages.create(
                parent={"database_id": target_id},
                properties=properties,
            )
            created += 1

    log.info("Sheet %s: created=%d updated=%d skipped=%d", mapping.sheet_name, created, updated, skipped)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync Excel → Notion")
    parser.add_argument("--inspect-only", action="store_true",
                        help="Print workbook shape and exit. Writes nothing.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Plan upserts but don't write.")
    args = parser.parse_args()

    load_dotenv()
    DATA_DIR.mkdir(exist_ok=True)
    path = find_workbook()

    if args.inspect_only:
        inspect(path)
        return

    if not MAPPINGS:
        log.error("MAPPINGS is empty. Run with --inspect-only first, then fill in MAPPINGS.")
        sys.exit(2)

    token = os.environ.get("NOTION_TOKEN")
    if not token:
        log.error("NOTION_TOKEN not set. Copy .env.example to .env and fill it in.")
        sys.exit(3)

    notion = Client(auth=token)
    for mapping in MAPPINGS:
        sync_sheet(notion, path, mapping, dry_run=args.dry_run)
    log.info("Done.")


if __name__ == "__main__":
    main()
