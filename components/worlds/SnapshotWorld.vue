<script setup lang="ts">
/**
 * Snapshot world — live recreation of the Snapshot (datakit) product:
 *  1. three database sources stream rows into a saved query whose aperture "shutters" them into versioned snapshots
 *  2. a browser-frame recreation of the Snapshot dashboard, driven by the selected snapshot version
 *  3. a scrubbable version timeline + row diff, and a multi-tenant (orgId) request-isolation visual
 * All data is generated (seeded) demo data.
 */

type SourceKey = "mysql" | "postgres" | "mongo";
type Status = "paid" | "pending" | "refunded";
interface Row { id: string; orders: number; revenue: number; status: Status }
interface Version { v: number; rows: Row[]; hash: string; source: SourceKey; clock: string }
interface Pt { x: number; y: number }

const SNAP = "#f9802e"; // Snapshot's primary: hsl(24 95% 58%)
const SOURCES: { key: SourceKey; name: string; ver: string; color: string; short: string }[] = [
  { key: "mysql", name: "MySQL", ver: "8.0 · shop", color: "#44bce3", short: "my" },
  { key: "postgres", name: "Postgres", ver: "16 · billing", color: "#8b5cf6", short: "pg" },
  { key: "mongo", name: "MongoDB", ver: "7 · events", color: "#3cf0b9", short: "mg" },
];
const REGIONS = ["EU-West", "US-East", "APAC", "Nordics", "US-West", "LATAM", "MEA", "EU-North"];
const STATUS_COLOR: Record<Status, string> = { paid: "#91cc75", pending: "#fac858", refunded: "#ee6666" };
const TITLE = "Snapshot".split("");
const CHIPS = ["Nuxt 3", "Vue 3", "TypeScript", "Tailwind", "shadcn-vue", "ECharts", "Express", "Mongoose", "MongoDB 7", "MySQL 8", "Postgres 16", "Stripe", "Docker", "Caddy"];
const FACTS = [
  { k: "3 engines", v: "MySQL, Postgres and MongoDB connections, plus HTTP APIs and CSV / JSON uploads." },
  { k: "Versioned", v: "Schema inferred, rows coerced, deduplicated by dataHash. Every run is a new snapshot." },
  { k: "Scheduled", v: "Connection-backed snapshots auto-refresh on an interval, hands-free." },
  { k: "Multi-tenant", v: "orgId on every model and in the JWT. Four roles, invites, Stripe trials." },
];
const ICONS: Record<string, string> = {
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  link: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5"/>',
  atom: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  panel: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
};
for (const k of Object.keys(ICONS)) ICONS[k] = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
const NAV = [
  { label: "Snapshots", icon: "database" },
  { label: "Dashboards", icon: "dashboard", active: true },
  { label: "Connections", icon: "link" },
  { label: "Users", icon: "users" },
  { label: "API keys", icon: "key" },
];

/* ---------------- seeded demo data ---------------- */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(2026);
const hex = () => Math.floor(rnd() * 0xfffffff).toString(16).padStart(7, "0");
const clockFor = (v: number) => {
  const m = 9 * 60 + v * 15;
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const pickStatus = (): Status => { const r = rnd(); return r < 0.66 ? "paid" : r < 0.87 ? "pending" : "refunded"; };
const price = () => 34 + rnd() * 22;
function firstRows(): Row[] {
  return REGIONS.slice(0, 6).map((id) => {
    const orders = 90 + Math.round(rnd() * 230);
    return { id, orders, revenue: Math.round(orders * price()), status: pickStatus() };
  });
}
function nextRows(prev: Row[]): Row[] {
  const rows = prev.map((r) => ({ ...r }));
  const n = 1 + Math.floor(rnd() * 3);
  for (let k = 0; k < n; k++) {
    const r = rows[Math.floor(rnd() * rows.length)];
    if (!r) continue;
    r.orders = Math.max(30, r.orders + Math.round((rnd() - 0.3) * 50));
    r.revenue = Math.round(r.orders * price());
    if (rnd() < 0.3) r.status = pickStatus();
  }
  const missing = REGIONS.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length && rnd() < 0.22) {
    const id = missing[Math.floor(rnd() * missing.length)] ?? "MEA";
    const orders = 50 + Math.round(rnd() * 120);
    rows.push({ id, orders, revenue: Math.round(orders * price()), status: pickStatus() });
  } else if (rows.length > 5 && rnd() < 0.15) {
    rows.splice(Math.floor(rnd() * rows.length), 1);
  }
  return rows;
}

const versions = ref<Version[]>([]);
{
  let rows = firstRows();
  const keys: SourceKey[] = ["mysql", "postgres", "mongo"];
  for (let v = 1; v <= 12; v++) {
    if (v > 1) rows = nextRows(rows);
    versions.value.push({ v, rows, hash: hex(), source: keys[v % 3] ?? "mysql", clock: clockFor(v) });
  }
}
const sel = ref(versions.value.length - 1);
const follow = ref(true);
const lastShotV = ref(-1);
const current = computed(() => versions.value[sel.value] ?? versions.value[versions.value.length - 1]!);
const previous = computed<Version | undefined>(() => versions.value[sel.value - 1]);
const latest = computed(() => versions.value[versions.value.length - 1]!);

const nf = new Intl.NumberFormat("en-US");
const fmt = (n: number) => nf.format(Math.round(n));
const money = (n: number) => "$" + nf.format(Math.round(n));
const kfmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : String(Math.round(n)));
const srcOf = (k: SourceKey) => SOURCES.find((s) => s.key === k) ?? SOURCES[0]!;

/* ---------------- selection / timeline ---------------- */
const WINDOW = 14;
const winStart = computed(() => Math.max(0, versions.value.length - WINDOW));
const ticks = computed(() => versions.value.slice(winStart.value));
const tickPct = (i: number) => (ticks.value.length > 1 ? (i / (ticks.value.length - 1)) * 100 : 0);
const handlePct = computed(() => tickPct(sel.value - winStart.value));

function selectIdx(i: number) {
  const n = versions.value.length;
  sel.value = Math.max(winStart.value, Math.min(n - 1, i));
  follow.value = sel.value === n - 1;
}
function selectV(v: number) {
  const i = versions.value.findIndex((x) => x.v === v);
  if (i >= 0) selectIdx(i);
}
function goLive() { follow.value = true; sel.value = versions.value.length - 1; }

const tlEl = ref<HTMLElement>();
let dragging = false;
function tlFromEvent(e: PointerEvent) {
  const el = tlEl.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const pad = 14;
  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left - pad) / Math.max(1, r.width - pad * 2)));
  selectIdx(winStart.value + Math.round(ratio * (ticks.value.length - 1)));
}
function tlDown(e: PointerEvent) { dragging = true; tlEl.value?.setPointerCapture(e.pointerId); tlFromEvent(e); }
function tlMove(e: PointerEvent) { if (dragging) tlFromEvent(e); }
function tlUp(e: PointerEvent) { dragging = false; tlEl.value?.releasePointerCapture?.(e.pointerId); }
function tlKey(e: KeyboardEvent) {
  const map: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
  if (e.key in map) { e.preventDefault(); selectIdx(sel.value + (map[e.key] ?? 0)); }
  else if (e.key === "Home") { e.preventDefault(); selectIdx(winStart.value); }
  else if (e.key === "End") { e.preventDefault(); goLive(); }
}

/* ---------------- diff ---------------- */
interface DiffRow { id: string; kind: "same" | "added" | "removed" | "changed"; row: Row; old?: Row; ch: { orders?: boolean; revenue?: boolean; status?: boolean } }
const diff = computed<DiffRow[]>(() => {
  const cur = current.value.rows;
  const prev = previous.value?.rows ?? [];
  const out: DiffRow[] = [];
  for (const r of cur) {
    const o = prev.find((p) => p.id === r.id);
    if (!o) { out.push({ id: r.id, kind: "added", row: r, ch: {} }); continue; }
    const ch = { orders: o.orders !== r.orders, revenue: o.revenue !== r.revenue, status: o.status !== r.status };
    out.push({ id: r.id, kind: ch.orders || ch.revenue || ch.status ? "changed" : "same", row: r, old: o, ch });
  }
  for (const o of prev) if (!cur.some((r) => r.id === o.id)) out.push({ id: o.id, kind: "removed", row: o, ch: {} });
  return out;
});
const diffStats = computed(() => ({
  added: diff.value.filter((d) => d.kind === "added").length,
  removed: diff.value.filter((d) => d.kind === "removed").length,
  changed: diff.value.filter((d) => d.kind === "changed").length,
}));

