/**
 * Watcher: Pipeline deals that just flipped to "Won" → spawn a Project + 5 default kickoff tasks.
 *
 * Notion's API doesn't push events, so this polls every N minutes. Run via:
 *   - cron (Mac launchd, GitHub Actions)
 *   - or as a long-lived process: `node won_deal_to_project.js --watch`
 *
 * Idempotent: only deals without an existing Project relation are processed.
 *
 *   node won_deal_to_project.js              # one-shot
 *   node won_deal_to_project.js --watch      # poll every 5 min
 *   node won_deal_to_project.js --dry-run    # log only
 */
import "dotenv/config";
import { Client } from "@notionhq/client";
import { DATA_SOURCES } from "./config.js";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dryRun = process.argv.includes("--dry-run");
const watch = process.argv.includes("--watch");
const POLL_MS = 5 * 60 * 1000;

const KICKOFF_TASKS = [
  { name: "Send signed scope + invoice 1", priority: "P0", offsetDays: 0 },
  { name: "Schedule kickoff call", priority: "P0", offsetDays: 1 },
  { name: "Send onboarding checklist", priority: "P1", offsetDays: 2 },
  { name: "Audit current systems & access", priority: "P1", offsetDays: 5 },
  { name: "Deliver week-1 quick win", priority: "P1", offsetDays: 7 },
];

const dealTitle = (page) =>
  page.properties["Deal Name"]?.title?.map((t) => t.plain_text).join("") || "(deal)";

const pageProp = (page, name) => page.properties[name];

async function findUnprojectedWonDeals() {
  const resp = await notion.databases.query({
    database_id: DATA_SOURCES.pipeline,
    filter: {
      and: [
        { property: "Stage", select: { equals: "Won" } },
        { property: "Project", relation: { is_empty: true } },
      ],
    },
    page_size: 50,
  });
  return resp.results;
}

function isoDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function spawnProjectForDeal(deal) {
  const title = dealTitle(deal);
  const clientRel = pageProp(deal, "Client")?.relation || [];
  const offer = pageProp(deal, "Offer")?.select?.name || "";
  const value = pageProp(deal, "Value")?.number ?? null;

  const projectType =
    offer === "AI Audit" ? "Audit" :
    offer === "AI Implementation" ? "Implementation" :
    offer === "Ongoing Optimisation" ? "Ongoing" : "Implementation";

  if (dryRun) {
    console.log(`[DRY] would spawn project: ${title} (${projectType})`);
    return;
  }

  const project = await notion.pages.create({
    parent: { database_id: DATA_SOURCES.projects },
    properties: {
      "Project Name": { title: [{ text: { content: title } }] },
      Status: { select: { name: "Scoping" } },
      Type: { select: { name: projectType } },
      Health: { select: { name: "On Track" } },
      Client: { relation: clientRel },
      Deal: { relation: [{ id: deal.id }] },
      "Start Date": { date: { start: new Date().toISOString().slice(0, 10) } },
      Budget: value !== null ? { number: value } : undefined,
    },
  });

  for (const task of KICKOFF_TASKS) {
    await notion.pages.create({
      parent: { database_id: DATA_SOURCES.tasks },
      properties: {
        Name: { title: [{ text: { content: task.name } }] },
        Status: { select: { name: "Not Started" } },
        Priority: { select: { name: task.priority } },
        "Due Date": { date: { start: isoDateOffset(task.offsetDays) } },
        Project: { relation: [{ id: project.id }] },
        Client: { relation: clientRel },
        Deal: { relation: [{ id: deal.id }] },
      },
    });
  }

  console.log(`Spawned project + ${KICKOFF_TASKS.length} tasks for "${title}"`);
}

async function tick() {
  try {
    const deals = await findUnprojectedWonDeals();
    if (!deals.length) {
      console.log(`[${new Date().toISOString()}] No unprojected won deals.`);
      return;
    }
    for (const deal of deals) await spawnProjectForDeal(deal);
  } catch (err) {
    console.error("tick failed:", err);
  }
}

if (watch) {
  console.log(`won_deal_to_project polling every ${POLL_MS / 1000}s${dryRun ? " (dry-run)" : ""}`);
  tick();
  setInterval(tick, POLL_MS);
} else {
  tick();
}
