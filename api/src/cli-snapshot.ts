// pnpm snapshot — writes the merged data from Mongo to the site's fallback file (public/contributions.snapshot.json),
// which the site shows when the API can't be reached.
import { writeFileSync } from "node:fs";
import { connect, disconnect } from "./db.ts";
import { contributions } from "./sync.ts";

await connect(process.env.MONGODB_URI!);
try {
  const data = { ...(await contributions()), source: "snapshot" as const };
  writeFileSync(new URL("../../public/contributions.snapshot.json", import.meta.url), JSON.stringify(data));
  console.log(`snapshot: ${data.days.length} days, ${data.stats.total} contributions (synced ${data.syncedAt})`);
} finally {
  await disconnect();
}
