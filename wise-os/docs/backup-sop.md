# Backup SOP — Weekly Workspace Export

Runs every Friday afternoon. Takes about 5 minutes.

## Why
Notion is reliable but not bulletproof. A weekly export means that if a database gets accidentally deleted, a relation goes haywire, or your account gets locked out, you have a recoverable snapshot.

## Procedure

1. **In Notion:** workspace settings → Settings → Workspace → **Export all workspace content**.
   - Format: **Markdown & CSV**
   - Include: subpages = **Yes**, files = **Yes**
   - Wait for the email with the download link.

2. **Save the export:**
   ```
   ~/Backups/WiseAI/wise-ai-export-YYYY-MM-DD.zip
   ```

3. **Push to cloud:**
   - Drag the zip into Google Drive `WiseAI / Backups`
   - Confirm size is roughly the same as last week (sanity check)

4. **Prune:** keep the last 8 weeks. Delete older ones.

## Restore (if needed)

1. Notion → top-left workspace switcher → **+ Add a workspace**
2. New workspace → **Import** → select the zip.
3. Notion will reconstruct pages. **Relations between databases will be lost** — you will need to re-link them. This is why we treat the export as a worst-case fallback, not a daily restore mechanism.

## Faster alternative — script-based snapshot

If you want a daily snapshot without the workspace-export UI dance, the Notion API can be used to dump every database row to JSON. Add this only if the manual weekly export proves too brittle.
