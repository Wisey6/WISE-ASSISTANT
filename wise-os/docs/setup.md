# Setup

First-run guide for the Wise OS scripts. Read top to bottom.

## 1. Notion integration token

1. https://www.notion.so/profile/integrations → **+ New integration**
2. Internal type, associated workspace = `Wise AI`.
3. Copy the **Internal Integration Token** (starts with `secret_` or `ntn_`).
4. Open the `🦉 Wise AI` page in Notion → **…** → Connections → add your integration.
   *(The integration inherits access to every child page automatically.)*

## 2. Local environment

```bash
cd wise-os/scripts
cp .env.example .env
# Edit .env, fill NOTION_TOKEN at minimum
```

Python deps:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Node deps:
```bash
npm install
```

## 3. Smoke test

```bash
# Drop a wise-ai.xlsx into wise-os/data/, then:
python3 excel_to_notion.py --inspect-only

python3 stale_client_alerts.py --dry-run
python3 invoice_overdue_alert.py --dry-run
node won_deal_to_project.js --dry-run
```

Each should print or log without errors. If `NOTION_TOKEN` is wrong you'll see `401 Unauthorized` from the SDK.

## 4. Telegram bot reuse

Tyler already has a Telegram bot from the ASX project. Reuse it:

1. Get the existing bot token from the ASX project's `.env`.
2. Find your Telegram user ID by messaging `@userinfobot` once.
3. Drop both into `wise-os/scripts/.env`:
   ```
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   ```
4. Send `/start` to your bot once so it can DM you.

## 5. Webhooks

`lead_to_pipeline.js` exposes two HTTP endpoints. Run locally:

```bash
node lead_to_pipeline.js
# → listening on :3001
```

Expose to the public internet via [ngrok](https://ngrok.com) or a Render free worker:

```
POST https://<your-public-host>/webhook/calendly
POST https://<your-public-host>/webhook/meta
```

In Calendly / Meta Ads, point the webhook at those URLs.

## 6. Excel sync (Phase 3)

1. Drop your spreadsheet into `wise-os/data/wise-ai.xlsx`.
2. `python3 scripts/excel_to_notion.py --inspect-only` to see every tab + columns.
3. Open `excel_to_notion.py`, fill in the `MAPPINGS` list with one `Mapping(...)` per sheet you want synced.
4. `python3 scripts/excel_to_notion.py --dry-run` to preview.
5. Drop `--dry-run` to actually sync.

The script is idempotent: re-running updates existing rows instead of duplicating.

## 7. Scheduling — see `deployment.md`
