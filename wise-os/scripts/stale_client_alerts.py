"""
Daily Telegram alert: Active clients with Days Since Contact > threshold.

Run via cron / GitHub Actions / launchd. See docs/deployment.md.

    python3 stale_client_alerts.py                  # send alert
    python3 stale_client_alerts.py --dry-run        # print, don't send
"""
from __future__ import annotations

import argparse
import logging
import os
import sys

import requests
from dotenv import load_dotenv
from notion_client import Client

from config import DATA_SOURCES, STALE_CLIENT_THRESHOLD_DAYS

log = logging.getLogger("stale_clients")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def fetch_stale_clients(notion: Client, threshold: int) -> list[dict]:
    """Return Active clients whose Days Since Contact > threshold."""
    out: list[dict] = []
    cursor = None
    while True:
        resp = notion.databases.query(
            database_id=DATA_SOURCES["clients"],
            filter={"property": "Status", "select": {"equals": "Active"}},
            start_cursor=cursor,
            page_size=100,
        )
        for page in resp.get("results", []):
            props = page["properties"]
            days_prop = props.get("Days Since Contact", {})
            formula = days_prop.get("formula", {})
            days = formula.get("number")
            if days is None or days <= threshold:
                continue
            name = "".join(t["plain_text"] for t in props["Name"]["title"]) or "(unnamed)"
            out.append({
                "name": name,
                "days": int(days),
                "url": page["url"],
            })
        if not resp.get("has_more"):
            break
        cursor = resp.get("next_cursor")
    out.sort(key=lambda c: c["days"], reverse=True)
    return out


def send_telegram(token: str, chat_id: str, text: str) -> None:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    resp = requests.post(url, json={
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }, timeout=10)
    resp.raise_for_status()


def format_message(stale: list[dict], threshold: int) -> str:
    if not stale:
        return f"✅ All Active clients contacted within {threshold} days. Nice."
    lines = [f"🔔 *{len(stale)} Active client(s) need a check-in* (>{threshold} days):", ""]
    for c in stale[:15]:
        lines.append(f"• *{c['name']}* — {c['days']} days  [open]({c['url']})")
    if len(stale) > 15:
        lines.append(f"_…and {len(stale) - 15} more_")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_dotenv()
    token = os.environ.get("NOTION_TOKEN")
    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    tg_chat = os.environ.get("TELEGRAM_CHAT_ID")
    threshold = int(os.environ.get("STALE_CLIENT_THRESHOLD_DAYS", STALE_CLIENT_THRESHOLD_DAYS))

    if not token:
        log.error("NOTION_TOKEN missing.")
        sys.exit(1)

    notion = Client(auth=token)
    stale = fetch_stale_clients(notion, threshold)
    msg = format_message(stale, threshold)

    if args.dry_run:
        print(msg)
        return

    if not tg_token or not tg_chat:
        log.error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing.")
        sys.exit(2)
    send_telegram(tg_token, tg_chat, msg)
    log.info("Alert sent: %d stale client(s)", len(stale))


if __name__ == "__main__":
    main()