/* ---------------- dashboard data ---------------- */
const totals = computed(() => {
  const rows = current.value.rows;
  const orders = rows.reduce((s, r) => s + r.orders, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  return { orders, revenue, avg: orders ? revenue / orders : 0 };
});
const shown = reactive({ orders: totals.value.orders, revenue: totals.value.revenue, avg: totals.value.avg });

const CW = 440, CH = 180, PL = 44, PR = 14, PT = 14, PB = 26;
const series = computed(() =>
  versions.value.slice(Math.max(0, sel.value - 9), sel.value + 1).map((v) => ({ v: v.v, y: v.rows.reduce((s, r) => s + r.revenue, 0) })),
);
const chart = computed(() => {
  const s = series.value;
  const ys = s.map((p) => p.y);
  const min = Math.floor((Math.min(...ys) * 0.94) / 5000) * 5000;
  const max = Math.ceil((Math.max(...ys) * 1.03) / 5000) * 5000 || 1;
  const xs = (i: number) => PL + (s.length > 1 ? (i / (s.length - 1)) * (CW - PL - PR) : 0);
  const yv = (y: number) => PT + (1 - (y - min) / Math.max(1, max - min)) * (CH - PT - PB);
  const pts: Pt[] = s.map((p, i) => ({ x: xs(i), y: yv(p.y) }));
  let d = "";
  pts.forEach((p, i) => {
    if (i === 0) { d = `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`; return; }
    const p0 = pts[i - 2] ?? pts[i - 1]!, p1 = pts[i - 1]!, p3 = pts[i + 1] ?? p;
    const c1x = p1.x + (p.x - p0.x) / 6, c1y = p1.y + (p.y - p0.y) / 6;
    const c2x = p.x - (p3.x - p1.x) / 6, c2y = p.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1] ?? { x: PL, y: CH - PB };
  const first = pts[0] ?? last;
  const area = `${d} L${last.x.toFixed(1)} ${CH - PB} L${first.x.toFixed(1)} ${CH - PB} Z`;
  const grid = [0, 1, 2, 3].map((k) => { const val = min + ((max - min) * k) / 3; return { y: yv(val), label: kfmt(val) }; });
  return { d, area, pts, grid, labels: s.map((p) => `v${p.v}`), values: ys };
});
const hoverI = ref(-1);
const lineSvg = ref<SVGSVGElement>();
function lineMove(e: PointerEvent) {
  const el = lineSvg.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * CW;
  const n = chart.value.pts.length;
  const i = Math.round(((x - PL) / (CW - PL - PR)) * (n - 1));
  hoverI.value = Math.max(0, Math.min(n - 1, i));
}

const bars = computed(() => {
  const rows = [...current.value.rows].sort((a, b) => REGIONS.indexOf(a.id) - REGIONS.indexOf(b.id));
  const max = Math.max(...rows.map((r) => r.orders)) * 1.12;
  return { max, rows: rows.map((r) => ({ id: r.id, v: r.orders, pct: (r.orders / max) * 100 })) };
});
const donut = computed(() => {
  const by: Record<Status, number> = { paid: 0, pending: 0, refunded: 0 };
  for (const r of current.value.rows) by[r.status] += r.orders;
  const total = by.paid + by.pending + by.refunded || 1;
  let acc = 0;
  return (Object.keys(by) as Status[]).map((k) => {
    const pct = (by[k] / total) * 100;
    const seg = { k, pct, off: acc, color: STATUS_COLOR[k], n: by[k] };
    acc += pct;
    return seg;
  });
});
const topRows = computed(() => {
  const rows = [...current.value.rows].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const max = rows[0]?.revenue ?? 1;
  return rows.map((r) => ({ ...r, pct: (r.revenue / max) * 100 }));
});

/* ---------------- pipeline layout ---------------- */
interface Layout { w: number; h: number; src: Pt[]; sb: { w: number; h: number }; q: Pt; r: number; stack: Pt; card: { w: number; h: number }; dx: number; dy: number; paths: string[]; out: string; label: Pt }
function makeLayout(narrow: boolean): Layout {
  if (!narrow) {
    const src = [{ x: 125, y: 92 }, { x: 125, y: 240 }, { x: 125, y: 388 }];
    const q = { x: 505, y: 240 }, r = 64;
    const stack = { x: 830, y: 262 }, card = { w: 224, h: 140 };
    return {
      w: 1000, h: 480, src, sb: { w: 196, h: 70 }, q, r, stack, card, dx: 12, dy: -18,
      paths: src.map((s) => `M${s.x + 98} ${s.y} C${s.x + 250} ${s.y} ${q.x - 220} ${q.y} ${q.x - r - 14} ${q.y}`),
      out: `M${q.x + r + 14} ${q.y} L${stack.x - card.w / 2 - 10} ${q.y}`,
      label: { x: q.x, y: q.y + r + 44 },
    };
  }
  const src = [{ x: 68, y: 52 }, { x: 200, y: 52 }, { x: 332, y: 52 }];
  const q = { x: 200, y: 300 }, r = 56;
  const stack = { x: 200, y: 628 }, card = { w: 270, h: 132 };
  return {
    w: 400, h: 720, src, sb: { w: 124, h: 66 }, q, r, stack, card, dx: 0, dy: -15,
    paths: src.map((s) => `M${s.x} ${s.y + 34} C${s.x} ${s.y + 150} ${q.x} ${q.y - 170} ${q.x} ${q.y - r - 14}`),
    out: `M${q.x} ${q.y + r + 64} L${q.x} ${stack.y - card.h / 2 - 54}`,
    label: { x: q.x, y: q.y + r + 30 },
  };
}
const narrow = ref(false);
const L = computed(() => makeLayout(narrow.value));
const sp = (i: number): Pt => L.value.src[i] ?? { x: 0, y: 0 };
const hexPts = (r: number) => Array.from({ length: 6 }, (_, k) => { const a = (Math.PI / 3) * k + Math.PI / 6; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(" ");
const stackCards = computed(() => {
  const vs = versions.value;
  const out: { c: Version; i: number }[] = [];
  for (let i = 0; i < 5 && i < vs.length; i++) out.push({ c: vs[vs.length - 1 - i]!, i });
  return out.reverse();
});
function cardBars(c: Version) {
  const max = Math.max(...c.rows.map((r) => r.orders));
  const n = c.rows.length;
  const w = L.value.card.w - 28;
  const bw = w / n - 5;
  const hMax = L.value.card.h - 92;
  return c.rows.map((r, k) => { const h = Math.max(3, (r.orders / max) * hMax); return { x: -L.value.card.w / 2 + 14 + k * (bw + 5), y: L.value.card.h / 2 - 30 - h, w: bw, h }; });
}
const enterVars = computed(() => ({ "--fx": `${L.value.q.x - L.value.stack.x}px`, "--fy": `${L.value.q.y - L.value.stack.y}px` }));
const flashPos = computed(() => ({ "--qx": `${(L.value.q.x / L.value.w) * 100}%`, "--qy": `${(L.value.q.y / L.value.h) * 100}%` }));

/* ---------------- tenants ---------------- */
const ORGS = [
  { id: "org_acme", name: "Acme Co", color: SNAP, users: ["owner", "admin", "editor", "editor", "viewer"], conns: 3, keys: 2 },
  { id: "org_northwind", name: "Northwind", color: "#44bce3", users: ["owner", "editor", "viewer"], conns: 2, keys: 1 },
  { id: "org_globex", name: "Globex", color: "#ff4fa3", users: ["owner", "admin", "editor", "viewer", "viewer", "viewer"], conns: 5, keys: 4 },
];
const ROLE_COLOR: Record<string, string> = { owner: "#f2c94c", admin: "#ff4fa3", editor: "#44bce3", viewer: "#7c8095" };
const ORG_Y = [60, 150, 240];
const orgSnaps = reactive([128, 64, 211]);
const me = ref(0);
const meOrg = computed(() => ORGS[me.value] ?? ORGS[0]!);
const ROLES = ["editor", "admin", "viewer"];
const USERS = ["usr_4c1e", "usr_9a02", "usr_d77b"];
interface LogLine { id: number; code: number; text: string }
const log = ref<LogLine[]>([]);
let logId = 0;
function pushLog(code: number, text: string) {
  log.value = [{ id: ++logId, code, text }, ...log.value].slice(0, 3);
}
function signIn(i: number) {
  if (i === me.value) return;
  me.value = i;
  pushLog(200, `POST /auth-service/login → token for ${ORGS[i]?.id}`);
}

/* ---------------- animation engine ---------------- */
const root = ref<HTMLElement>();
const stageEl = ref<HTMLElement>();
const dashEl = ref<HTMLElement>();
const titleEl = ref<HTMLElement>();
const flashEl = ref<HTMLElement>();
const ringEl = ref<SVGCircleElement>();
const irisEl = ref<SVGPolygonElement>();
const bladesEl = ref<SVGGElement>();
const gateEl = ref<SVGGElement>();
const denyEl = ref<SVGTextElement>();
const inView = useInView(root, "120px 0px 120px 0px");
const dashInView = useInView(dashEl);
const reduced = useReducedMotion();
const titleIn = ref(false);
const drawn = ref(false);
const hoverSrc = ref(-1);
const BATCH = 32;
const bufferShown = ref(0);

const srcPathEls: (SVGPathElement | null)[] = [null, null, null];
let outPathEl: SVGPathElement | null = null;
const dotEls: (SVGCircleElement | null)[] = [];
const pktEls: (SVGCircleElement | null)[] = [];
const orgGlowEls: (SVGRectElement | null)[] = [];
const setSrcPath = (el: unknown, i: number) => { srcPathEls[i] = (el as SVGPathElement) ?? null; };
const setOutPath = (el: unknown) => { outPathEl = (el as SVGPathElement) ?? null; };
const setDot = (el: unknown, i: number) => { dotEls[i] = (el as SVGCircleElement) ?? null; };
const setPkt = (el: unknown, i: number) => { pktEls[i] = (el as SVGCircleElement) ?? null; };
const setOrgGlow = (el: unknown, i: number) => { orgGlowEls[i] = (el as SVGRectElement) ?? null; };

const K = 96;
let samples: Float32Array[] = [];
function sample() {
  samples = [...srcPathEls, outPathEl].map((el) => {
    const arr = new Float32Array((K + 1) * 2);
    if (!el) return arr;
    const len = el.getTotalLength();
    for (let i = 0; i <= K; i++) { const p = el.getPointAtLength((len * i) / K); arr[i * 2] = p.x; arr[i * 2 + 1] = p.y; }
    return arr;
  });
}

interface Particle { on: boolean; path: number; t: number; sp: number }
const N_DOTS = 48;
const DOT_IDX = Array.from({ length: N_DOTS }, (_, i) => i);
const parts: Particle[] = DOT_IDX.map(() => ({ on: false, path: 0, t: 0, sp: 0 }));
let buffer = 0;
const bufferBy = [0, 0, 0];
let shooting = false;
const timers = new Set<ReturnType<typeof setTimeout>>();
const later = (fn: () => void, ms: number) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

function spawn(path: number, speed = 0.38 + Math.random() * 0.22) {
  const k = parts.findIndex((p) => !p.on);
  if (k < 0) return;
  const p = parts[k]!;
  p.on = true; p.path = path; p.t = 0; p.sp = speed;
  const el = dotEls[k];
  if (el) {
    el.setAttribute("fill", path < 3 ? (SOURCES[path]?.color ?? "#fff") : "#fff4ea");
    el.setAttribute("r", path < 3 ? "3.4" : "4.2");
  }
}
function burst(i: number) {
  if (reduced.value || !inView.value) { arriveMany(i, 8); return; }
  for (let k = 0; k < 9; k++) later(() => spawn(i, 0.6 + Math.random() * 0.2), k * 45);
}
function arriveMany(i: number, n: number) { for (let k = 0; k < n; k++) arrive(i); }
function arrive(path: number) {
  buffer++;
  bufferBy[path] = (bufferBy[path] ?? 0) + 1;
  bufferShown.value = Math.min(buffer, BATCH);
  if (buffer >= BATCH) shoot();
}
function shoot() {
  if (shooting) return;
  shooting = true;
  let best = 0;
  bufferBy.forEach((n, i) => { if (n > (bufferBy[best] ?? 0)) best = i; });
  buffer = 0; bufferBy.fill(0); bufferShown.value = 0;
  const src = SOURCES[best]?.key ?? "mysql";
  const anim = !reduced.value && inView.value;
  if (anim) {
    const ease = "cubic-bezier(.16,1,.3,1)";
    irisEl.value?.animate([{ transform: "scale(1)" }, { transform: "scale(0.12) rotate(60deg)", offset: 0.35 }, { transform: "scale(1) rotate(120deg)" }], { duration: 620, easing: ease });
    bladesEl.value?.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(60deg)" }], { duration: 620, easing: ease });
    flashEl.value?.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.12 }, { opacity: 0 }], { duration: 650, easing: "ease-out" });
    titleEl.value?.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.9) drop-shadow(0 0 24px rgba(249,128,46,.55))", offset: 0.15 }, { filter: "brightness(1)" }], { duration: 800, easing: "ease-out" });
    for (let k = 0; k < 7; k++) later(() => spawn(3, 2.2), k * 40);
  }
  later(() => { pushVersion(src); shooting = false; }, anim ? 360 : 0);
}
function pushVersion(source: SourceKey) {
  const prev = latest.value;
  const nv: Version = { v: prev.v + 1, rows: nextRows(prev.rows), hash: hex(), source, clock: clockFor(prev.v + 1) };
  versions.value.push(nv);
  lastShotV.value = nv.v;
  if (versions.value.length > 40) { versions.value.shift(); if (!follow.value) sel.value = Math.max(0, sel.value - 1); }
  if (follow.value) sel.value = versions.value.length - 1;
  else if (sel.value < winStart.value) sel.value = winStart.value;
  orgSnaps[me.value] = (orgSnaps[me.value] ?? 0) + 1;
}

