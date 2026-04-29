# Overnight build — what was done while you slept

**Branch:** `claude/notion-os-phase-2-TKkKD` (this branch)

You said go automatically — I did. Here's the rundown so you can audit before relying on it.

## What got built

### Phase 3 — Excel ingestion (DONE — via Google Drive MCP)
You sent the workbook as a Google Sheet (`WISE AI - Business`). I read it directly via Google Drive MCP and imported all the live data manually into Notion. The workbook turned out to be a launch playbook, not a CRM dump — six tabs, mostly narrative + targets + a handful of populated rows.

**What was imported:**
| Source tab | Rows | Destination |
|---|---|---|
| Master Checklist | 70 tasks | Tasks DB (with new Phase + Week columns) |
| Path to $10k | 8 monthly targets | NEW: MRR Plan DB (under Operations) |
| Client Pipeline | 1 row (Bundaberg) | Clients + Pipeline DBs |
| Financial Tracker | 3 expense rows | NEW: Transactions DB (under Operations) |
| Daily Log | 1 row (29/04) | NEW: Daily Log DB (under Operations) |
| Pricing & Offers | 4 tiers + rules | Updated 📄 Proposal template + new 🧭 Strategy & Principles page |
| Home (principles, funnel maths, daily protocol) | narrative | 🧭 Strategy & Principles page (under Operations) |

**Schema changes:**
- Tasks DB: added `Phase` (12 options matching workbook phases) + `Week` (rich text)
- 3 new DBs: MRR Plan, Transactions, Daily Log — all under Operations
- Proposal template: rewritten with workbook's actual 4-tier pricing ($1.5k Audit / $4.5–8.5k Build Sprint / $1.25k Standard / $2.5k Plus retainer) — replaces my placeholder pricing

**Bundaberg-specific links wired:**
- Bundaberg client (Clients DB) ↔ Bundaberg Audit deal (Pipeline DB) ↔ all 11 Bundaberg-related Tasks (Prep + Delivery + Post-Delivery phases) — open the Client page and you'll see every related artefact in one place.

**Re-sync caveat:**
The `excel_to_notion.py` script targets local `.xlsx` files. To resync edits you make in the Google Sheet later, you'd need to either (a) export the sheet to .xlsx, drop it in `wise-os/data/`, and run the script after filling in `MAPPINGS` with the priority/date translations the workbook needs (High→P1, DD/MM/YYYY→ISO), or (b) ditch the workbook and work directly in Notion (recommended — it's all there now).

### Phase 4 — Dashboard (Notion: 📊 Dashboard)
- 4 section scaffold (Today / Money / Pipeline / Client Health) with intro callouts.
- 11 linked database views appended:
  - ☀️ Today's Tasks — Status != Done AND Do Date <= today
  - 🚨 Overdue Tasks — Overdue? formula = true
  - 📞 Today's Calls & Meetings — Notes & Calls where Date = today
  - ⏰ Active Clients — Most Neglected First (sort by Last Contact ASC)
  - 💰 Pipeline by Stage — board grouped by Stage
  - 💰 Active MRR — Active clients sorted by MRR
  - 💰 This Month Invoiced — Invoices Issued Date = this_month
  - 💸 Outstanding Invoices — Sent or Overdue, sort by Days Outstanding
  - 🔁 Top Open Deals — sort Weighted Value DESC
  - 🔁 Won Deals — board grouped by Offer
  - ❤️ Active Projects by Health — board grouped by Health
  - 🎯 Project Timeline — timeline view

**Caveat:** I tried to create native Notion chart views via the MCP DSL but the chart syntax wasn't fully exposed and several attempts errored. The board/table views I shipped show the same data; right-click any view tab → *Layout → Chart* to convert in 2 seconds. Documented in *💡 What to build next*.

### Phase 5a — Routines (Notion: ⚙️ Operations)
4 templates created as child pages of Operations:
- 🌅 Morning Standup — 5-section daily ritual (yesterday wins, top 3, pipeline check, one client to call, one big block)
- 📅 Weekly Review — Friday 4pm 30-min review template
- 🗓️ Monthly Review — last-day-of-month 60-min P&L + MRR + double-down/kill format
- 🔁 Recurring Tasks — setup guide for Notion's native recurring template feature

### Phase 5b — Automation scripts (`wise-os/scripts/`)
- `lead_to_pipeline.js` — Express webhook server: `/webhook/calendly` + `/webhook/meta` → Pipeline + Client rows
- `stale_client_alerts.py` — daily Telegram digest of Active clients > 14d no contact
- `won_deal_to_project.js` — polls Pipeline; when Stage = Won, spawns Project + 5 default kickoff tasks (idempotent — only acts on deals without an existing Project)
- `invoice_overdue_alert.py` — daily Telegram + SendGrid email digest of overdue invoices
- `config.py` / `config.js` — single source of truth for all Notion IDs
- `.env.example` — every env var you need to fill
- `requirements.txt` + `package.json` — deps

**You still need to:**
1. `cp .env.example .env` and fill in NOTION_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SENDGRID_API_KEY (reuse Telegram bot from your ASX project).
2. In Notion → 🦉 Wise AI page → ⋯ → Connections → add your integration so the scripts can read/write.
3. `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
4. `npm install`
5. Smoke-test: `python3 stale_client_alerts.py --dry-run` should print without errors.

### Phase 6 — Client-facing templates (Notion: 📋 Templates DB)
5 duplicable rows added:
- 🌐 Client Portal — per-engagement portal page (publish-to-web)
- 📊 AI Audit Deliverable — the actual audit report sent post-discovery
- 📄 Proposal (3-Tier) — $2.5k Audit / $8.5k Implementation / $2k/mo Ongoing, middle tier engineered as the obvious pick
- 🚀 Client Onboarding Checklist — 10-step Day-0-to-Day-7 intake
- 📧 Weekly Client Update Email — Friday-afternoon retainer-update format

### Phase 7 — Documentation (Notion: 🦉 Wise AI root + new subpages)
- 🦉 Wise AI root page rewritten with: lifecycle ASCII map, "what each DB is for" table, how-to-add-a-lead, routines overview, automation table, "when something feels off" section.
- 📦 Backup SOP — weekly export procedure.
- 💡 What to build next — parking lot for ideas (chart conversion, Stripe webhook, Gmail → Notes, etc.)

Plus `wise-os/README.md`, `wise-os/docs/setup.md`, `wise-os/docs/deployment.md`, `wise-os/docs/backup-sop.md`.

## What I didn't do
- **No Excel sync** — file wasn't on disk. Stub is ready.
- **No live test of webhooks/cron scripts** — needs your env vars + Notion integration token.
- **No Revenue DB** — deferred per the brief until Phase 3 inspection of your Excel.
- **No real chart views on Dashboard** — DSL didn't expose the chart Y-axis property; left as boards/tables. 2-second UI conversion documented in *What to build next*.

## Order to do things when you wake up
1. Open the [📊 Dashboard](https://app.notion.com/p/35177fd266b5818e8e21d201ceef6505). Eye-test: do the views make sense?
2. Open [⚙️ Operations](https://app.notion.com/p/35177fd266b581d7b2a5d387d692b6be) and try a dry-run of the Morning Standup template — duplicate it, fill it in, see if the 5-min target feels right.
3. Open [📋 Templates](https://app.notion.com/p/35177fd266b5812183b2c656d7adba0e) and read the Proposal + Client Portal — those are the two you'll see daylight on first.
4. Drop your Excel into `wise-os/data/wise-ai.xlsx` and ping me to do Phase 3 mapping properly.
5. Set up the integration token + scripts when you have 30 minutes.

— Claude
