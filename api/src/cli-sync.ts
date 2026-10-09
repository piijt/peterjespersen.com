// pnpm sync [--full]  — one-off sync into MONGODB_URI, without starting the server
import { connect, disconnect } from "./db.ts";
import { sync } from "./sync.ts";

await connect(process.env.MONGODB_URI!);
try {
  const r = await sync({ full: process.argv.includes("--full") });
  console.log(r.fetched.map((f) => `${f.login} ${f.year}: ${f.days} days`).join("\n"));
} finally {
  await disconnect();
}