// tenant request packets
interface Packet { on: boolean; phase: 0 | 1 | 2; t: number; org: number; foreign: boolean }
const PKT_IDX = [0, 1, 2, 3, 4, 5];
const pkts: Packet[] = PKT_IDX.map(() => ({ on: false, phase: 0, t: 0, org: 0, foreign: false }));
const A: Pt = { x: 70, y: 150 }, G: Pt = { x: 168, y: 150 };
const orgEdge = (i: number): Pt => ({ x: 262, y: ORG_Y[i] ?? 150 });
let reqN = 0;
function spawnPacket() {
  const k = pkts.findIndex((p) => !p.on);
  if (k < 0) return;
  const n = reqN++;
  const foreign = n % 4 === 3;
  const org = foreign ? (me.value + 1 + (n % 2)) % 3 : me.value;
  const p = pkts[k]!;
  p.on = true; p.phase = 0; p.t = 0; p.org = org; p.foreign = foreign;
  pktEls[k]?.setAttribute("fill", meOrg.value.color);
}
function packetStep(p: Packet, k: number, dt: number) {
  p.t += dt / 0.6;
  if (p.t >= 1) {
    p.t = 0;
    if (p.phase === 0) {
      if (p.foreign) {
        p.phase = 2;
        pktEls[k]?.setAttribute("fill", "#ff5d6c");
        gateEl.value?.animate([{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 300 });
        denyEl.value?.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(-6px)", offset: 0.2 }, { opacity: 0, transform: "translateY(-16px)" }], { duration: 1100, easing: "ease-out" });
        pushLog(404, `GET /datakit/datasets/${hex().slice(0, 6)} (${ORGS[p.org]?.id}) → not in your org`);
      } else p.phase = 1;
    } else {
      if (p.phase === 1) {
        orgGlowEls[p.org]?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 700 });
        pushLog(200, `GET /datakit/datasets?orgId=${ORGS[p.org]?.id} → 200`);
      }
      p.on = false;
    }
  }
  const el = pktEls[k];
  if (!el) return;
  if (!p.on) { el.setAttribute("opacity", "0"); return; }
  const [a, b] = p.phase === 0 ? [A, G] : p.phase === 1 ? [G, orgEdge(p.org)] : [G, A];
  const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2;
  el.setAttribute("cx", (a.x + (b.x - a.x) * e).toFixed(1));
  el.setAttribute("cy", (a.y + (b.y - a.y) * e).toFixed(1));
  el.setAttribute("opacity", "1");
}

let raf = 0, last = 0, spawnAcc = 0, pktAcc = 0;
function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // rows
  spawnAcc += dt;
  while (spawnAcc > 0.13) {
    spawnAcc -= 0.13;
    const r = Math.random();
    spawn(r < 0.4 ? 0 : r < 0.72 ? 1 : 2);
  }
  for (let k = 0; k < N_DOTS; k++) {
    const p = parts[k]!;
    const el = dotEls[k];
    if (!p.on) continue;
    p.t += p.sp * dt;
    if (p.t >= 1) {
      p.on = false;
      el?.setAttribute("opacity", "0");
      if (p.path < 3) arrive(p.path);
      continue;
    }
    const s = samples[p.path];
    if (!s || !el) continue;
    const f = p.t * K, i = Math.floor(f), u = f - i;
    const x = s[i * 2]! + (s[i * 2 + 2]! - s[i * 2]!) * u;
    const y = s[i * 2 + 1]! + (s[i * 2 + 3]! - s[i * 2 + 1]!) * u;
    el.setAttribute("cx", x.toFixed(1));
    el.setAttribute("cy", y.toFixed(1));
    el.setAttribute("opacity", Math.min(1, p.t * 8, (1 - p.t) * 8).toFixed(2));
  }
  ringEl.value?.setAttribute("stroke-dashoffset", (1 - buffer / BATCH).toFixed(3));
  // tenants
  pktAcc += dt;
  if (pktAcc > 1.05) { pktAcc = 0; spawnPacket(); }
  for (let k = 0; k < pkts.length; k++) { const p = pkts[k]!; if (p.on) packetStep(p, k, dt); }
  // counters
  const tg = totals.value;
  for (const key of ["orders", "revenue", "avg"] as const) {
    const d = tg[key] - shown[key];
    shown[key] = Math.abs(d) < (key === "avg" ? 0.005 : 0.5) ? tg[key] : shown[key] + d * Math.min(1, dt * 7);
  }
  raf = requestAnimationFrame(tick);
}
function start() {
  if (raf || reduced.value) return;
  last = performance.now();
  raf = requestAnimationFrame(tick);
}
function stop() { cancelAnimationFrame(raf); raf = 0; }

watch([inView, reduced], ([v, r]) => {
  if (v && !r) start(); else stop();
  if (v && !titleIn.value) titleIn.value = true;
});
watch(totals, (t) => { if (!raf) Object.assign(shown, t); });
watch(dashInView, (v) => {
  if (!v || drawn.value) return;
  if (!reduced.value) { shown.orders = 0; shown.revenue = 0; shown.avg = 0; }
  later(() => { drawn.value = true; }, 120);
});
watch(reduced, (r) => { if (r) { drawn.value = true; titleIn.value = true; Object.assign(shown, totals.value); } });
watch(narrow, () => nextTick(sample));

let ro: ResizeObserver | undefined;
onMounted(() => {
  nextTick(sample);
  if (stageEl.value) {
    ro = new ResizeObserver(([e]) => { const w = e?.contentRect.width ?? 1000; narrow.value = w < 640; });
    ro.observe(stageEl.value);
  }
  pushLog(200, `POST /auth-service/login → token for ${meOrg.value.id}`);
});
onBeforeUnmount(() => {
  stop();
  ro?.disconnect();
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
});
</script>

