import express from "express";
import cors from "cors";
import { connect } from "./db.ts";
import { sync, contributions, lastRun } from "./sync.ts";

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const SYNC_TOKEN = process.env.SYNC_TOKEN; // required for POST /sync; unset = endpoint disabled
const SYNC_EVERY_MS = (Number(process.env.SYNC_EVERY_HOURS) || 6) * 60 * 60 * 1000;
// comma-separated, e.g. "https://peterjespersen.com,http://localhost:3000"; unset = any origin (it's public data)
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean);

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set (see .env.example)");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: CORS_ORIGINS?.length ? CORS_ORIGINS : "*" }));

/** merged daily contributions of both accounts + yearly totals and stats */
app.get("/contributions", async (_req, res, next) => {
  try {
    res.set("cache-control", "public, max-age=300, stale-while-revalidate=3600");
    res.json(await contributions());
  } catch (e) { next(e); }
});

app.get("/health", async (_req, res, next) => {
  try {
    res.json({ ok: true, lastSync: await lastRun() });
  } catch (e) { next(e); }
});

/** force a sync: POST /sync (Authorization: Bearer $SYNC_TOKEN), ?full=1 re-fetches every year */
let syncing: Promise<unknown> | null = null;
app.post("/sync", async (req, res) => {
  if (!SYNC_TOKEN || req.get("authorization") !== `Bearer ${SYNC_TOKEN}`) return void res.status(401).json({ error: "unauthorized" });
  if (syncing) return void res.status(409).json({ error: "a sync is already running" });
  try {
    syncing = sync({ full: req.query.full === "1" });
    res.json(await syncing);
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : String(e) });
  } finally {
    syncing = null;
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

async function scheduledSync() {
  if (syncing) return;
  try {
    syncing = sync();
    const r = (await syncing) as Awaited<ReturnType<typeof sync>>;
    console.log(`sync ok: ${r.fetched.map((f) => `${f.login}/${f.year}`).join(", ")}`);
  } catch (e) {
    console.error("sync failed:", e instanceof Error ? e.message : e);
  } finally {
    syncing = null;
  }
}

await connect(MONGODB_URI);
app.listen(PORT, () => console.log(`api listening on :${PORT}`));
// first run backfills an empty database; afterwards only the current year is refreshed
void scheduledSync();
setInterval(scheduledSync, SYNC_EVERY_MS).unref();
