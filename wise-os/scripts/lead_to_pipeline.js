/**
 * Webhook: Calendly booking / Meta lead form → Inbox row + draft Pipeline deal.
 *
 *   npm install
 *   node lead_to_pipeline.js
 *
 * Then point your Calendly / Meta lead webhook at:
 *   POST https://<host>/webhook/calendly
 *   POST https://<host>/webhook/meta
 *
 * Either route accepts a JSON body and creates:
 *   1. A Pipeline page with Stage = "New Lead"
 *   2. A Client page (linked) if the email is new
 */
import "dotenv/config";
import express from "express";
import { Client } from "@notionhq/client";
import { DATA_SOURCES } from "./config.js";

const PORT = process.env.PORT || 3001;
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const app = express();
app.use(express.json({ limit: "1mb" }));

async function findOrCreateClient({ name, email, phone, source }) {
  const search = await notion.databases.query({
    database_id: DATA_SOURCES.clients,
    filter: { property: "Name", title: { equals: name } },
    page_size: 1,
  });
  if (search.results.length) return search.results[0].id;

  const created = await notion.pages.create({
    parent: { database_id: DATA_SOURCES.clients },
    properties: {
      Name: { title: [{ text: { content: name } }] },
      Status: { select: { name: "Lead" } },
      Source: source ? { select: { name: source } } : undefined,
      Phone: phone ? { phone_number: phone } : undefined,
      "Date Added": { date: { start: new Date().toISOString().slice(0, 10) } },
    },
  });
  return created.id;
}

async function createDeal({ clientId, dealName, source, notes }) {
  return notion.pages.create({
    parent: { database_id: DATA_SOURCES.pipeline },
    properties: {
      "Deal Name": { title: [{ text: { content: dealName } }] },
      Stage: { select: { name: "New Lead" } },
      Client: { relation: [{ id: clientId }] },
      "Next Action": notes
        ? { rich_text: [{ text: { content: notes } }] }
        : undefined,
    },
  });
}

app.post("/webhook/calendly", async (req, res) => {
  try {
    const inv = req.body?.payload?.invitee || req.body?.invitee || req.body || {};
    const name = inv.name || inv.full_name || "Unknown";
    const email = inv.email;
    const phone = inv.text_reminder_number || inv.phone;
    const eventName = req.body?.payload?.event_type?.name || "Calendly booking";

    const clientId = await findOrCreateClient({
      name, email, phone, source: "Website",
    });
    const deal = await createDeal({
      clientId,
      dealName: `${name} — ${eventName}`,
      source: "Website",
      notes: `Booked via Calendly: ${eventName}`,
    });
    res.json({ ok: true, dealId: deal.id });
  } catch (err) {
    console.error("Calendly webhook failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/webhook/meta", async (req, res) => {
  try {
    // Meta lead form payload structure: { entry: [{ changes: [{ value: { leadgen_id, ... } }] }] }
    // Simplified flat payload also accepted for testing.
    const lead = req.body?.entry?.[0]?.changes?.[0]?.value || req.body || {};
    const name = lead.full_name || lead.name || "Meta Lead";
    const phone = lead.phone_number || lead.phone;
    const email = lead.email;
    const business = lead.business_name || lead.company || "";

    const clientId = await findOrCreateClient({
      name: business || name,
      email,
      phone,
      source: "Meta Ads",
    });
    const deal = await createDeal({
      clientId,
      dealName: `${business || name} — AI Audit enquiry`,
      source: "Meta Ads",
      notes: `From Meta lead form. Contact: ${name}${email ? ` <${email}>` : ""}`,
    });
    res.json({ ok: true, dealId: deal.id });
  } catch (err) {
    console.error("Meta webhook failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`lead_to_pipeline listening on :${PORT}`);
});