<template>
  <section id="snapshot" ref="root" class="world" :class="{ 'is-reduced': reduced, 'is-paused': !inView }" aria-labelledby="snapshot-title">
    <div class="bg" aria-hidden="true">
      <div class="glow g1" />
      <div class="glow g2" />
      <div class="glow g3" />
      <div class="gridlines" />
    </div>

    <div class="v2-container inner">
      <!-- ============ header ============ -->
      <header class="head">
        <div class="head-main">
          <p v-reveal class="v2-eyebrow eyebrow"><span class="rec" /> Product · data · SaaS</p>
          <div class="title-wrap" :class="{ developed: titleIn }">
            <span class="vf tl" /><span class="vf tr" /><span class="vf bl" /><span class="vf br" />
            <h2 id="snapshot-title" ref="titleEl" class="v2-h2 title" aria-label="Snapshot">
              <span v-for="(ch, i) in TITLE" :key="i" class="ch" :class="{ hot: i >= 4 }" :style="{ '--i': i, '--j': i - 4 }" aria-hidden="true">{{ ch }}</span>
            </h2>
            <div class="hud" aria-hidden="true">
              <span class="hud-rec">● REC</span>
              <span>v{{ latest.v }}</span>
              <span>f/1.8</span>
              <span>1/250s</span>
              <span>{{ latest.clock }}</span>
            </div>
          </div>
          <p v-reveal="120" class="v2-lede lede">
            A multi-tenant data workspace I designed and built end to end. Point it at MySQL, Postgres or MongoDB,
            save a query, and every run is captured as an immutable, <b>versioned snapshot</b>: diffable, schedulable and ready to
            chart. Every row, query and API key is fenced off by organization.
          </p>
          <ul v-reveal="200" class="chips" aria-label="Tech stack">
            <li v-for="c in CHIPS" :key="c" class="v2-chip">{{ c }}</li>
          </ul>
        </div>
        <ol class="facts">
          <li v-for="(f, i) in FACTS" :key="f.k" v-reveal="140 + i * 80" class="fact">
            <span class="fact-n">0{{ i + 1 }}</span>
            <span class="fact-k">{{ f.k }}</span>
            <span class="fact-v">{{ f.v }}</span>
          </li>
        </ol>
      </header>

      <!-- ============ pipeline ============ -->
      <div v-reveal class="panel stage-panel">
        <div class="panel-bar">
          <span class="pb-title"><span class="live-dot" /> connect → query → capture</span>
          <span class="pb-meta"><span class="ico" v-html="ICONS.refresh" /> auto-refresh · every 15 min</span>
        </div>
        <div ref="stageEl" class="stage" :class="{ narrow }" :style="flashPos">
          <svg :viewBox="`0 0 ${L.w} ${L.h}`" class="pipe" role="img" aria-label="Rows stream from MySQL, Postgres and MongoDB into a saved query, which captures them as versioned snapshots">
            <defs>
              <radialGradient id="snap-iris" cx="50%" cy="40%" r="70%">
                <stop offset="0" stop-color="#fff4ea" />
                <stop offset=".35" stop-color="#f9802e" />
                <stop offset=".8" stop-color="#ff4fa3" />
                <stop offset="1" stop-color="#3a1030" />
              </radialGradient>
              <linearGradient id="snap-card" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#1b1b22" />
                <stop offset="1" stop-color="#111116" />
              </linearGradient>
              <linearGradient id="snap-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#f9802e" />
                <stop offset="1" stop-color="#f9802e" stop-opacity=".25" />
              </linearGradient>
            </defs>

            <!-- flows -->
            <g v-for="(s, i) in SOURCES" :key="'f' + s.key" :class="['flow-g', { hl: hoverSrc === i }]" :style="{ '--c': s.color }">
              <path :ref="(el) => setSrcPath(el, i)" :d="L.paths[i]" class="flow" />
              <path :d="L.paths[i]" class="flow-dash" />
            </g>
            <path :ref="setOutPath" :d="L.out" class="flow out" />
            <path :d="L.out" class="flow-dash out" />

            <!-- sources -->
            <g
              v-for="(s, i) in SOURCES" :key="'s' + s.key" class="src" :class="{ hl: hoverSrc === i }"
              :transform="`translate(${sp(i).x} ${sp(i).y})`" :style="{ '--c': s.color }"
              tabindex="0" role="button" :aria-label="`Push a burst of rows from ${s.name}`"
              @mouseenter="hoverSrc = i" @mouseleave="hoverSrc = -1" @focus="hoverSrc = i" @blur="hoverSrc = -1"
              @click="burst(i)" @keydown.enter.prevent="burst(i)" @keydown.space.prevent="burst(i)"
            >
              <rect :x="-L.sb.w / 2" :y="-L.sb.h / 2" :width="L.sb.w" :height="L.sb.h" rx="14" class="src-box" />
              <g :transform="`translate(${-L.sb.w / 2 + (narrow ? 20 : 28)} 0)`" class="glyph">
                <template v-if="s.key === 'mongo'">
                  <path d="M0 -15 C9 -6 9 7 0 15 C-9 7 -9 -6 0 -15 Z" />
                  <path d="M0 -9 V18" />
                </template>
                <template v-else>
                  <ellipse cx="0" cy="-9" rx="11" ry="4" />
                  <path d="M-11 -9 V9 A11 4 0 0 0 11 9 V-9" />
                  <path d="M-11 0 A11 4 0 0 0 11 0" />
                </template>
              </g>
              <text :x="-L.sb.w / 2 + (narrow ? 36 : 52)" y="-2" class="src-name">{{ s.name }}</text>
              <text :x="-L.sb.w / 2 + (narrow ? 36 : 52)" y="15" class="src-sub">{{ narrow ? s.ver.split(' · ')[0] : s.ver }}</text>
              <circle :cx="L.sb.w / 2 - 12" :cy="-L.sb.h / 2 + 12" r="3" class="src-led" />
            </g>

            <!-- query / aperture -->
            <g class="qnode" :transform="`translate(${L.q.x} ${L.q.y})`">
              <circle :r="L.r + 26" class="q-halo" />
              <circle :r="L.r + 11" class="q-track" />
              <circle ref="ringEl" :r="L.r + 11" class="q-ring" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" transform="rotate(-90)" />
              <circle :r="L.r" class="q-body" />
              <polygon ref="irisEl" :points="hexPts(L.r * 0.44)" class="q-iris" />
              <g ref="bladesEl" class="q-blades">
                <g :transform="`scale(${L.r / 10.6}) translate(-12 -12)`">
                  <path d="m14.31 8 5.74 9.94" /><path d="M9.69 8h11.48" /><path d="m7.38 12 5.74-9.94" />
                  <path d="M9.69 16 3.95 6.06" /><path d="M14.31 16H2.83" /><path d="m16.62 12-5.74 9.94" />
                </g>
              </g>
            </g>
            <text :x="L.label.x" :y="L.label.y" class="q-label">SAVED QUERY</text>
            <text :x="L.label.x" :y="L.label.y + 18" class="q-sub">orders_by_region</text>

            <!-- particles -->
            <circle v-for="i in DOT_IDX" :key="'d' + i" :ref="(el) => setDot(el, i)" r="3.4" cx="-20" cy="-20" opacity="0" class="dot" />

            <!-- snapshot stack -->
            <text :x="L.stack.x + (narrow ? 0 : L.dx * 1.5)" :y="L.stack.y - L.card.h / 2 + L.dy * 4 - 14" class="stack-label">DATASET · VERSIONED SNAPSHOTS</text>
            <g
              v-for="{ c, i } in stackCards" :key="c.v" class="card-pos"
              :style="{ transform: `translate(${L.stack.x + i * L.dx}px, ${L.stack.y + i * L.dy}px) scale(${1 - i * 0.05})`, opacity: i > 3 ? 0 : 1 - i * 0.24 }"
              @click="selectV(c.v)"
            >
              <g class="card" :class="{ enter: c.v === lastShotV, sel: c.v === current.v, back: i > 0 }" :style="enterVars">
                <rect :x="-L.card.w / 2" :y="-L.card.h / 2" :width="L.card.w" :height="L.card.h" rx="12" class="card-bg" />
                <text :x="-L.card.w / 2 + 14" :y="-L.card.h / 2 + 25" class="card-t">orders_by_region</text>
                <rect :x="L.card.w / 2 - 52" :y="-L.card.h / 2 + 11" width="40" height="20" rx="10" class="card-badge" />
                <text :x="L.card.w / 2 - 32" :y="-L.card.h / 2 + 25" class="card-badge-t">v{{ c.v }}</text>
                <text :x="-L.card.w / 2 + 14" :y="-L.card.h / 2 + 44" class="card-m">{{ c.rows.length }} rows · #{{ c.hash }}</text>
                <rect v-for="(b, k) in cardBars(c)" :key="k" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="2" fill="url(#snap-bar)" />
                <circle :cx="-L.card.w / 2 + 18" :cy="L.card.h / 2 - 14" r="3.5" :fill="srcOf(c.source).color" />
                <text :x="-L.card.w / 2 + 27" :y="L.card.h / 2 - 10" class="card-m">{{ srcOf(c.source).short }} · {{ c.clock }}</text>
                <text :x="L.card.w / 2 - 14" :y="L.card.h / 2 - 10" class="card-m ok" text-anchor="end">✓ deduped</text>
              </g>
            </g>
          </svg>
          <div ref="flashEl" class="flash" aria-hidden="true" />
        </div>
        <div class="stage-foot">
          <code class="sql"><i>SELECT</i> region, <i>COUNT</i>(*) <i>AS</i> orders, <i>SUM</i>(total) <i>AS</i> revenue, status <i>FROM</i> orders <i>GROUP BY</i> region, status<b>;</b> <span class="ro">read-only ✓</span></code>
          <div class="stage-ctrl">
            <span class="buf"><span class="buf-bar"><span :style="{ width: (bufferShown / BATCH) * 100 + '%' }" /></span><b>{{ bufferShown }}</b>/{{ BATCH }} rows</span>
            <button type="button" class="btn-snap" @click="shoot()"><span class="ico" v-html="ICONS.camera" /> Capture snapshot</button>
          </div>
        </div>
        <p class="hint">Click a source to push a burst of rows · click a card to open that version</p>
      </div>

      <!-- ============ dashboard (browser frame) ============ -->
      <div ref="dashEl" v-reveal class="browser" :class="{ drawn }">
        <div class="chrome">
          <span class="lights"><i /><i /><i /></span>
          <span class="url"><span class="ico" v-html="ICONS.lock" />localhost:3000/dashboards/ops-overview</span>
          <span class="chrome-live"><span class="live-dot" />{{ follow ? 'live' : 'pinned' }}</span>
        </div>
        <div class="app">
          <aside class="side">
            <div class="side-logo"><span class="atom" v-html="ICONS.atom" /><span class="side-word">snapshot</span></div>
            <nav class="side-nav" aria-label="Snapshot app navigation (mockup)">
              <span v-for="n in NAV" :key="n.label" class="side-item" :class="{ on: n.active }"><span class="ico" v-html="ICONS[n.icon]" /><span class="side-lab">{{ n.label }}</span></span>
            </nav>
            <div class="side-foot"><span class="ico" v-html="ICONS.panel" /></div>
          </aside>
          <div class="main">
            <div class="topbar">
              <div class="crumbs"><span class="muted">Dashboards /</span> <b>Ops overview</b></div>
              <div class="tb-right">
                <div class="stepper">
                  <button type="button" aria-label="Previous version" :disabled="sel <= winStart" @click="selectIdx(sel - 1)"><span class="ico" v-html="ICONS.left" /></button>
                  <span class="stepper-v"><span class="muted hide-sm">orders_by_region ·</span> v{{ current.v }}</span>
                  <button type="button" aria-label="Next version" :disabled="sel >= versions.length - 1" @click="selectIdx(sel + 1)"><span class="ico" v-html="ICONS.right" /></button>
                </div>
                <span class="trial hide-md">Trial · 2 days left</span>
                <span class="btn-primary hide-sm"><span class="ico" v-html="ICONS.plus" />Add widget</span>
              </div>
            </div>
            <div class="widgets">
              <div class="w stat"><h4>Total orders</h4><div class="stat-v">{{ fmt(shown.orders) }}</div><span class="stat-s">sum(orders)</span></div>
              <div class="w stat"><h4>Revenue</h4><div class="stat-v">{{ money(shown.revenue) }}</div><span class="stat-s">sum(revenue)</span></div>
              <div class="w stat"><h4>Avg order value</h4><div class="stat-v">${{ shown.avg.toFixed(2) }}</div><span class="stat-s">avg(revenue / orders)</span></div>

              <div class="w line">
                <h4>Revenue across snapshots <span class="muted">· last {{ series.length }} versions</span></h4>
                <svg ref="lineSvg" :viewBox="`0 0 ${CW} ${CH}`" class="line-svg" @pointermove="lineMove" @pointerleave="hoverI = -1">
                  <defs>
                    <linearGradient id="snap-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#f9802e" stop-opacity=".38" />
                      <stop offset="1" stop-color="#f9802e" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                  <g v-for="(g, k) in chart.grid" :key="k">
                    <line :x1="PL" :x2="CW - PR" :y1="g.y" :y2="g.y" class="grid-l" />
                    <text :x="PL - 8" :y="g.y + 4" class="axis-t" text-anchor="end">{{ g.label }}</text>
                  </g>
                  <text v-for="(lab, k) in chart.labels" :key="'x' + k" :x="chart.pts[k]?.x" :y="CH - 6" class="axis-t" text-anchor="middle">{{ lab }}</text>
                  <path :d="chart.area" class="area" fill="url(#snap-area)" />
                  <path :d="chart.d" class="ln" pathLength="1" />
                  <circle v-for="(p, k) in chart.pts" :key="'p' + k" :cx="p.x" :cy="p.y" :r="k === chart.pts.length - 1 ? 4.5 : 2.6" class="pt" :class="{ last: k === chart.pts.length - 1 }" :style="{ '--k': k }" />
                  <g v-if="hoverI >= 0 && chart.pts[hoverI]" class="tip">
                    <line :x1="chart.pts[hoverI]!.x" :x2="chart.pts[hoverI]!.x" :y1="PT" :y2="CH - PB" class="cross" />
                    <rect :x="Math.min(chart.pts[hoverI]!.x + 8, CW - 112)" :y="Math.max(PT, chart.pts[hoverI]!.y - 40)" width="104" height="34" rx="5" class="tip-bg" />
                    <text :x="Math.min(chart.pts[hoverI]!.x + 16, CW - 104)" :y="Math.max(PT, chart.pts[hoverI]!.y - 40) + 14" class="tip-k">{{ chart.labels[hoverI] }}</text>
                    <text :x="Math.min(chart.pts[hoverI]!.x + 16, CW - 104)" :y="Math.max(PT, chart.pts[hoverI]!.y - 40) + 28" class="tip-v">{{ money(chart.values[hoverI] ?? 0) }}</text>
                  </g>
                </svg>
              </div>

              <div class="w pie">
                <h4>Orders by status</h4>
                <div class="pie-body">
                  <svg viewBox="0 0 120 120" class="pie-svg">
                    <circle cx="60" cy="60" r="38" class="pie-track" />
                    <circle
                      v-for="s in donut" :key="s.k" cx="60" cy="60" r="38" pathLength="100" class="pie-seg"
                      :stroke="s.color" :stroke-dasharray="drawn ? `${Math.max(0, s.pct - 0.8)} ${100 - Math.max(0, s.pct - 0.8)}` : '0 100'"
                      :stroke-dashoffset="drawn ? -s.off : 0" transform="rotate(-90 60 60)"
                    />
                    <text x="60" y="58" class="pie-c">{{ Math.round(donut[0]?.pct ?? 0) }}%</text>
                    <text x="60" y="73" class="pie-cs">paid</text>
                  </svg>
                  <ul class="legend">
                    <li v-for="s in donut" :key="s.k"><i :style="{ background: s.color }" />{{ s.k }}<b>{{ fmt(s.n) }}</b></li>
                  </ul>
                </div>
              </div>

              <div class="w bars">
                <h4>Orders by region</h4>
                <div class="bar-area">
                  <div v-for="(b, k) in bars.rows" :key="b.id" class="bar-col" :style="{ '--k': k }">
                    <span class="bar-v">{{ b.v }}</span>
                    <span class="bar" :style="{ height: b.pct + '%' }" />
                    <span class="bar-l">{{ b.id }}</span>
                  </div>
                </div>
              </div>

              <div class="w tbl">
                <h4>Top regions <span class="muted">· sum(revenue)</span></h4>
                <table>
                  <thead><tr><th>region</th><th>sum(revenue)</th></tr></thead>
                  <tbody>
                    <tr v-for="r in topRows" :key="r.id">
                      <td>{{ r.id }}</td>
                      <td><span class="tbar" :style="{ width: r.pct + '%' }" /><span class="tnum">{{ money(r.revenue) }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ history + tenants ============ -->
      <div class="duo">
        <div v-reveal class="panel hist">
          <div class="panel-bar">
            <span class="pb-title">Version history</span>
            <button type="button" class="live-btn" :class="{ on: follow }" @click="goLive"><span class="live-dot" />{{ follow ? 'Following live' : 'Jump to live' }}</button>
          </div>
          <div
            ref="tlEl" class="tl" role="slider" tabindex="0" aria-label="Snapshot version"
            :aria-valuemin="ticks[0]?.v" :aria-valuemax="latest.v" :aria-valuenow="current.v" :aria-valuetext="`version ${current.v}`"
            @pointerdown="tlDown" @pointermove="tlMove" @pointerup="tlUp" @pointercancel="tlUp" @keydown="tlKey"
          >
            <div class="tl-rail"><div class="tl-fill" :style="{ width: handlePct + '%' }" /></div>
            <div class="tl-in">
            <span v-for="(t, i) in ticks" :key="t.v" class="tl-tick" :class="{ past: i + winStart <= sel, fresh: t.v === lastShotV }" :style="{ left: tickPct(i) + '%', '--c': srcOf(t.source).color }" />
            <div class="tl-handle" :style="{ left: handlePct + '%' }"><span>v{{ current.v }}</span></div>
            </div>
            <span class="tl-end l">v{{ ticks[0]?.v }}</span>
            <span class="tl-end r">v{{ latest.v }}</span>
          </div>
          <div class="diff-head">
            <span class="vchip">v{{ previous?.v ?? '∅' }}</span><span class="arrow">→</span><span class="vchip on">v{{ current.v }}</span>
            <span class="ds add">+{{ diffStats.added }}</span><span class="ds rem">−{{ diffStats.removed }}</span><span class="ds chg">~{{ diffStats.changed }}</span>
            <span class="hash">{{ current.clock }} · #{{ current.hash }}</span>
          </div>
          <div class="diff-wrap">
            <table class="diff">
              <thead><tr><th /><th>region</th><th>orders</th><th>revenue</th><th>status</th></tr></thead>
              <tbody>
                <tr v-for="d in diff" :key="current.v + '-' + d.id" :class="d.kind">
                  <td class="sign">{{ d.kind === 'added' ? '+' : d.kind === 'removed' ? '−' : d.kind === 'changed' ? '~' : '' }}</td>
                  <td>{{ d.id }}</td>
                  <td :class="{ cell: d.ch.orders }"><s v-if="d.ch.orders">{{ d.old?.orders }}</s>{{ d.row.orders }}</td>
                  <td :class="{ cell: d.ch.revenue }"><s v-if="d.ch.revenue">{{ kfmt(d.old?.revenue ?? 0) }}</s>{{ kfmt(d.row.revenue) }}</td>
                  <td :class="{ cell: d.ch.status }"><span class="st" :style="{ '--c': STATUS_COLOR[d.row.status] }">{{ d.row.status }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="schema"><span>schema</span> region:string · orders:int · revenue:float · status:enum</p>
        </div>

        <div v-reveal="120" class="panel ten">
          <div class="panel-bar">
            <span class="pb-title">Tenant isolation</span>
            <span class="pb-meta">every query filtered by orgId</span>
          </div>
          <svg viewBox="0 0 420 300" class="ten-svg" role="img" aria-label="Requests carry an orgId in the JWT; the API only routes them to that organization's data">
            <path d="M70 150 H168" class="t-line" />
            <path v-for="(o, i) in ORGS" :key="'l' + o.id" :d="`M190 150 C220 150 228 ${ORG_Y[i]} 262 ${ORG_Y[i]}`" class="t-line" :class="{ mine: i === me }" :style="{ '--c': o.color }" />
            <g class="client">
              <rect x="22" y="126" width="48" height="34" rx="5" class="t-node" :style="{ stroke: meOrg.color }" />
              <path d="M16 166 H76" class="t-node-l" />
              <text x="46" y="148" class="t-ic" :style="{ fill: meOrg.color }">JWT</text>
              <text x="46" y="186" class="t-cap">you</text>
            </g>
            <g ref="gateEl" class="gate">
              <path d="M168 116 L196 126 V150 C196 168 184 180 168 186 C152 180 140 168 140 150 V126 Z" class="t-shield" transform="translate(11 0)" />
              <text x="179" y="156" class="t-ic">API</text>
              <text x="179" y="206" class="t-cap">requireAuth</text>
              <text x="179" y="220" class="t-cap dim">scope by orgId</text>
              <text ref="denyEl" x="179" y="108" class="t-deny" opacity="0">404</text>
            </g>
            <g v-for="(o, i) in ORGS" :key="o.id" class="org" :class="{ mine: i === me }" :style="{ '--c': o.color }" tabindex="0" role="button" :aria-label="`Sign in to ${o.name}`" @click="signIn(i)" @keydown.enter.prevent="signIn(i)" @keydown.space.prevent="signIn(i)">
              <rect x="262" :y="(ORG_Y[i] ?? 0) - 38" width="146" height="76" rx="12" class="org-bg" />
              <rect :ref="(el) => setOrgGlow(el, i)" x="262" :y="(ORG_Y[i] ?? 0) - 38" width="146" height="76" rx="12" class="org-glow" opacity="0" />
              <text x="276" :y="(ORG_Y[i] ?? 0) - 16" class="org-n">{{ o.name }}</text>
              <text x="276" :y="(ORG_Y[i] ?? 0) + 2" class="org-m">{{ orgSnaps[i] }} snapshots</text>
              <circle v-for="(u, k) in o.users" :key="k" :cx="282 + k * 13" :cy="(ORG_Y[i] ?? 0) + 20" r="4.5" :fill="ROLE_COLOR[u]" class="org-u" />
              <text x="398" :y="(ORG_Y[i] ?? 0) - 16" class="org-id" text-anchor="end">{{ i === me ? 'signed in' : '' }}</text>
            </g>
            <circle v-for="i in PKT_IDX" :key="'k' + i" :ref="(el) => setPkt(el, i)" r="5" cx="-20" cy="-20" opacity="0" class="pkt" />
          </svg>
          <div class="roles">
            <span v-for="r in ['owner', 'admin', 'editor', 'viewer']" :key="r"><i :style="{ background: ROLE_COLOR[r] }" />{{ r }}</span>
          </div>
          <pre class="jwt" aria-label="Decoded token"><span class="c">// decoded JWT</span>
{ <span class="k">"sub"</span>: <span class="s">"{{ USERS[me] }}"</span>, <span class="k">"role"</span>: <span class="s">"{{ ROLES[me] }}"</span>, <span class="k">"orgId"</span>: <span class="s" :style="{ color: meOrg.color }">"{{ meOrg.id }}"</span> }</pre>
          <ul class="log" aria-live="off">
            <li v-for="l in log" :key="l.id" :class="{ bad: l.code >= 400 }"><b>{{ l.code }}</b>{{ l.text }}</li>
          </ul>
          <p class="hint">Click an organization to sign in as it</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.world {
  --snap: #f9802e;
  --n950: #0a0a0a; --n900: #171717; --n800: #262626; --n400: #a3a3a3;
  position: relative; isolation: isolate; overflow: clip;
  min-height: 100vh; padding-block: clamp(80px, 12vw, 160px);
  background: var(--bg); color: var(--text);
}
.ico { display: inline-flex; width: 16px; height: 16px; flex: none; }
.ico { line-height: 0; }
.muted { color: var(--muted); font-weight: 400; }
b { font-weight: 600; }

/* ---------- background ---------- */
.bg { position: absolute; inset: 0; z-index: -1; pointer-events: none;
  mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent); }
.glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: .55; }
.g1 { width: 46vw; height: 46vw; left: -12vw; top: 2%; background: radial-gradient(circle, rgba(249,128,46,.32), transparent 65%); }
.g2 { width: 42vw; height: 42vw; right: -14vw; top: 30%; background: radial-gradient(circle, rgba(139,92,246,.28), transparent 65%); }
.g3 { width: 50vw; height: 40vw; left: 20%; bottom: 4%; background: radial-gradient(circle, rgba(255,79,163,.16), transparent 65%); }
.gridlines { position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 56px 56px; mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000, transparent); }

