"""
Daily alert: Sent invoices past their Due Date.
Sends via Telegram (primary) + SendGrid email (backup).

    python3 invoice_overdue_alert.py
    python3 invoice_overdue_alert.py --dry-run
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import date

import requests
from dotenv import load_dotenv
from notion_client import Client

from config import DATA_SOURCES

log = logging.getLogger("overdue_invoices")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def fetch_overdue(notion: Client, today: date) -> list[dict]:
    out: list[dict] = []
    cursor = None
    while True:
        resp = notion.databases.query(
            database_id=DATA_SOURCES["invoices"],
            filter={"and": [
                {"property": "Status", "select": {"equals": "Sent"}},
                {"property": "Due Date", "date": {"before": today.isoformat()}},
            ]},
            start_cursor=cursor,
            page_size=100,
        )
        for page in resp.get("results", []):
            p = page["properties"]
            name = "".join(t["plain_text"] for t in p["Name"]["title"]) or "(unnamed)"
            amount = (p.get("Amount") or {}).get("number") or 0
            due = ((p.get("Due Date") or {}).get("date") or {}).get("start")
            days_outstanding = ((p.get("Days Outstanding") or {}).get("formula") or {}).get("number") or 0
            out.append({
                "name": name,
                "amount": amount,
                "total": amount * 1.1,
                "due": due,
                "days": int(days_outstanding),
                "url": page["url"],
            })
        if not resp.get("has_more"):
            break
        cursor = resp.get("next_cursor")
    out.sort(key=lambda i: i["days"], reverse=True)
    return out


def format_telegram(overdue: list[dict]) -> str:
    if not overdue:
        return "✅ No overdue invoices today."
    total = sum(i["total"] for i in overdue)
    lines = [
        f"💸 *{len(overdue)} overdue invoice(s)* — ${total:,.2f} total",
        "",
    ]
    for i in overdue[:15]:
        lines.append(f"• *{i['name']}* — ${i['total']:,.2f} ({i['days']}d) [open]({i['url']})")
    if len(overdue) > 15:
        lines.append(f"_…and {len(overdue) - 15} more_")
    return "\n".join(lines)


def format_email_html(overdue: list[dict]) -> str:
    if not overdue:
        return "<p>No overdue invoices today.</p>"
    rows = "".join(
        f"<tr><td>{i['name']}</td><td>${i['total']:,.2f}</td><td>{i['days']}d</td>"
        f"<td><a href='{i['url']}'>open</a></td></tr>"
        for i in overdue
    )
    return f"""
    <p><strong>{len(overdue)} overdue invoice(s).</strong></p>
    <table cellpadding='6' style='border-collapse:collapse'>
      <thead><tr><th>Client</th><th>Total (incl GST)</th><th>Days</th><th></th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
    """


def send_telegram(token: str, chat_id: str, text: str) -> None:
    requests.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown",
              "disable_web_page_preview": True},
        timeout=10,
    ).raise_for_status()


def send_email(api_key: str, sender: str, to: str, subject: str, html: str) -> None:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail

    sg = SendGridAPIClient(api_key)
    mail = Mail(from_email=sender, to_emails=to, subject=subject, html_content=html)
    sg.send(mail)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_dotenv()
    token = os.environ.get("NOTION_TOKEN")
    if not token:
        log.error("NOTION_TOKEN missing.")
        sys.exit(1)

    notion = Client(auth=token)
    overdue = fetch_overdue(notion, date.today())
    tg_text = format_telegram(overdue)
    html = format_email_html(overdue)

    if args.dry_run:
        print(tg_text)
        print()
        print(html)
        return

    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    tg_chat = os.environ.get("TELEGRAM_CHAT_ID")
    if tg_token and tg_chat:
        send_telegram(tg_token, tg_chat, tg_text)
        log.info("Telegram sent.")

    sg_key = os.environ.get("SENDGRID_API_KEY")
    sg_from = os.environ.get("SENDGRID_FROM_EMAIL")
    sg_to = os.environ.get("SENDGRID_TO_EMAIL")
    if sg_key and sg_from and sg_to and overdue:
        send_email(sg_key, sg_from, sg_to,
                   f"Wise AI — {len(overdue)} overdue invoice(s)", html)
        log.info("Email sent.")


if __name__ == "__main__":
    main()
