import { ACCOUNTS, fetchYear, merge, type AccountKey, type Contributions } from "../../shared/contributions.ts";
import { ContributionDay, SyncRun } from "./db.ts";

/**
 * Pulls contribution counts from GitHub into Mongo.
 * An account with no stored days gets a full backfill (every year since `since`); after that only the current
 * year is re-fetched, plus last year during January (late-arriving contributions on Dec 31 still count there).
 */
export async function sync({ full = false, now = new Date() } = {}) {
  const run = await SyncRun.create({ startedAt: new Date(), full });
  const fetched: { login: string; year: number; days: number }[] = [];
  try {
    const thisYear = now.getUTCFullYear();
    for (const account of ACCOUNTS) {
      const backfill = full || !(await ContributionDay.exists({ login: account.login }));
      const years = backfill
        ? Array.from({ length: thisYear - account.since + 1 }, (_, i) => account.since + i)
        : now.getUTCMonth() === 0 ? [thisYear - 1, thisYear] : [thisYear];
      for (const year of years) {
        const counts = await fetchYear(account.login, year);
        await ContributionDay.bulkWrite(
          [...counts].map(([date, count]) => ({
            updateOne: { filter: { login: account.login, date }, update: { $set: { count } }, upsert: true },
          })),
          { ordered: false },
        );
        fetched.push({ login: account.login, year, days: counts.size });
      }
    }
    await SyncRun.updateOne({ _id: run._id }, { finishedAt: new Date(), ok: true, fetched });
    invalidate();
    return { ok: true as const, fetched };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await SyncRun.updateOne({ _id: run._id }, { finishedAt: new Date(), ok: false, fetched, error: message });
    throw error;
  }
}

// ---------- read side: merged view, cached in memory until the next sync ----------
let cached: (Contributions & { syncedAt: string | null }) | null = null;
const invalidate = () => { cached = null; };

export async function contributions() {
  if (cached) return cached;
  const logins = ACCOUNTS.map((a) => a.login);
  const [rows, lastOk] = await Promise.all([
    ContributionDay.find({ login: { $in: logins } }, { _id: 0, login: 1, date: 1, count: 1 }).lean(),
    SyncRun.findOne({ ok: true }, { finishedAt: 1 }).sort({ startedAt: -1 }).lean(),
  ]);
  const perAccount = { personal: new Map(), work: new Map() } as Record<AccountKey, Map<string, number>>;
  const keyByLogin = Object.fromEntries(ACCOUNTS.map((a) => [a.login, a.key])) as Record<string, AccountKey>;
  for (const r of rows) perAccount[keyByLogin[r.login]!].set(r.date, r.count);
  cached = { ...merge(perAccount, "live"), syncedAt: lastOk?.finishedAt?.toISOString() ?? null };
  return cached;
}

export const lastRun = () => SyncRun.findOne({}, { _id: 0, __v: 0 }).sort({ startedAt: -1 }).lean();