.inner { display: flex; flex-direction: column; gap: clamp(28px, 4vw, 48px); }
.inner > * { min-width: 0; }

/* ---------- head ---------- */
.head { display: grid; gap: clamp(24px, 3vw, 40px); min-width: 0; }
.head-main { min-width: 0; }
.eyebrow { display: inline-flex; align-items: center; gap: 10px; margin: 0; color: var(--snap); }
.rec { width: 8px; height: 8px; border-radius: 50%; background: var(--snap); box-shadow: 0 0 12px var(--snap); animation: blink 1.6s steps(2, start) infinite; }
@keyframes blink { 50% { opacity: .25; } }

.title-wrap { position: relative; display: inline-block; padding: 18px 26px 34px; margin: 10px 0 6px -26px; max-width: calc(100% + 26px); }
.title { font-size: clamp(38px, 12.4vw, 188px); margin: 0; line-height: .95; letter-spacing: -0.045em; white-space: nowrap; }
.ch { display: inline-block; color: var(--text); opacity: 0; filter: blur(14px) grayscale(1) brightness(2.4); transform: translateY(.18em) scale(1.08);
  transition: opacity .9s var(--ease-out), filter 1.6s var(--ease-out), transform 1.1s var(--ease-out); transition-delay: calc(var(--i) * 70ms + 120ms); }
