// Merged GitHub contribution history for the personal and the work account.
//
// Read from GitHub's public contribution pages (github.com/users/<login>/contributions), the same data an
// anonymous visitor sees on the profile. No token: the GraphQL API only counts contributions the calling token
// can see, so a token tied to one account hides the other account's private/org work.
//
// Plain TypeScript with no framework imports, so the Nitro route and the snapshot script both use it.

export const ACCOUNTS = [
  { key: "personal", login: "piijt", label: "Personal", since: 2017 },
  { key: "work", login: "peterhjespersen", label: "Work", since: 2023 },
] as const;

export type AccountKey = (typeof ACCOUNTS)[number]["key"];

/** one day: [date (YYYY-MM-DD), personal, work] */
export type Day = [string, number, number];

export interface Streak {
  days: number;
  from: string | null;
  to: string | null;
}

export interface Contributions {
  generatedAt: string;
  source: "live" | "snapshot";
  accounts: { key: AccountKey; login: string; label: string; total: number }[];
  days: Day[];
  years: { year: number; personal: number; work: number; total: number }[];
  stats: {
    total: number;
    lastYear: number;
    activeDays: number;
    busiestDay: { date: string; count: number } | null;
    longestStreak: Streak;
    currentStreak: Streak;
  };
}

const USER_AGENT = "peterjespersen.com contribution graph (+https://peterjespersen.com)";

/** date -> count for one account and calendar year */
export async function fetchYear(login: string, year: number): Promise<Map<string, number>> {
  const url = `https://github.com/users/${encodeURIComponent(login)}/contributions?from=${year}-01-01&to=${year}-12-31`;
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "text/html" } });
  if (!res.ok) throw new Error(`GitHub contributions ${login} ${year}: HTTP ${res.status}`);
  return parseCalendar(await res.text());
}

/**
 * The calendar is a table of <td id="contribution-day-component-W-D" data-date="…"> cells; each count lives in a
 * <tool-tip for="that id">13 contributions on October 6th.</tool-tip> ("No contributions on …" for zero).
 */
export function parseCalendar(html: string): Map<string, number> {
  const dateById = new Map<string, string>();
  for (const [tag] of html.matchAll(/<td\b[^>]*\bdata-date="[^"]+"[^>]*>/g)) {
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    const date = /\bdata-date="(\d{4}-\d{2}-\d{2})"/.exec(tag)?.[1];
    if (id && date) dateById.set(id, date);
  }
  const counts = new Map<string, number>();
  for (const date of dateById.values()) counts.set(date, 0);
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const date = dateById.get(m[1]!);
    const n = /^\s*(\d[\d,]*)\s+contributions?\b/.exec(m[2]!)?.[1];
    if (date) counts.set(date, n ? Number(n.replace(/,/g, "")) : 0);
  }
  if (!dateById.size) throw new Error("GitHub contributions: no calendar found in the page (markup changed?)");
  return counts;
}

/** runs fn over items with at most `limit` in flight */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Fetches every year of both accounts and merges them. */
export async function fetchContributions(now = new Date()): Promise<Contributions> {
  const thisYear = now.getUTCFullYear();
  const jobs = ACCOUNTS.flatMap((a) =>
    Array.from({ length: thisYear - a.since + 1 }, (_, i) => ({ key: a.key, login: a.login, year: a.since + i })),
  );
  const results = await pool(jobs, 4, async (j) => ({ ...j, counts: await fetchYear(j.login, j.year) }));
  const perAccount: Record<AccountKey, Map<string, number>> = { personal: new Map(), work: new Map() };
  for (const r of results) for (const [d, n] of r.counts) perAccount[r.key].set(d, n);
  return merge(perAccount, "live", now);
}

const today = (now: Date) => now.toISOString().slice(0, 10);

export function merge(
  perAccount: Record<AccountKey, Map<string, number>>,
  source: Contributions["source"],
  now = new Date(),
): Contributions {
  const end = today(now);
  const dates = [...new Set([...perAccount.personal.keys(), ...perAccount.work.keys()])].filter((d) => d <= end).sort();
  const days: Day[] = dates.map((d) => [d, perAccount.personal.get(d) ?? 0, perAccount.work.get(d) ?? 0]);
  return { generatedAt: now.toISOString(), source, ...summarize(days, now) };
}

/** everything derived from the day list (also used to refresh a snapshot's numbers) */
export function summarize(days: Day[], now = new Date()) {
  const byYear = new Map<number, { year: number; personal: number; work: number; total: number }>();
  let personal = 0;
  let work = 0;
  let activeDays = 0;
  let busiestDay: { date: string; count: number } | null = null;
  let longest: Streak = { days: 0, from: null, to: null };
  let run: Streak = { days: 0, from: null, to: null };
  const yearAgo = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);
  let lastYear = 0;

  for (const [date, p, w] of days) {
    const n = p + w;
    personal += p;
    work += w;
    const y = Number(date.slice(0, 4));
    const yr = byYear.get(y) ?? { year: y, personal: 0, work: 0, total: 0 };
    yr.personal += p;
    yr.work += w;
    yr.total += n;
    byYear.set(y, yr);
    if (date > yearAgo) lastYear += n;
    if (n > 0) {
      activeDays++;
      if (!busiestDay || n > busiestDay.count) busiestDay = { date, count: n };
      run = { days: run.days + 1, from: run.from ?? date, to: date };
      if (run.days > longest.days) longest = { ...run };
    } else {
      run = { days: 0, from: null, to: null };
    }
  }
  const currentStreak = trailingStreak(days);

  return {
    accounts: ACCOUNTS.map((a) => ({ key: a.key, login: a.login, label: a.label, total: a.key === "personal" ? personal : work })),
    days,
    years: [...byYear.values()].sort((a, b) => a.year - b.year),
    stats: { total: personal + work, lastYear, activeDays, busiestDay, longestStreak: longest, currentStreak },
  };
}

/** the run of active days ending today, or yesterday (today may simply not have commits yet) */
function trailingStreak(days: Day[]): Streak {
  let i = days.length - 1;
  if (i >= 0 && days[i]![1] + days[i]![2] === 0) i--;
  const to = i >= 0 ? days[i]![0] : null;
  let n = 0;
  while (i >= 0 && days[i]![1] + days[i]![2] > 0) { n++; i--; }
  return n ? { days: n, from: days[i + 1]![0], to } : { days: 0, from: null, to: null };
}
