# Deployment

Pick the simplest option that gets it scheduled and out of your head.

## Option A — Mac launchd (zero hosting cost, runs only when laptop is on)

Best for: stale-client + overdue-invoice alerts (run once a day, results land in Telegram).

Create `~/Library/LaunchAgents/com.wiseai.daily.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>             <string>com.wiseai.daily</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd ~/code/WISE-ASSISTANT/wise-os/scripts &amp;&amp; source .venv/bin/activate &amp;&amp; python3 stale_client_alerts.py &amp;&amp; python3 invoice_overdue_alert.py</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>    <integer>8</integer>
    <key>Minute</key>  <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>   <string>/tmp/wiseai.out.log</string>
  <key>StandardErrorPath</key> <string>/tmp/wiseai.err.log</string>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.wiseai.daily.plist
```

## Option B — GitHub Actions cron (free, runs even when laptop is off)

`.github/workflows/wiseai-daily.yml`:

```yaml
name: Wise AI Daily

on:
  schedule:
    - cron: "0 22 * * *"   # 08:00 AEST (UTC+10) = 22:00 UTC the previous day
  workflow_dispatch:

jobs:
  daily:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - working-directory: wise-os/scripts
        run: pip install -r requirements.txt
      - working-directory: wise-os/scripts
        env:
          NOTION_TOKEN:        ${{ secrets.NOTION_TOKEN }}
          TELEGRAM_BOT_TOKEN:  ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID:    ${{ secrets.TELEGRAM_CHAT_ID }}
          SENDGRID_API_KEY:    ${{ secrets.SENDGRID_API_KEY }}
          SENDGRID_FROM_EMAIL: ${{ secrets.SENDGRID_FROM_EMAIL }}
          SENDGRID_TO_EMAIL:   ${{ secrets.SENDGRID_TO_EMAIL }}
        run: |
          python3 stale_client_alerts.py
          python3 invoice_overdue_alert.py
```

Add the listed secrets to the repo's Settings → Secrets and variables → Actions.

## Option C — Render / Railway worker (for the webhook listener)

`lead_to_pipeline.js` needs to be reachable from the internet. The other scripts are scheduled.

Easiest: deploy `lead_to_pipeline.js` as a **Background Worker** on Render's free tier.
- Build command: `cd wise-os/scripts && npm install`
- Start command: `cd wise-os/scripts && node lead_to_pipeline.js`
- Environment variables: NOTION_TOKEN

The won-deal watcher can also live on Render (`node won_deal_to_project.js --watch`).

## Recommendation

| Script | Recommended host |
|---|---|
| `stale_client_alerts.py` | GitHub Actions cron |
| `invoice_overdue_alert.py` | GitHub Actions cron |
| `lead_to_pipeline.js` | Render free worker |
| `won_deal_to_project.js` | GitHub Actions cron (every 15 min) OR Render worker with `--watch` |
| `excel_to_notion.py` | Manual / on-demand |