.ch.hot { background: linear-gradient(95deg, #ffd0ad, var(--snap) 35%, var(--pink) 70%, var(--gold)); background-size: 400% 100%;
  background-position: calc(var(--j) * 33.3%) 0; -webkit-background-clip: text; background-clip: text; color: transparent; }
.developed .ch, .is-reduced .ch { opacity: 1; filter: none; transform: none; }
.vf { position: absolute; width: 22px; height: 22px; border: 2px solid rgba(255,255,255,.55); opacity: 0; transition: opacity .6s .9s, transform .9s .9s var(--ease-out); }
.vf.tl { left: 0; top: 0; border-right: 0; border-bottom: 0; transform: translate(-10px, -10px); }
.vf.tr { right: 0; top: 0; border-left: 0; border-bottom: 0; transform: translate(10px, -10px); }
.vf.bl { left: 0; bottom: 0; border-right: 0; border-top: 0; transform: translate(-10px, 10px); }
.vf.br { right: 0; bottom: 0; border-left: 0; border-top: 0; transform: translate(10px, 10px); }
.developed .vf, .is-reduced .vf { opacity: 1; transform: none; }
.hud { position: absolute; left: 26px; right: 26px; bottom: 6px; display: flex; gap: 14px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 11px; color: var(--muted); letter-spacing: .08em; opacity: 0; transition: opacity .8s 1.2s; }
.developed .hud, .is-reduced .hud { opacity: 1; }
.hud-rec { color: var(--snap); }
.lede { margin: 14px 0 0; }
.lede b { color: var(--text); font-weight: 600; }
.chips { list-style: none; padding: 0; margin: 22px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
.facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
@media (min-width: 560px) { .facts { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1080px) { .facts { grid-template-columns: repeat(4, 1fr); } }
.fact { display: grid; grid-template-columns: auto 1fr; column-gap: 14px; padding: 16px 18px; background: #0f0f15; }
.fact-n { grid-row: span 2; font-family: var(--font-mono); font-size: 11px; color: var(--snap); padding-top: 5px; }
.fact-k { font-family: var(--font-display); font-weight: 600; font-size: 15px; }
.fact-v { color: var(--text-2); font-size: 14px; line-height: 1.5; margin-top: 4px; }

/* ---------- panels ---------- */
.panel { position: relative; border: 1px solid var(--border); border-radius: var(--radius-lg); background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.015)); backdrop-filter: blur(6px); padding: clamp(14px, 2vw, 22px); min-width: 0; }
.panel-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.pb-title { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--text); }
.pb-meta { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
.pb-meta .ico { width: 13px; height: 13px; }
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 10px var(--mint); animation: pulse 2s ease-in-out infinite; flex: none; }
@keyframes pulse { 50% { opacity: .35; } }
.hint { margin: 10px 0 0; font-family: var(--font-mono); font-size: 11px; color: var(--muted); }

/* ---------- pipeline ---------- */
.stage { position: relative; }
.pipe { display: block; width: 100%; height: auto; overflow: visible; }
.flow { fill: none; stroke: var(--c, var(--snap)); stroke-opacity: .16; stroke-width: 2; transition: stroke-opacity .3s, stroke-width .3s; }
.flow.out { stroke: var(--snap); stroke-opacity: .25; }
.flow-dash { fill: none; stroke: var(--c, var(--snap)); stroke-opacity: .55; stroke-width: 1.4; stroke-dasharray: 2 14; animation: dash 1.4s linear infinite; }
.flow-dash.out { stroke: var(--snap); }
.flow-g.hl .flow { stroke-opacity: .55; stroke-width: 4; }
@keyframes dash { to { stroke-dashoffset: -16; } }
.is-paused .flow-dash, .is-reduced .flow-dash { animation-play-state: paused; }
.src { cursor: pointer; outline: none; }
.src-box { fill: #121219; stroke: var(--c); stroke-opacity: .35; stroke-width: 1.2; transition: stroke-opacity .25s, fill .25s; }
.src.hl .src-box { stroke-opacity: 1; fill: #17171f; }
.src:focus-visible .src-box { stroke-width: 2.5; }
.glyph { fill: none; stroke: var(--c); stroke-width: 1.8; stroke-linecap: round; }
.src-name { fill: var(--text); font-family: var(--font-sans); font-weight: 700; font-size: 15px; }
.src-sub { fill: var(--muted); font-family: var(--font-mono); font-size: 11px; }
.src-led { fill: var(--c); animation: pulse 1.2s ease-in-out infinite; }
.q-halo { fill: rgba(249,128,46,.06); stroke: rgba(249,128,46,.12); stroke-dasharray: 3 7; animation: spin 30s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.is-paused .q-halo, .is-reduced .q-halo, .is-paused .src-led, .is-reduced .src-led { animation-play-state: paused; }
.q-track { fill: none; stroke: rgba(255,255,255,.08); stroke-width: 4; }
.q-ring { fill: none; stroke: var(--snap); stroke-width: 4; stroke-linecap: round; filter: drop-shadow(0 0 6px rgba(249,128,46,.7)); }
.q-body { fill: #0d0d12; stroke: rgba(255,255,255,.14); stroke-width: 1.5; }
.q-iris { fill: url(#snap-iris); transform-box: fill-box; transform-origin: center; }
.q-blades { fill: none; stroke: rgba(255,255,255,.6); stroke-width: 1.4; stroke-linecap: round; transform-box: view-box; transform-origin: 0 0; }
.q-blades path { vector-effect: non-scaling-stroke; }
.q-label { fill: var(--snap); font-family: var(--font-mono); font-size: 11px; letter-spacing: .2em; text-anchor: middle; }
.q-sub { fill: var(--text); font-family: var(--font-mono); font-size: 14px; text-anchor: middle; }
.dot { pointer-events: none; }
.stack-label { fill: var(--muted); font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .16em; text-anchor: middle; }
.card-pos { transition: transform .7s var(--ease-out), opacity .7s; cursor: pointer; }
.card-bg { fill: url(#snap-card); stroke: rgba(255,255,255,.12); stroke-width: 1; }
.card.back > :not(.card-bg) { opacity: 0; }
.card > * { transition: opacity .5s; }
.card.sel .card-bg { stroke: var(--snap); stroke-width: 1.6; }
.card.enter { animation: develop 1s var(--ease-out) both; }
@keyframes develop {
  0% { transform: translate(var(--fx), var(--fy)) scale(.25); opacity: 0; filter: brightness(4) blur(4px); }
  45% { opacity: 1; }
  100% { transform: none; opacity: 1; filter: none; }
}
.card-t { fill: var(--text); font-family: var(--font-sans); font-weight: 700; font-size: 14px; }
.card-badge { fill: var(--snap); }
.card-badge-t { fill: #1a0d04; font-family: var(--font-mono); font-weight: 600; font-size: 11.5px; text-anchor: middle; }
.card-m { fill: var(--muted); font-family: var(--font-mono); font-size: 10.5px; }
.card-m.ok { fill: var(--mint); }
.flash { position: absolute; inset: -20px; pointer-events: none; opacity: 0; mix-blend-mode: screen; border-radius: var(--radius-lg);
  background: radial-gradient(circle at var(--qx) var(--qy), rgba(255,255,255,.95), rgba(255,214,180,.4) 14%, rgba(249,128,46,.08) 40%, transparent 65%); }
.stage-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
.sql { font-family: var(--font-mono); font-size: 12.5px; color: var(--text-2); line-height: 1.6; min-width: 0; flex: 1 1 380px; }
.sql i { font-style: normal; color: var(--violet); filter: brightness(1.35); }
.sql b { color: var(--muted); }
.ro { margin-left: 8px; color: var(--mint); font-size: 11px; white-space: nowrap; }
.stage-ctrl { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.buf { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
.buf b { color: var(--text); }
.buf-bar { width: 64px; height: 4px; border-radius: 4px; background: rgba(255,255,255,.08); overflow: hidden; }
.buf-bar span { display: block; height: 100%; background: var(--snap); transition: width .15s; }
.btn-snap { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 10px; border: 0; cursor: pointer;
  background: var(--snap); color: #1a0d04; font: 600 14px var(--font-sans); box-shadow: 0 6px 24px -6px rgba(249,128,46,.7); transition: transform .2s var(--ease-out), box-shadow .2s; }
.btn-snap:hover { transform: translateY(-1px); box-shadow: 0 10px 30px -6px rgba(249,128,46,.9); }
.btn-snap:active { transform: scale(.97); }
.btn-snap:focus-visible, .live-btn:focus-visible, .stepper button:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }

/* ---------- browser / dashboard ---------- */
.browser { border-radius: var(--radius-lg); border: 1px solid rgba(255,255,255,.12); background: var(--n950); overflow: hidden; min-width: 0;
  box-shadow: 0 40px 120px -40px rgba(249,128,46,.35), 0 30px 80px -30px rgba(0,0,0,.9); }
.chrome { display: flex; align-items: center; gap: 12px; height: 42px; padding: 0 14px; background: #121214; border-bottom: 1px solid var(--n800); }
.lights { display: flex; gap: 7px; flex: none; }
.lights i { width: 11px; height: 11px; border-radius: 50%; background: #3a3a40; }
.lights i:nth-child(1) { background: #ff5f57; } .lights i:nth-child(2) { background: #febc2e; } .lights i:nth-child(3) { background: #28c840; }
.url { flex: 1; min-width: 0; max-width: 460px; margin-inline: auto; display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 7px; background: #1c1c1f;
  color: var(--n400); font-family: var(--font-mono); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.url .ico { width: 12px; height: 12px; }
.chrome-live { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11px; color: var(--n400); flex: none; }
.app { display: flex; min-height: 560px; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.side { width: 210px; flex: none; display: flex; flex-direction: column; background: var(--n900); border-right: 1px solid var(--n800); }
.side-logo { height: 56px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border-bottom: 1px solid var(--n800); font-family: monospace; font-weight: 700; font-size: 18px; }
.atom { width: 34px; height: 34px; flex: none; display: grid; place-items: center; border: 1px solid var(--n800); border-radius: 8px; color: var(--snap); }
.atom :deep(svg) { width: 20px; height: 20px; animation: spin 14s linear infinite; }
.is-paused .atom :deep(svg), .is-reduced .atom :deep(svg) { animation-play-state: paused; }
.side-nav { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 12px 8px; }
.side-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 6px; font-size: 14px; color: #e5e5e5; }
.side-item.on { background: var(--n800); color: #fafafa; font-weight: 500; }
.side-foot { padding: 8px; border-top: 1px solid var(--n800); display: flex; justify-content: flex-end; color: var(--n400); }
.side-foot .ico { margin: 10px; }
.ico :deep(svg), .atom :deep(svg) { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.ico :deep(svg) { width: 100%; height: 100%; }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.topbar { height: 56px; flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 20px; border-bottom: 1px solid var(--n800); }
.crumbs { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.tb-right { display: flex; align-items: center; gap: 10px; flex: none; }
.stepper { display: flex; align-items: center; height: 32px; border: 1px solid var(--n800); border-radius: 6px; font-family: var(--font-mono); font-size: 12px; }
.stepper button { display: grid; place-items: center; width: 28px; height: 100%; background: none; border: 0; color: #e5e5e5; cursor: pointer; }
.stepper button:disabled { opacity: .3; cursor: default; }
.stepper button .ico { width: 14px; height: 14px; }
.stepper-v { padding: 0 6px; color: var(--snap); white-space: nowrap; }
.trial { font-size: 12px; padding: 3px 9px; border-radius: 999px; background: rgba(249,128,46,.12); color: var(--snap); white-space: nowrap; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 6px; background: var(--snap); color: #fff; font-size: 13px; font-weight: 500; white-space: nowrap; }
.btn-primary .ico { width: 14px; height: 14px; }
.widgets { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; padding: 20px; }
.w { border: 1px solid var(--n800); background: var(--n900); border-radius: 8px; padding: 16px; min-width: 0; display: flex; flex-direction: column; }
.w h4 { margin: 0 0 8px; font-size: 14px; font-weight: 500; color: #fafafa; }
.stat { grid-column: span 2; }
.stat-v { font-size: clamp(26px, 3vw, 36px); font-weight: 700; letter-spacing: -.02em; font-variant-numeric: tabular-nums; color: #fafafa; }
.stat-s { margin-top: 4px; font-family: var(--font-mono); font-size: 11px; color: var(--n400); }
.line { grid-column: span 4; }
.pie { grid-column: span 2; }
.bars { grid-column: span 3; }
.tbl { grid-column: span 3; }
.line-svg { width: 100%; height: auto; display: block; touch-action: pan-y; cursor: crosshair; overflow: visible; }
.grid-l { stroke: var(--n800); stroke-width: 1; }
.axis-t { fill: #8a8a8a; font-size: 10.5px; font-family: var(--font-mono); }
.ln { fill: none; stroke: var(--snap); stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 1.8s var(--ease-out); }
.area { opacity: 0; transition: opacity 1s .9s; }
.pt { fill: var(--n900); stroke: var(--snap); stroke-width: 2; opacity: 0; transition: opacity .4s; transition-delay: calc(.4s + var(--k) * 90ms); }
.pt.last { fill: var(--snap); filter: drop-shadow(0 0 6px var(--snap)); }
.drawn .ln { stroke-dashoffset: 0; }
.drawn .area, .drawn .pt { opacity: 1; }
.cross { stroke: #555; stroke-dasharray: 3 3; }
.tip-bg { fill: rgba(250,250,250,.96); }
.tip-k { fill: #666; font-size: 10.5px; font-family: var(--font-mono); }
.tip-v { fill: #111; font-size: 12.5px; font-weight: 700; font-family: var(--font-sans); }
.pie-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.pie-svg { width: min(100%, 150px); height: auto; }
.pie-track { fill: none; stroke: var(--n800); stroke-width: 18; }
.pie-seg { fill: none; stroke-width: 18; transition: stroke-dasharray 1.2s var(--ease-out), stroke-dashoffset 1.2s var(--ease-out); }
.pie-c { fill: #fafafa; font-size: 18px; font-weight: 700; text-anchor: middle; }
.pie-cs { fill: var(--n400); font-size: 9px; text-anchor: middle; font-family: var(--font-mono); }
.legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 12px; font-size: 12px; color: var(--n400); }
.legend li { display: inline-flex; align-items: center; gap: 5px; }
.legend i { width: 10px; height: 10px; border-radius: 2px; }
.legend b { color: #e5e5e5; font-weight: 500; font-variant-numeric: tabular-nums; }
.bar-area { flex: 1; min-height: 190px; display: flex; align-items: stretch; gap: 8px; padding-top: 6px; border-bottom: 1px solid var(--n800); }
.bar-col { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; position: relative; padding-bottom: 20px; }
.bar { width: min(100%, 34px); border-radius: 3px 3px 0 0; background: linear-gradient(180deg, #6f8de8, #5470c6); transform-origin: bottom; transform: scaleY(0);
  transition: height .8s var(--ease-out), transform 1s var(--ease-out); transition-delay: 0s, calc(.2s + var(--k) * 70ms); }
.drawn .bar { transform: scaleY(1); }
.bar-v { font-size: 10.5px; color: var(--n400); font-variant-numeric: tabular-nums; font-family: var(--font-mono); }
.bar-l { position: absolute; bottom: 0; font-size: 10px; color: #8a8a8a; white-space: nowrap; font-family: var(--font-mono); max-width: 100%; overflow: hidden; text-overflow: clip; }
.tbl table { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; color: #8a8a8a; font-weight: 500; padding: 4px 8px 6px 0; font-family: var(--font-mono); font-size: 11.5px; }
.tbl td { padding: 7px 8px 7px 0; border-top: 1px solid var(--n800); color: #e5e5e5; }
.tbl td:last-child { position: relative; width: 62%; }
.tbar { position: absolute; left: 0; top: 6px; bottom: 6px; border-radius: 3px; background: rgba(249,128,46,.16); transition: width .8s var(--ease-out); }
.tnum { position: relative; font-variant-numeric: tabular-nums; padding-left: 8px; }

/* ---------- history + tenants ---------- */
.duo { display: grid; gap: clamp(20px, 3vw, 32px); }
@media (min-width: 1000px) { .duo { grid-template-columns: 1.2fr 1fr; } }
.live-btn { display: inline-flex; align-items: center; gap: 7px; height: 28px; padding: 0 11px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface);
  color: var(--text-2); font-family: var(--font-mono); font-size: 11.5px; cursor: pointer; }
.live-btn:not(.on) .live-dot { background: var(--muted); box-shadow: none; animation: none; }
.live-btn.on { color: var(--mint); border-color: rgba(60,240,185,.3); }
.tl { position: relative; height: 74px; margin: 6px 0 8px; padding: 0 14px; cursor: grab; touch-action: none; outline: none; user-select: none; }
.tl:active { cursor: grabbing; }
.tl:focus-visible { outline: 2px solid var(--snap); outline-offset: 2px; border-radius: 10px; }
.tl-rail { position: absolute; left: 14px; right: 14px; top: 38px; height: 4px; border-radius: 4px; background: rgba(255,255,255,.08); }
.tl-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, rgba(249,128,46,.2), var(--snap)); transition: width .35s var(--ease-out); }
.tl-in { position: absolute; left: 14px; right: 14px; top: 0; bottom: 0; pointer-events: none; }
.tl-tick { position: absolute; top: 34px; width: 12px; height: 12px; margin-left: -6px; border-radius: 3px; background: #1a1a22; border: 1.5px solid var(--c); transform: rotate(45deg); transition: background .3s; }
.tl-tick.past { background: var(--c); }
.tl-tick.fresh { animation: pop .8s var(--ease-out); }
@keyframes pop { 0% { transform: rotate(45deg) scale(2.2); box-shadow: 0 0 0 6px rgba(249,128,46,.4); } 100% { transform: rotate(45deg) scale(1); } }
.tl-handle { position: absolute; top: 0; width: 0; transition: left .35s var(--ease-out); }
.tl-handle span { position: absolute; left: 0; top: 2px; translate: -50% 0; padding: 3px 9px; border-radius: 7px; background: var(--snap); color: #1a0d04; font: 600 12px var(--font-mono); white-space: nowrap; box-shadow: 0 4px 18px -4px rgba(249,128,46,.8); }
.tl-handle::after { content: ""; position: absolute; left: -1px; top: 26px; width: 2px; height: 26px; background: var(--snap); }
.tl-end { position: absolute; bottom: 0; font-family: var(--font-mono); font-size: 10.5px; color: var(--muted); }
.tl-end.l { left: 6px; } .tl-end.r { right: 6px; }
.diff-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 6px 0 10px; font-family: var(--font-mono); font-size: 12px; }
.vchip { padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border); color: var(--text-2); }
.vchip.on { border-color: var(--snap); color: var(--snap); }
.arrow { color: var(--muted); }
.ds { padding: 2px 7px; border-radius: 6px; }
.ds.add { color: var(--mint); background: rgba(60,240,185,.1); }
.ds.rem { color: var(--pink); background: rgba(255,79,163,.1); }
.ds.chg { color: var(--gold); background: rgba(242,201,76,.1); }
.hash { margin-left: auto; color: var(--muted); }
.diff-wrap { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.diff { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 12.5px; font-variant-numeric: tabular-nums; }
.diff th { text-align: left; font-weight: 400; color: var(--muted); padding: 8px 10px; background: rgba(255,255,255,.03); font-size: 11px; }
.diff td { padding: 7px 10px; border-top: 1px solid var(--border); color: var(--text-2); white-space: nowrap; }
.diff td.sign { width: 14px; padding-right: 0; font-weight: 600; }
.diff tr { animation: rowin .6s var(--ease-out) both; }
@keyframes rowin { from { opacity: 0; transform: translateX(-6px); } }
.diff tr.added { background: rgba(60,240,185,.07); } .diff tr.added td { color: var(--mint); }
.diff tr.removed { background: rgba(255,79,163,.07); } .diff tr.removed td { color: var(--pink); text-decoration: line-through; text-decoration-color: rgba(255,79,163,.5); }
.diff tr.removed td.sign { text-decoration: none; }
.diff tr.changed td.sign { color: var(--gold); }
.diff td.cell { color: var(--gold); background: rgba(242,201,76,.08); animation: cellflash 1.2s var(--ease-out); }
@keyframes cellflash { from { background: rgba(242,201,76,.45); } }
.diff s { color: var(--muted); margin-right: 6px; font-size: 11px; }
.st { color: var(--c); }
.schema { margin: 10px 0 0; font-family: var(--font-mono); font-size: 11.5px; color: var(--muted); overflow-wrap: anywhere; }
.schema span { color: var(--snap); margin-right: 6px; }

.ten-svg { display: block; width: 100%; height: auto; }
.t-line { fill: none; stroke: rgba(255,255,255,.12); stroke-width: 1.5; stroke-dasharray: 4 5; }
.t-line.mine { stroke: var(--c); stroke-opacity: .7; stroke-dasharray: none; }
.t-node { fill: #121219; stroke-width: 1.5; transition: stroke .4s; }
.t-node-l { stroke: rgba(255,255,255,.3); stroke-width: 3; stroke-linecap: round; }
.t-ic { fill: var(--text); font: 600 11px var(--font-mono); text-anchor: middle; transition: fill .4s; }
.t-cap { fill: var(--text-2); font: 11px var(--font-mono); text-anchor: middle; }
.t-cap.dim { fill: var(--muted); font-size: 10px; }
.t-shield { fill: #121219; stroke: var(--mint); stroke-width: 1.5; }
.t-deny { fill: #ff5d6c; font: 700 14px var(--font-mono); text-anchor: middle; }
.org { cursor: pointer; outline: none; }
.org-bg { fill: #111117; stroke: rgba(255,255,255,.1); transition: stroke .3s, fill .3s; }
.org.mine .org-bg { stroke: var(--c); fill: #15151c; }
.org:hover .org-bg, .org:focus-visible .org-bg { stroke: var(--c); }
.org-glow { fill: none; stroke: var(--c); stroke-width: 3; filter: drop-shadow(0 0 8px var(--c)); }
.org-n { fill: var(--text); font: 700 13px var(--font-sans); }
.org-m { fill: var(--muted); font: 10px var(--font-mono); }
.org-id { fill: var(--c); font: 9.5px var(--font-mono); letter-spacing: .06em; }
.pkt { pointer-events: none; }
.roles { display: flex; flex-wrap: wrap; gap: 12px; margin: 4px 0 10px; font-family: var(--font-mono); font-size: 11px; color: var(--muted); }
.roles span { display: inline-flex; align-items: center; gap: 5px; }
.roles i { width: 8px; height: 8px; border-radius: 50%; }
.jwt { margin: 0; padding: 12px 14px; border-radius: var(--radius); background: #0d0d12; border: 1px solid var(--border); font-family: var(--font-mono); font-size: 12px; line-height: 1.6; color: var(--text-2); white-space: pre-wrap; overflow-wrap: anywhere; }
.jwt .c { color: var(--muted); } .jwt .k { color: var(--cyan); } .jwt .s { color: var(--mint); }
.log { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 4px; min-height: 66px; font-family: var(--font-mono); font-size: 11px; color: var(--text-2); }
.log li { display: flex; gap: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: rowin .4s var(--ease-out) both; }
.log li:not(:first-child) { opacity: .55; }
.log b { color: var(--mint); font-weight: 600; flex: none; }
.log li.bad b, .log li.bad { color: #ff7a86; }

/* ---------- responsive ---------- */
@media (max-width: 1100px) {
  .line { grid-column: span 6; }
  .pie { grid-column: span 2; }
  .bars { grid-column: span 4; }
  .tbl { grid-column: span 6; }
}
@media (max-width: 900px) {
  .side { width: 56px; }
  .side-word, .side-lab { display: none; }
  .side-logo { justify-content: center; padding: 0; }
  .side-item { justify-content: center; padding: 9px 0; }
  .side-foot { justify-content: center; }
  .hide-md { display: none; }
  .widgets { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 14px; gap: 12px; }
  .stat, .line, .tbl { grid-column: span 2; }
  .pie, .bars { grid-column: span 2; }
}
@media (min-width: 640px) and (max-width: 900px) {
  .widgets { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .stat { grid-column: span 2; } .line, .tbl { grid-column: span 6; } .pie { grid-column: span 2; } .bars { grid-column: span 4; }
}
@media (max-width: 560px) {
  .title-wrap { padding: 14px 16px 30px; margin-left: -16px; max-width: calc(100% + 16px); }
  .hud { left: 16px; gap: 10px; font-size: 10px; }
  .hide-sm { display: none; }
  .side { width: 48px; }
  .atom { width: 30px; height: 30px; }
  .topbar { padding: 0 12px; }
  .widgets { padding: 10px; gap: 10px; }
  .w { padding: 12px; }
  .stat { flex-direction: row; flex-wrap: wrap; align-items: baseline; justify-content: space-between; column-gap: 8px; }
  .stat h4 { margin: 0; }
  .stat-v { font-size: 22px; }
  .stat-s { flex-basis: 100%; }
  .bar-area { gap: 4px; min-height: 160px; }
  .bar-l { font-size: 8.5px; }
  .chrome-live { display: none; }
  .diff td, .diff th { padding: 6px 6px; }
  .diff { font-size: 11.5px; }
  .hash { margin-left: 0; flex-basis: 100%; }
  .app { min-height: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .ch, .vf, .hud, .card-pos, .ln, .area, .pt, .bar, .pie-seg, .tbar, .tl-fill, .tl-handle { transition: none !important; }
  .card.enter, .diff tr, .diff td.cell, .log li, .tl-tick.fresh, .rec, .live-dot { animation: none !important; }
}
</style>
