# Wise AI — Notion OS

Operational backend for the Wise AI Notion workspace. Lives alongside the WISE-ASSISTANT mobile app but is independent: the mobile app is the field interface, this is the back office.

## What's here

```
wise-os/
├── scripts/
│   ├── config.py / config.js   # Shared Notion IDs (don't hardcode elsewhere)
│   ├── excel_to_notion.py      # Phase 3: Excel → Notion idempotent sync
│   ├── lead_to_pipeline.js     # Webhook: Calendly / Meta lead → Inbox + Pipeline draft
│   ├── stale_client_alerts.py  # Daily: Telegram alert for clients > 14 days no contact
│   ├── won_deal_to_project.js  # Trigger: Won deal → spawn Project + default tasks
│   ├── invoice_overdue_alert.py # Daily: Telegram + email overdue invoices
│   ├── .env.example            # All required env vars
│   ├── requirements.txt        # Python deps
│   └── package.json            # Node deps
└── docs/
    ├── setup.md                # First-run setup
    ├── backup-sop.md           # Weekly export procedure
    └── deployment.md           # GitHub Actions cron + Mac launchd options
```

## Quickstart (when you wake up)

```bash
cd wise-os/scripts
cp .env.example .env
# Fill in NOTION_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SENDGRID_API_KEY

# Python deps
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Node deps
npm install

# Smoke-test the Notion connection
python3 excel_to_notion.py --dry-run --inspect-only
```

See `docs/setup.md` for full setup, `docs/deployment.md` for cron scheduling.

## Phase 3 status

`excel_to_notion.py` is stubbed and inspection-ready. Drop your `wise-ai.xlsx` into `wise-os/data/` and run:

```bash
python3 scripts/excel_to_notion.py --inspect-only
```

It will print every tab, columns, row counts, and sample rows so we can map it to the right databases. No data is written until `--inspect-only` is dropped and column mappings are filled in.

## What's automated

| Script | Trigger | Purpose |
|---|---|---|
| `lead_to_pipeline.js` | HTTP webhook (Calendly, Meta lead form) | Lead → Inbox row + draft Pipeline deal |
| `stale_client_alerts.py` | Daily cron | Telegram digest of Active clients with Days Since Contact > 14 |
| `won_deal_to_project.js` | Polling Pipeline for Stage = Won | Auto-create Project page + 5 default kickoff tasks |
| `invoice_overdue_alert.py` | Daily cron | Telegram + email digest of Sent invoices past Due Date |
