<script setup lang="ts">
/*
 * flow — Peter's self-hosted music app, shown as a live world:
 *   1. kinetic wave-cut wordmark (the app's logo treatment, animated)
 *   2. a phone running a faithful recreation of flow's mobile UI, cycling
 *      app → screen off → lock screen (MediaSession) over a Canvas2D visualizer
 *      driven by a synthetic beat (or a real AnalyserNode when the demo loop plays)
 *   3. the architecture as a live pipeline (SMIL packets along SVG paths)
 *   4. the Spotify → YouTube matcher, running the real scoring formula
 */

/* ------------------------------------------------------------------ */
/* constants & data                                                    */
/* ------------------------------------------------------------------ */

const FLOW_STOPS: [number, number, number][] = [
  [34, 197, 94], // #22c55e
  [132, 204, 22], // #84cc16
  [245, 158, 11], // #f59e0b
];

function flowColor(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t)) * 2;
  const i = Math.min(1, Math.floor(x));
  const f = x - i;
  const a = FLOW_STOPS[i]!;
  const b = FLOW_STOPS[i + 1]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function wavePath(yc: number, amp: number, wl: number, x0: number, x1: number, phase = 0, step = 6) {
  let d = "";
  for (let x = x0; x <= x1; x += step) {
    const y = yc + amp * Math.sin((x / wl) * Math.PI * 2 + phase);
    d += `${x === x0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d.trim();
}

// logo: triangle cut by five sine waves (same construction as flow's logo.svg)
const LOGO_CUTS = [
  { yc: 164, amp: 10, wl: 168 },
  { yc: 210, amp: 16, wl: 176 },
  { yc: 256, amp: 22, wl: 170 },
  { yc: 302, amp: 16, wl: 176 },
  { yc: 348, amp: 10, wl: 168 },
].map((c, i) => ({ ...c, d: wavePath(c.yc, c.amp, c.wl, -200, 700, i * 0.9), dur: 5 + i * 0.7 }));

// wordmark: the same cuts sweeping through "flow"
const WORD_CUTS = [
  { yc: 62, amp: 7, wl: 150 },
  { yc: 102, amp: 10, wl: 170 },
  { yc: 142, amp: 12, wl: 160 },
  { yc: 182, amp: 8, wl: 150 },
].map((c, i) => ({ ...c, d: wavePath(c.yc, c.amp, c.wl, -200, 900, i * 1.3, 8), dur: 6 + i * 1.1 }));

interface PhoneTrack {
  title: string;
  artist: string;
  dur: number;
  hues: [number, number];
}
// fictional demo library
const TRACKS: PhoneTrack[] = [
  { title: "Neon Tides", artist: "Harbor Lights", dur: 222, hues: [148, 42] },
  { title: "Paper Satellites", artist: "Mira Vale", dur: 245, hues: [262, 328] },
  { title: "Glasshouse", artist: "Kite Theory", dur: 176, hues: [192, 158] },
  { title: "Slow Bloom", artist: "Odd Fjord", dur: 198, hues: [18, 336] },
  { title: "Night Ferry", artist: "Sora Wren", dur: 231, hues: [222, 176] },
];

function artStyle(t: PhoneTrack) {
  const [a, b] = t.hues;
  return {
    background: `radial-gradient(120% 90% at 18% 12%, hsl(${a} 85% 62% / .95), transparent 55%), radial-gradient(90% 90% at 85% 90%, hsl(${b} 90% 58% / .9), transparent 60%), linear-gradient(140deg, hsl(${a} 45% 16%), hsl(${b} 55% 10%))`,
  };
}

function fmt(s: number) {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
}

type Scene = "app" | "off" | "lock";
const SCENES: { id: Scene; n: string; title: string; body: string; ms: number }[] = [
  {
    id: "app",
    n: "01",
    title: "In the app",
    body: "A Nuxt SPA with shadcn-vue. One permanent <audio> element plays real files; the wave strip above the transport is the logo, moving.",
    ms: 5600,
  },
  {
    id: "off",
    n: "02",
    title: "Screen off",
    body: "A YouTube iframe dies the moment a phone locks, so flow never embeds one. It streams its own m4a over HTTP Range and the OS keeps the audio session alive.",
    ms: 3000,
  },
  {
    id: "lock",
    n: "03",
    title: "Lock screen",
    body: "MediaSession hands title, artist, artwork and transport handlers to the OS. Skip tracks from your pocket.",
    ms: 5600,
  },
];

/* pipeline ---------------------------------------------------------- */
type Kind = "src" | "srv" | "store" | "net" | "client";
interface PNode {
  id: string;
  label: string;
  sub: string;
  col: number;
  lane: number;
  kind: Kind;
  title: string;
  body: string;
  code: string;
}
const PNODES: PNode[] = [
  {
    id: "youtube", label: "YouTube", sub: "search · links", col: 0, lane: 0, kind: "src",
    title: "Search that pages properly",
    body: "yt-dlp has no continuation cursor, so a deeper page means asking for a larger N. Each query is cached for 10 minutes, over-read by 40, and merged rather than replaced, so pages never overlap when YouTube reshuffles.",
    code: "ytsearchN: · LOOKAHEAD 40 · merge, don't replace",
  },
  {
    id: "spotify", label: "Spotify", sub: "playlist import", col: 0, lane: 1, kind: "src",
    title: "Bring a playlist across",
    body: "Paste a playlist, album or track link, or connect your account for private playlists. Every song is searched on YouTube and the candidates are scored. Re-importing syncs the playlist in place.",
    code: "score = .45·duration + .35·title + .20·artist",
  },
  {
    id: "ytdlp", label: "FastAPI", sub: "yt-dlp as a library", col: 1, lane: 0.5, kind: "srv",
    title: "yt-dlp, imported, not shelled out",
    body: "The backend drives yt-dlp as a Python library. Cover art needs mutagen and the right postprocessor order: FFmpegMetadata re-muxes the container, so it has to run before the thumbnail is embedded.",
    code: "FFmpegMetadata → EmbedThumbnail",
  },
  {
    id: "disk", label: "m4a / AAC", sub: "real files on disk", col: 2, lane: 0, kind: "store",
    title: "Real audio files",
    body: "Audio, artwork and optional video are named by YouTube id on a bind mount you can open directly. Only metadata lives in the database, so the media survives a full reset.",
    code: "<id>.m4a  <id>.jpg  <id>.video.mp4",
  },
  {
    id: "mongo", label: "MongoDB", sub: "metadata only", col: 2, lane: 1, kind: "store",
    title: "Metadata, accounts, playlists",
    body: "Playlists are ordered lists of track ids, so reordering is a real order and deleting a track pulls it from every playlist. Real accounts with argon2 hashes; everyone joins through an expiring invite link.",
    code: "argon2 · playlist = [track_id, …]",
  },
  {
    id: "range", label: "HTTP 206", sub: "Range requests", col: 3, lane: 0, kind: "net",
    title: "206 Partial Content, by hand",
    body: "Safari sends Range: bytes=0-1 before it will play anything and refuses the file without a correct Content-Range. Seeking depends on it too. The service worker ignores /api/, because caching a ranged response breaks iOS playback.",
    code: "Range: bytes=0-1  →  206 · Content-Range",
  },
  {
    id: "api", label: "One origin", sub: "static SPA + API", col: 3, lane: 1, kind: "net",
    title: "No Node in production",
    body: "The Nuxt frontend is built to static files at image-build time and served by FastAPI. One origin means the session cookie, the API and audio ranges all just work. Docker Compose, with Caddy for automatic HTTPS.",
    code: "nuxt generate → FastAPI static · Caddy TLS",
  },
  {
    id: "audio", label: "<audio>", sub: "one, permanent", col: 4, lane: 0, kind: "client",
    title: "One element, never re-created",
    body: "It lives in app.vue and is mounted once for the app's whole life. On iOS a fresh element loses the audio session and playback dies when the screen locks. Video, when saved, is a muted layer slaved to this clock.",
    code: "<audio> · mounted once · playbackRate nudges video",
  },
  {
    id: "session", label: "MediaSession", sub: "OS controls + art", col: 4, lane: 1, kind: "client",
    title: "The OS takes over",
    body: "Metadata, artwork, position state and action handlers go to navigator.mediaSession, so the lock screen shows a real player. It is inert over plain HTTP, which is why HTTPS is not optional.",
    code: "navigator.mediaSession.metadata = new MediaMetadata(…)",
  },
  {
    id: "lock", label: "Lock screen", sub: "still playing", col: 5, lane: 0.5, kind: "client",
    title: "The whole point",
    body: "Install it to the home screen, tap play once, lock the phone. Audio keeps going, the queue advances by itself, and the lock screen shows title, artist, artwork and working controls.",
    code: "screen off · phone in pocket · still playing",
  },
];
type EKind = "audio" | "meta" | "ctrl";
const PEDGES: { from: string; to: string; kind: EKind }[] = [
  { from: "youtube", to: "ytdlp", kind: "audio" },
  { from: "spotify", to: "ytdlp", kind: "ctrl" },
  { from: "ytdlp", to: "disk", kind: "audio" },
  { from: "ytdlp", to: "mongo", kind: "meta" },
  { from: "disk", to: "range", kind: "audio" },
  { from: "mongo", to: "api", kind: "meta" },
  { from: "range", to: "audio", kind: "audio" },
  { from: "api", to: "session", kind: "meta" },
  { from: "audio", to: "session", kind: "ctrl" },
  { from: "audio", to: "lock", kind: "audio" },
  { from: "session", to: "lock", kind: "ctrl" },
];

function buildLayout(mode: "w" | "t") {
  const W = mode === "w" ? 164 : 150;
  const H = mode === "w" ? 66 : 60;
  const nodes = PNODES.map((n) => ({
    ...n,
    w: W,
    h: H,
    x: mode === "w" ? 100 + n.col * 196 : 92 + n.lane * 176,
    y: mode === "w" ? 100 + n.lane * 190 : 56 + n.col * 150,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = PEDGES.map((e, i) => {
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    let d: string;
    const sameCol = a.col === b.col;
    if (mode === "w") {
      if (sameCol) {
        d = `M${a.x} ${a.y + H / 2} C${a.x} ${a.y + H / 2 + 40} ${b.x} ${b.y - H / 2 - 40} ${b.x} ${b.y - H / 2}`;
      } else {
        const x1 = a.x + W / 2;
        const x2 = b.x - W / 2;
        const m = (x2 - x1) * 0.55;
        d = `M${x1} ${a.y} C${x1 + m} ${a.y} ${x2 - m} ${b.y} ${x2} ${b.y}`;
      }
    } else if (sameCol) {
      d = `M${a.x + W / 2} ${a.y} C${a.x + W / 2 + 14} ${a.y} ${b.x - W / 2 - 14} ${b.y} ${b.x - W / 2} ${b.y}`;
    } else {
      const y1 = a.y + H / 2;
      const y2 = b.y - H / 2;
      const m = (y2 - y1) * 0.6;
      d = `M${a.x} ${y1} C${a.x} ${y1 + m} ${b.x} ${y2 - m} ${b.x} ${y2}`;
    }
    return { ...e, d, id: `fw-${mode}-e${i}`, dur: 2.2 + (i % 3) * 0.35 };
  });
  return {
    nodes,
    edges,
    vb: mode === "w" ? "0 0 1180 390" : "0 0 360 900",
  };
}
const LAYOUT_W = buildLayout("w");
const LAYOUT_T = buildLayout("t");

/* spotify matcher (real formula from flow's backend, fictional data) */
const PENALTY_WORDS = ["live", "cover", "karaoke", "instrumental", "remix", "sped up", "slowed", "reaction", "tutorial", "8d", "nightcore", "lyrics video"];
interface Cand { title: string; channel: string; dur: number }
interface ImpTrack { title: string; artist: string; dur: number; cands: Cand[] }
const IMPORT: ImpTrack[] = [
  {
    title: "Neon Tides", artist: "Harbor Lights", dur: 222,
    cands: [
      { title: "Harbor Lights - Neon Tides (Official Audio)", channel: "Harbor Lights", dur: 223 },
      { title: "Neon Tides (Live at the Harbour)", channel: "Harbor Lights", dur: 268 },
      { title: "Neon Tides 1 hour loop", channel: "chill loops", dur: 3600 },
    ],
  },
  {
    title: "Paper Satellites", artist: "Mira Vale", dur: 245,
    cands: [
      { title: "Paper Satellites (slowed + reverb)", channel: "nightwave edits", dur: 290 },
      { title: "Mira Vale - Paper Satellites", channel: "Mira Vale", dur: 247 },
      { title: "Mira Vale – Paper Satellites (Lyric Video)", channel: "Mira Vale", dur: 251 },
    ],
  },
  {
    title: "Slow Bloom", artist: "Odd Fjord", dur: 198,
    cands: [
      { title: "Slow Bloom", channel: "Various Artists", dur: 205 },
      { title: "Odd Fjord - Slow Bloom (Remix)", channel: "Odd Fjord", dur: 212 },
      { title: "Odd Fjord live session", channel: "Odd Fjord", dur: 1840 },
    ],
  },
  {
    title: "Glasshouse", artist: "Kite Theory", dur: 176,
    cands: [
      { title: "Glasshouse (cover)", channel: "acoustic covers", dur: 181 },
      { title: "Kite Theory - Glasshouse", channel: "Kite Theory", dur: 177 },
      { title: "Kite Theory - Glasshouse (8D Audio)", channel: "8D tunes", dur: 176 },
    ],
  },
  {
    title: "Untitled 7", artist: "Sora Wren", dur: 213,
    cands: [
      { title: "Sora Wren — live full set", channel: "Sora Wren", dur: 2700 },
      { title: "Untitled 7 (karaoke version)", channel: "karaoke hub", dur: 150 },
      { title: "untitled demo tape", channel: "lofi archive", dur: 260 },
    ],
  },
];

function norm(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}_\s]/gu, " ").split(/\s+/).filter(Boolean);
}
function scoreCand(t: ImpTrack, c: Cand) {
  const hay = new Set(norm(`${c.title} ${c.channel}`));
  const tt = norm(t.title);
  const title = tt.length ? tt.filter((x) => hay.has(x)).length / tt.length : 0;
  const at = norm(t.artist);
  const artist = at.length ? at.filter((x) => hay.has(x)).length / at.length : 0.5;
  const delta = Math.abs(t.dur - c.dur);
  const dur = delta <= 2 ? 1 : delta <= 5 ? 0.9 : delta <= 15 ? 0.6 : delta <= 45 ? 0.25 : 0;
  let penalty = 0;
  const notes: string[] = [];
  const src = t.title.toLowerCase();
  const ct = c.title.toLowerCase();
  const hit = PENALTY_WORDS.find((w) => ct.includes(w) && !src.includes(w));
  if (hit) {
    penalty += 0.18;
    notes.push(`−.18 ${hit}`);
  }
  if (c.dur > t.dur * 2.5) {
    penalty += 0.3;
    notes.push("−.30 compilation");
  }
  const raw = 0.45 * dur + 0.35 * title + 0.2 * artist;
  const score = Math.max(0, Math.min(1, raw - penalty));
  return { dur: 0.45 * dur, title: 0.35 * title, artist: 0.2 * artist, penalty, score, notes, delta };
}
const IMPORT_SCORED = IMPORT.map((t) => {
  const scored = t.cands.map((c) => ({ ...c, s: scoreCand(t, c) }));
  let best = 0;
  scored.forEach((c, i) => {
    if (c.s.score > scored[best]!.s.score) best = i;
  });
  const top = scored[best]!.s.score;
  const status: "ok" | "unsure" | "miss" = top < 0.4 ? "miss" : top < 0.72 ? "unsure" : "ok";
  return { ...t, scored, best, top, status };
});
const IMPORT_SUMMARY = {
  ok: IMPORT_SCORED.filter((t) => t.status === "ok").length,
  unsure: IMPORT_SCORED.filter((t) => t.status === "unsure").length,
  miss: IMPORT_SCORED.filter((t) => t.status === "miss").length,
};

const FEATURES = [
  { icon: "play", title: "Play before you save", body: "Every search result plays as a preview within seconds. Add promotes it in place, no second download; anything you don't keep is swept after a few hours." },
  { icon: "film", title: "Video, slaved to the audio", body: "Opt-in video per track. The <audio> stays the clock: big gaps snap into place, small drift is absorbed by nudging playbackRate a few percent. Toggling never interrupts playback." },
  { icon: "users", title: "Built for other people", body: "Follow people, share your library per follower, follow their playlists, see friend activity and join them at their position. Messaging needs a follow both ways." },
  { icon: "key", title: "Real accounts", body: "argon2 hashes in MongoDB. The admin is seeded on startup; everyone else joins through an expiring invite link generated on the Admin page." },
  { icon: "box", title: "One container, one origin", body: "Docker Compose for the app and MongoDB, Caddy for automatic HTTPS. The SPA is prebuilt and served by FastAPI, so there is no Node runtime in production." },
  { icon: "phone", title: "Installs like an app", body: "Add to home screen over HTTPS and it behaves like a native player. The service worker caches only the shell and hashed assets, never /api/." },
];

/* ------------------------------------------------------------------ */
/* refs & state                                                        */
/* ------------------------------------------------------------------ */

const root = ref<HTMLElement>();
const showEl = ref<HTMLElement>();
const pipeEl = ref<HTMLElement>();
const impEl = ref<HTMLElement>();
const stageCanvas = ref<HTMLCanvasElement>();
const stripCanvas = ref<HTMLCanvasElement>();
const phoneEl = ref<HTMLElement>();
const wordEl = ref<HTMLElement>();
const pipeSvg = ref<SVGSVGElement>();

const rootIn = useInView(root, "0px");
const showIn = useInView(showEl, "120px 0px 120px 0px");
const pipeIn = useInView(pipeEl);
const impIn = useInView(impEl);
const reduced = useReducedMotion();

const scene = ref<Scene>("app");
const pinnedUntil = ref(0);
const sceneKey = ref(0); // restarts the step progress animation
const playing = ref(true);
const cur = ref(0);
const pos = ref(37);
const clock = ref("9:41");
const dateLabel = ref("Friday 9 October");
const wide = ref(true);

const track = computed(() => TRACKS[cur.value]!);
const sceneMs = computed(() => SCENES.find((s) => s.id === scene.value)!.ms);

const pipeActive = ref("youtube");
const pipePinned = ref(false);
const layout = computed(() => (wide.value ? LAYOUT_W : LAYOUT_T));
const activeNode = computed(() => PNODES.find((n) => n.id === pipeActive.value)!);

const imp = reactive({ idx: 0, phase: "search" as "search" | "score" | "pick" | "summary", done: [] as number[] });
const impCur = computed(() => IMPORT_SCORED[Math.min(imp.idx, IMPORT_SCORED.length - 1)]!);

/* ------------------------------------------------------------------ */
/* phone                                                               */
/* ------------------------------------------------------------------ */

let sceneTimer = 0;
function scheduleScene() {
  clearTimeout(sceneTimer);
  if (reduced.value || !showIn.value) return;
  sceneTimer = window.setTimeout(() => {
    if (Date.now() < pinnedUntil.value) {
      scheduleScene();
      return;
    }
    const i = SCENES.findIndex((s) => s.id === scene.value);
    setScene(SCENES[(i + 1) % SCENES.length]!.id);
  }, sceneMs.value);
}
function setScene(s: Scene) {
  scene.value = s;
  sceneKey.value++;
  scheduleScene();
}
function pickScene(s: Scene) {
  pinnedUntil.value = Date.now() + 14000;
  setScene(s);
}
function wake() {
  if (scene.value === "off") pickScene("lock");
}

function togglePlay() {
  playing.value = !playing.value;
  if (demoArmed.value) {
    if (playing.value) startDemo();
    else pauseDemo();
  }
}
function step(dir: 1 | -1) {
  if (dir === -1 && pos.value > 3) {
    posAcc = 0;
    pos.value = 0;
    return;
  }
  cur.value = (cur.value + dir + TRACKS.length) % TRACKS.length;
  posAcc = 0;
  pos.value = 0;
  playing.value = true;
}
function playIndex(i: number) {
  if (i === cur.value) {
    togglePlay();
    return;
  }
  cur.value = i;
  posAcc = 0;
  pos.value = 0;
  playing.value = true;
}

/* ------------------------------------------------------------------ */
/* demo audio (WebAudio synth; quiet, user-initiated)                  */
/* ------------------------------------------------------------------ */

const BPM = 112;
const STEP = 60 / BPM / 4;
const CHORDS = [
  { root: 45, notes: [57, 60, 64] }, // Am
  { root: 41, notes: [57, 60, 65] }, // F
  { root: 48, notes: [55, 60, 64] }, // C
  { root: 43, notes: [55, 59, 62] }, // G
];
const demoArmed = ref(false);
const demoOn = ref(false);
let actx: AudioContext | null = null;
let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let fbuf: Uint8Array | null = null;
let noiseBuf: AudioBuffer | null = null;
let schedTimer = 0;
let suspendTimer = 0;
let nextTime = 0;
let stepIdx = 0;
let demoT0 = 0;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function playStep(s: number, t: number) {
  if (!actx || !master) return;
  const bar = Math.floor(s / 16) % 4;
  const st = s % 16;
  const chord = CHORDS[bar]!;
  // kick
  if (st % 4 === 0) {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, t, 0.85, 0.004, 0.26);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.32);
  }
  // hat
  if (st % 4 === 2 && noiseBuf) {
    const n = actx.createBufferSource();
    n.buffer = noiseBuf;
    const f = actx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 7000;
    const g = actx.createGain();
    env(g, t, 0.12, 0.002, 0.05);
    n.connect(f).connect(g).connect(master);
    n.start(t);
    n.stop(t + 0.08);
  }
  // bass
  if ([0, 3, 6, 8, 11, 14].includes(st)) {
    const o = actx.createOscillator();
    o.type = "triangle";
    o.frequency.value = mtof(chord.root + (st === 14 ? 12 : 0));
    const f = actx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 700;
    const g = actx.createGain();
    env(g, t, 0.34, 0.01, 0.2);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.26);
  }
  // pad
  if (st === 0) {
    const len = STEP * 16;
    for (const m of chord.notes) {
      for (const det of [-7, 7]) {
        const o = actx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = mtof(m);
        o.detune.value = det;
        const f = actx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 1100;
        const g = actx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.022, t + 0.45);
        g.gain.setValueAtTime(0.022, t + len - 0.35);
        g.gain.linearRampToValueAtTime(0, t + len);
        o.connect(f).connect(g).connect(master);
        o.start(t);
        o.stop(t + len + 0.05);
      }
    }
  }
  // pluck arp
  if ([0, 3, 6, 10, 13].includes(st)) {
    const o = actx.createOscillator();
    o.type = "sine";
    const notes = chord.notes;
    o.frequency.value = mtof(notes[(st + bar) % notes.length]! + 12);
    const g = actx.createGain();
    env(g, t, 0.1, 0.005, 0.32);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.4);
  }
}

function schedule() {
  if (!actx) return;
  while (nextTime < actx.currentTime + 0.12) {
    playStep(stepIdx, nextTime);
    nextTime += STEP;
    stepIdx = (stepIdx + 1) % 64;
  }
}

async function startDemo() {
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return;
  clearTimeout(suspendTimer);
  if (!actx) {
    actx = new Ctor();
    const comp = actx.createDynamicsCompressor();
    master = actx.createGain();
    master.gain.value = 0;
    analyser = actx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    fbuf = new Uint8Array(analyser.frequencyBinCount);
    master.connect(comp);
    comp.connect(analyser);
    analyser.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, Math.floor(actx.sampleRate * 0.2), actx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  try {
    await actx.resume();
  } catch {
    return;
  }
  if (!actx || !master) return;
  const now = actx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0.16, now + 0.6);
  if (!demoOn.value) {
    nextTime = now + 0.06;
    stepIdx = 0;
    demoT0 = nextTime;
  }
  demoOn.value = true;
  clearInterval(schedTimer);
  schedTimer = window.setInterval(schedule, 25);
}

function pauseDemo() {
  clearInterval(schedTimer);
  schedTimer = 0;
  demoOn.value = false;
  if (!actx || !master) return;
  const now = actx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0, now + 0.25);
  clearTimeout(suspendTimer);
  suspendTimer = window.setTimeout(() => {
    if (!demoOn.value) actx?.suspend().catch(() => {});
  }, 400);
}

function toggleDemo() {
  if (demoArmed.value) {
    demoArmed.value = false;
    pauseDemo();
  } else {
    demoArmed.value = true;
    playing.value = true;
    startDemo();
  }
}

/* ------------------------------------------------------------------ */
/* canvas: stage visualizer + the phone's wave strip                   */
/* ------------------------------------------------------------------ */

const B = 48;
const spec = new Float32Array(B);
const BARS = 96;
const barColors: string[] = [];
for (let i = 0; i < BARS; i++) {
  const m = i < BARS / 2 ? i / (BARS / 2) : (BARS - i) / (BARS / 2);
  const [r, g, b] = flowColor(m);
  barColors.push(`rgb(${r | 0},${g | 0},${b | 0})`);
}
const P = 90;
const pX = new Float32Array(P);
const pY = new Float32Array(P);
const pVX = new Float32Array(P);
const pVY = new Float32Array(P);
const pL = new Float32Array(P);
let pNext = 0;

let ctx: CanvasRenderingContext2D | null = null;
let sctx: CanvasRenderingContext2D | null = null;
let cw = 0;
let ch = 0;
let sw = 0;
let sh = 0;
let cx = 0;
let cy = 0;
let ringR = 200;
let ribbonGrad: CanvasGradient | null = null;
let stripGrad: CanvasGradient | null = null;
let raf = 0;
let last = 0;
let posAcc = 37;
let kick = 0;
let lastKickPhase = 1;
let ptrX = -9999;
let ptrY = -9999;
let ptrAmt = 0;
let stripEnergy = [0, 0, 0];
let stripPhase = 0;
let ro: ResizeObserver | null = null;

function measure() {
  const c = stageCanvas.value;
  const s = stripCanvas.value;
  if (c) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cw = c.clientWidth;
    ch = c.clientHeight;
    c.width = Math.max(1, Math.round(cw * dpr));
    c.height = Math.max(1, Math.round(ch * dpr));
    ctx = c.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cr = c.getBoundingClientRect();
    const pr = phoneEl.value?.getBoundingClientRect();
    if (pr) {
      cx = pr.left + pr.width / 2 - cr.left;
      cy = pr.top + pr.height / 2 - cr.top;
      ringR = Math.min(pr.height * 0.56, cw * 0.46);
    } else {
      cx = cw / 2;
      cy = ch / 2;
    }
    c.style.setProperty("--cx", `${((cx / Math.max(1, cw)) * 100).toFixed(1)}%`);
    c.style.setProperty("--cy", `${((cy / Math.max(1, ch)) * 100).toFixed(1)}%`);
    if (ctx) {
      ribbonGrad = ctx.createLinearGradient(0, 0, cw, 0);
      ribbonGrad.addColorStop(0, "rgba(34,197,94,0)");
      ribbonGrad.addColorStop(0.18, "#22c55e");
      ribbonGrad.addColorStop(0.5, "#84cc16");
      ribbonGrad.addColorStop(0.82, "#f59e0b");
      ribbonGrad.addColorStop(1, "rgba(245,158,11,0)");
    }
  }
  if (s) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sw = s.clientWidth;
    sh = s.clientHeight;
    s.width = Math.max(1, Math.round(sw * dpr));
    s.height = Math.max(1, Math.round(sh * dpr));
    sctx = s.getContext("2d");
    sctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (sctx) {
      stripGrad = sctx.createLinearGradient(0, 0, sw, 0);
      stripGrad.addColorStop(0, "#22c55e");
      stripGrad.addColorStop(0.5, "#84cc16");
      stripGrad.addColorStop(1, "#f59e0b");
    }
  }
  if (reduced.value || !showIn.value) {
    // one meaningful still frame
    updateSpectrum(4.37, true);
    kick = 0.6;
    drawStage(4.37);
    drawStrip(true);
  }
}

function band(lo: number, hi: number) {
  const a = Math.floor(B * lo);
  const b = Math.max(a + 1, Math.floor(B * hi));
  let s = 0;
  for (let i = a; i < b; i++) s += spec[i]!;
  return s / (b - a);
}

function updateSpectrum(t: number, still = false) {
  const live = demoOn.value && analyser && fbuf && !still;
  if (live) analyser!.getByteFrequencyData(fbuf as Uint8Array<ArrayBuffer>);
  const beat = demoOn.value && actx && !still ? (actx.currentTime - demoT0) / (60 / BPM) : (t * BPM) / 60;
  const ph = beat - Math.floor(beat);
  const k = Math.exp(-ph * 5);
  if (ph < lastKickPhase && playing.value && !still) emit();
  lastKickPhase = ph;
  kick = playing.value ? k : kick * 0.9;
  const hatPh = (beat * 2 + 0.5) % 1;
  const hat = Math.exp(-hatPh * 9);
  for (let i = 0; i < B; i++) {
    const x = i / (B - 1);
    let target = 0;
    if (playing.value || still) {
      if (live) {
        const idx = Math.floor(Math.pow(x, 1.55) * fbuf!.length * 0.62);
        target = Math.min(1, Math.pow((fbuf![idx] ?? 0) / 255, 1.2) * (1 + x * 1.8));
      } else {
        const bass = k * Math.pow(1 - x, 2.2) * 0.95;
        const mid = (0.28 + 0.22 * Math.sin(t * 1.7 + i * 0.45) * Math.sin(t * 0.63 + i * 0.17)) * Math.sin(Math.PI * Math.min(1, x * 1.15)) * 0.85;
        const high = hat * Math.pow(x, 1.6) * 0.5;
        target = Math.min(1, bass + Math.max(0, mid) + high);
      }
    }
    const prev = spec[i]!;
    spec[i] = still ? target : target > prev ? prev + (target - prev) * 0.5 : prev * 0.9 + target * 0.1;
  }
}

function emit() {
  for (let n = 0; n < 9; n++) {
    const i = pNext;
    pNext = (pNext + 1) % P;
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 90;
    pX[i] = cx + Math.cos(a) * ringR;
    pY[i] = cy + Math.sin(a) * ringR;
    pVX[i] = Math.cos(a) * sp;
    pVY[i] = Math.sin(a) * sp;
    pL[i] = 1;
  }
}

const RIBBONS = [
  { lo: 0, hi: 0.16, waves: 1.3, speed: 0.55, base: 0.2, off: 0 },
  { lo: 0.1, hi: 0.45, waves: 2.2, speed: -0.8, base: 0.13, off: 1.7 },
  { lo: 0.4, hi: 0.95, waves: 3.6, speed: 1.25, base: 0.08, off: 3.1 },
];

function drawStage(t: number) {
  if (!ctx || cw < 2) return;
  const c = ctx;
  c.clearRect(0, 0, cw, ch);
  c.globalCompositeOperation = "lighter";
  const bass = band(0, 0.15);

  // core glow
  const glow = c.createRadialGradient(cx, cy, 0, cx, cy, ringR * 1.7);
  glow.addColorStop(0, `rgba(34,197,94,${0.1 + 0.16 * kick * (playing.value ? 1 : 0.3)})`);
  glow.addColorStop(0.45, `rgba(132,204,22,${0.035 + 0.04 * bass})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, cw, ch);

  // ribbons (silk: several offset strands per layer)
  if (ribbonGrad) {
    c.strokeStyle = ribbonGrad;
    c.lineJoin = "round";
    const stepX = Math.max(10, cw / 150);
    for (const [li, r] of RIBBONS.entries()) {
      const e = band(r.lo, r.hi);
      const amp = (r.base * 0.5 + e * r.base * 1.6) * ch * 0.5 + 6;
      const yBase = cy + ringR * 0.18 + (li - 1) * 10;
      for (let s = 0; s < 5; s++) {
        c.beginPath();
        const so = s * 0.16;
        for (let x = 0; x <= cw + stepX; x += stepX) {
          const tx = x / cw;
          const win = Math.pow(Math.sin(Math.PI * Math.min(1, tx)), 0.7);
          const ph = tx * Math.PI * 2 * r.waves + t * r.speed + r.off + so;
          let y = yBase + s * 3 - win * amp * (Math.sin(ph) * 0.7 + Math.sin(ph * 0.5 - t * r.speed * 1.4) * 0.3);
          if (ptrAmt > 0.01) {
            const dx = x - ptrX;
            const f = Math.exp(-(dx * dx) / (2 * 140 * 140)) * ptrAmt;
            y += (ptrY - y) * f * 0.35;
          }
          if (x === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.globalAlpha = s === 0 ? 0.1 : 0.62 - s * 0.09;
        c.lineWidth = s === 0 ? 12 : 1.3;
        c.stroke();
      }
    }
  }

  // radial spectrum
  c.lineCap = "round";
  const lw = Math.max(2, ((Math.PI * 2 * ringR) / BARS) * 0.42);
  c.lineWidth = lw;
  const rot = t * 0.05;
  for (let i = 0; i < BARS; i++) {
    const m = i < BARS / 2 ? i / (BARS / 2) : (BARS - i) / (BARS / 2);
    const v = spec[Math.min(B - 1, Math.floor((1 - m) * (B - 1)))]!;
    const a = -Math.PI / 2 + (i / BARS) * Math.PI * 2 + rot;
    const r0 = ringR + 4;
    const r1 = r0 + 4 + v * ringR * 0.42;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    c.globalAlpha = 0.25 + v * 0.7;
    c.strokeStyle = barColors[i]!;
    c.beginPath();
    c.moveTo(cx + ca * r0, cy + sa * r0);
    c.lineTo(cx + ca * r1, cy + sa * r1);
    c.stroke();
  }
  // rings
  c.globalAlpha = 0.5;
  c.lineWidth = 1;
  c.strokeStyle = "rgba(255,255,255,0.08)";
  c.beginPath();
  c.arc(cx, cy, ringR - 4, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = `rgba(132,204,22,${0.08 + kick * 0.25})`;
  c.beginPath();
  c.arc(cx, cy, ringR - 4 + kick * 26, 0, Math.PI * 2);
  c.stroke();

  // particles
  c.fillStyle = "#b9f27a";
  for (let i = 0; i < P; i++) {
    const l = pL[i]!;
    if (l <= 0) continue;
    c.globalAlpha = l * 0.7;
    c.beginPath();
    c.arc(pX[i]!, pY[i]!, 1.2 + l * 1.2, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
}

function stepParticles(dt: number) {
  for (let i = 0; i < P; i++) {
    if (pL[i]! <= 0) continue;
    pX[i] = pX[i]! + pVX[i]! * dt;
    pY[i] = pY[i]! + pVY[i]! * dt;
    pL[i] = pL[i]! - dt * 0.7;
  }
}

// flow's own strip: three drifting waves, each driven by a slice of the spectrum
const STRIP = [
  { lo: 0, hi: 0.1, waves: 1.6, speed: 0.011, base: 0.1, alpha: 0.22, line: 0 },
  { lo: 0.08, hi: 0.35, waves: 2.7, speed: -0.019, base: 0.08, alpha: 0.3, line: 0 },
  { lo: 0.3, hi: 0.7, waves: 4.3, speed: 0.031, base: 0.05, alpha: 0.95, line: 1.6 },
];
function drawStrip(still = false) {
  if (!sctx || sw < 2 || !stripGrad) return;
  const c = sctx;
  c.clearRect(0, 0, sw, sh);
  if (playing.value && !still) stripPhase += 1;
  STRIP.forEach((L, i) => {
    let target = playing.value || still ? Math.pow(band(L.lo, L.hi), 0.7) : 0;
    if (still) target = 0.45;
    const prev = stripEnergy[i]!;
    stripEnergy[i] = still ? target : target > prev ? prev + (target - prev) * 0.4 : prev * 0.9;
    const amp = (L.base + stripEnergy[i]! * 0.42) * sh;
    const drift = (still ? 40 : stripPhase) * L.speed;
    const mid = sh * 0.62;
    c.beginPath();
    for (let k = 0; k <= 64; k++) {
      const tt = k / 64;
      const x = tt * sw;
      const w = Math.pow(Math.sin(Math.PI * tt), 0.6);
      const y = mid - w * amp * (Math.sin(tt * Math.PI * 2 * L.waves + drift) * 0.7 + Math.sin(tt * Math.PI * L.waves - drift * 1.4) * 0.3);
      if (k === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.globalAlpha = L.alpha;
    if (L.line) {
      c.strokeStyle = stripGrad!;
      c.lineWidth = L.line;
      c.stroke();
    } else {
      c.lineTo(sw, sh);
      c.lineTo(0, sh);
      c.closePath();
      c.fillStyle = stripGrad!;
      c.fill();
    }
  });
  c.globalAlpha = 1;
}

function frame(now: number) {
  raf = requestAnimationFrame(frame);
  const realDt = Math.min(1, (now - (last || now)) / 1000);
  const dt = Math.min(0.05, realDt);
  last = now;
  const t = now / 1000;
  updateSpectrum(t);
  stepParticles(dt);
  ptrAmt += ((ptrX > -9000 ? 1 : 0) - ptrAmt) * 0.06;
  drawStage(t);
  drawStrip();
  if (wordEl.value) wordEl.value.style.setProperty("--beat", (kick * (playing.value ? 1 : 0)).toFixed(3));
  if (playing.value) {
    posAcc += realDt;
    if (posAcc >= track.value.dur) {
      cur.value = (cur.value + 1) % TRACKS.length;
      posAcc = 0;
    }
    const s = Math.floor(posAcc);
    if (s !== pos.value) pos.value = s;
  }
}

function startLoop() {
  if (raf || reduced.value) return;
  last = 0;
  posAcc = pos.value;
  raf = requestAnimationFrame(frame);
}
function stopLoop() {
  cancelAnimationFrame(raf);
  raf = 0;
}

function onPtr(e: PointerEvent) {
  const c = stageCanvas.value;
  if (!c || e.pointerType === "touch") return;
  const r = c.getBoundingClientRect();
  ptrX = e.clientX - r.left;
  ptrY = e.clientY - r.top;
}
function onPtrLeave() {
  ptrX = -9999;
  ptrY = -9999;
}

/* ------------------------------------------------------------------ */
/* pipeline + importer timers                                          */
/* ------------------------------------------------------------------ */

let pipeTimer = 0;
const PIPE_ORDER = ["youtube", "spotify", "ytdlp", "disk", "mongo", "range", "api", "audio", "session", "lock"];
function schedulePipe() {
  clearTimeout(pipeTimer);
  if (reduced.value || !pipeIn.value || pipePinned.value) return;
  pipeTimer = window.setTimeout(() => {
    const i = PIPE_ORDER.indexOf(pipeActive.value);
    pipeActive.value = PIPE_ORDER[(i + 1) % PIPE_ORDER.length]!;
    schedulePipe();
  }, 4200);
}
function pickNode(id: string) {
  pipeActive.value = id;
  pipePinned.value = true;
  clearTimeout(pipeTimer);
}
function resumePipe() {
  pipePinned.value = false;
  schedulePipe();
}
function edgeOn(e: { from: string; to: string }) {
  return e.from === pipeActive.value || e.to === pipeActive.value;
}

let impTimer = 0;
const IMP_MS = { search: 800, score: 1700, pick: 1200, summary: 3600 } as const;
function impStatus(i: number) {
  if (imp.done.includes(i)) return IMPORT_SCORED[i]!.status;
  if (i === imp.idx && imp.phase !== "summary") return "active";
  return "pending";
}
function advanceImport() {
  if (imp.phase === "search") imp.phase = "score";
  else if (imp.phase === "score") imp.phase = "pick";
  else if (imp.phase === "pick") {
    imp.done.push(imp.idx);
    if (imp.idx >= IMPORT_SCORED.length - 1) imp.phase = "summary";
    else {
      imp.idx++;
      imp.phase = "search";
    }
  } else {
    imp.idx = 0;
    imp.done = [];
    imp.phase = "search";
  }
}
function scheduleImport() {
  clearTimeout(impTimer);
  if (reduced.value || !impIn.value) return;
  impTimer = window.setTimeout(() => {
    advanceImport();
    scheduleImport();
  }, IMP_MS[imp.phase]);
}
function showFinalImport() {
  imp.done = IMPORT_SCORED.map((_, i) => i);
  imp.idx = 2;
  imp.phase = "pick";
}
const impShowBars = computed(() => imp.phase === "score" || imp.phase === "pick" || imp.phase === "summary");
const impPicked = computed(() => imp.phase === "pick" || imp.phase === "summary");

/* ------------------------------------------------------------------ */
/* lifecycle                                                           */
/* ------------------------------------------------------------------ */

let clockTimer = 0;
let mq: MediaQueryList | null = null;
const onMq = () => {
  wide.value = !!mq?.matches;
};
function tickClock() {
  const d = new Date();
  clock.value = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  dateLabel.value = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
}

onMounted(() => {
  mq = matchMedia("(min-width: 1000px)");
  onMq();
  mq.addEventListener("change", onMq);
  tickClock();
  clockTimer = window.setInterval(tickClock, 20000);
  ro = new ResizeObserver(() => measure());
  if (showEl.value) ro.observe(showEl.value);
  if (stripCanvas.value) ro.observe(stripCanvas.value);
  measure();
  if (reduced.value) showFinalImport();
});

watch([showIn, reduced], ([vis, red]) => {
  if (vis && !red) {
    startLoop();
    scheduleScene();
  } else {
    stopLoop();
    clearTimeout(sceneTimer);
    if (red) nextTick(measure);
  }
});
watch([pipeIn, reduced, pipeSvg], ([vis, red, svg]) => {
  if (svg) {
    if (vis && !red) svg.unpauseAnimations();
    else svg.pauseAnimations();
  }
  if (vis && !red) schedulePipe();
  else clearTimeout(pipeTimer);
});
watch([impIn, reduced], ([vis, red]) => {
  if (red) {
    clearTimeout(impTimer);
    showFinalImport();
  } else if (vis) scheduleImport();
  else clearTimeout(impTimer);
});
watch(rootIn, (vis) => {
  if (!demoArmed.value) return;
  if (!vis) pauseDemo();
  else if (playing.value) startDemo();
});

onBeforeUnmount(() => {
  stopLoop();
  clearTimeout(sceneTimer);
  clearTimeout(pipeTimer);
  clearTimeout(impTimer);
  clearTimeout(suspendTimer);
  clearInterval(schedTimer);
  clearInterval(clockTimer);
  ro?.disconnect();
  mq?.removeEventListener("change", onMq);
  if (actx) {
    actx.close().catch(() => {});
    actx = null;
  }
});
</script>

<template>
  <section id="flow" ref="root" class="world" :class="{ 'is-reduced': reduced }" aria-labelledby="flow-title">
    <div class="fw-aura" aria-hidden="true" />

    <div class="v2-container fw-inner">
      <!-- ============ header ============ -->
      <header class="fw-head">
        <div class="fw-head-main">
          <p v-reveal class="v2-eyebrow fw-eyebrow">
            <svg class="fw-logo" viewBox="156 101 276 310" aria-hidden="true">
              <defs>
                <linearGradient id="fw-logo-grad" x1="0" y1="0.15" x2="1" y2="0.85">
                  <stop offset="0" stop-color="#22c55e" />
                  <stop offset="0.5" stop-color="#84cc16" />
                  <stop offset="1" stop-color="#f59e0b" />
                </linearGradient>
                <linearGradient id="fw-logo-fade" gradientUnits="userSpaceOnUse" x1="150" y1="0" x2="430" y2="0">
                  <stop offset="0.5" stop-color="#fff" stop-opacity="0" />
                  <stop offset="1" stop-color="#fff" stop-opacity="1" />
                </linearGradient>
                <mask id="fw-logo-cuts" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
                  <rect width="512" height="512" fill="#fff" />
                  <g fill="none" stroke="#000" stroke-width="15" stroke-linecap="round">
                    <path
                      v-for="c in LOGO_CUTS"
                      :key="c.yc"
                      class="fw-cut"
                      :d="c.d"
                      :style="{ '--wl': `${-c.wl}px`, animationDuration: `${c.dur}s` }"
                    />
                  </g>
                  <rect width="512" height="512" fill="url(#fw-logo-fade)" />
                </mask>
              </defs>
              <polygon
                points="406,256 181,385.9 181,126.1"
                fill="url(#fw-logo-grad)"
                stroke="url(#fw-logo-grad)"
                stroke-width="40"
                stroke-linejoin="round"
                mask="url(#fw-logo-cuts)"
              />
            </svg>
            Side project · music
          </p>

          <h2 id="flow-title" ref="wordEl" v-reveal="80" class="fw-word">
            <span class="fw-sr">flow</span>
            <svg class="fw-word-svg" viewBox="0 0 660 215" aria-hidden="true">
              <defs>
                <linearGradient id="fw-word-grad" x1="0" y1="0" x2="1" y2="0.4">
                  <stop offset="0" stop-color="#22c55e" />
                  <stop offset="0.52" stop-color="#84cc16" />
                  <stop offset="1" stop-color="#f59e0b" />
                </linearGradient>
                <mask id="fw-word-cuts" maskUnits="userSpaceOnUse" x="0" y="0" width="660" height="215">
                  <rect width="660" height="215" fill="#fff" />
                  <g fill="none" stroke="#000" stroke-width="7" stroke-linecap="round">
                    <path
                      v-for="c in WORD_CUTS"
                      :key="c.yc"
                      class="fw-cut"
                      :d="c.d"
                      :style="{ '--wl': `${-c.wl}px`, animationDuration: `${c.dur}s` }"
                    />
                  </g>
                </mask>
              </defs>
              <text class="fw-word-glow" x="8" y="196" textLength="644" lengthAdjust="spacingAndGlyphs">flow</text>
              <text class="fw-word-text" x="8" y="196" textLength="644" lengthAdjust="spacingAndGlyphs" mask="url(#fw-word-cuts)">flow</text>
            </svg>
          </h2>

          <p v-reveal="160" class="fw-tagline">Your music, saved and <span class="fw-grad">always playing.</span></p>
          <p v-reveal="220" class="v2-lede fw-lede">
            A self-hosted music library: search YouTube or import a Spotify playlist, build playlists, and play it all from
            your phone <strong>with the screen off</strong>. That last part drives the entire architecture.
          </p>
          <ul v-reveal="280" class="fw-chips" aria-label="Stack">
            <li v-for="c in ['Nuxt 4 SPA', 'shadcn-vue', 'Tailwind 4', 'FastAPI', 'yt-dlp', 'MongoDB', 'MediaSession API', 'Docker + Caddy']" :key="c" class="v2-chip">{{ c }}</li>
          </ul>
        </div>

        <dl class="fw-stats">
          <div v-reveal="120" class="fw-stat">
            <dt>0</dt>
            <dd><b>YouTube iframes</b>a locked phone kills them</dd>
          </div>
          <div v-reveal="200" class="fw-stat">
            <dt>1</dt>
            <dd><b>&lt;audio&gt; element</b>mounted once, never re-created</dd>
          </div>
          <div v-reveal="280" class="fw-stat">
            <dt>206</dt>
            <dd><b>Partial Content</b>Range support written by hand</dd>
          </div>
          <div v-reveal="360" class="fw-stat">
            <dt>0</dt>
            <dd><b>Node runtimes in prod</b>static SPA served by FastAPI</dd>
          </div>
        </dl>
      </header>

      <!-- ============ phone show ============ -->
      <div ref="showEl" class="fw-show" @pointermove="onPtr" @pointerleave="onPtrLeave">
        <canvas ref="stageCanvas" class="fw-stage-canvas" aria-hidden="true" />

        <div class="fw-phone-col">
          <div class="fw-phone-wrap">
            <div
              ref="phoneEl"
              class="fw-phone"
              :data-scene="scene"
              role="group"
              :aria-label="`Recreation of the flow app, showing: ${SCENES.find((s) => s.id === scene)!.title}`"
            >
              <div class="fw-screen">
                <!-- APP -->
                <div class="fw-app" :class="{ on: scene === 'app' }" :inert="scene !== 'app'">
                  <div class="fw-status">
                    <span>{{ clock }}</span>
                    <span class="fw-status-ic"><IconSignal :size="12" /><IconWifi :size="12" /><IconBatteryFull :size="15" /></span>
                  </div>
                  <div class="fw-app-body">
                    <div class="fw-app-head">
                      <h4>Good evening</h4>
                      <div class="fw-app-btns">
                        <button type="button" class="fw-btn-p" @click="togglePlay">
                          <IconPause v-if="playing" :size="13" class="fw-fill" />
                          <IconPlay v-else :size="13" class="fw-fill" />
                          {{ playing ? "Pause" : "Play all" }}
                        </button>
                        <button type="button" class="fw-btn-s" @click="step(1)"><IconShuffle :size="13" /> Shuffle</button>
                      </div>
                    </div>
                    <div class="fw-app-sec"><span>Recently added</span><small>Show all</small></div>
                    <div class="fw-grid">
                      <button
                        v-for="(t, i) in TRACKS.slice(0, 4)"
                        :key="t.title"
                        type="button"
                        class="fw-card"
                        :aria-label="`Play ${t.title}`"
                        @click="playIndex(i)"
                      >
                        <span class="fw-art" :style="artStyle(t)">
                          <span class="fw-card-play"><IconPause v-if="i === cur && playing" :size="13" class="fw-fill" /><IconPlay v-else :size="13" class="fw-fill" /></span>
                        </span>
                        <span class="fw-card-t" :class="{ cur: i === cur }">
                          <span v-if="i === cur && playing" class="fw-bars" aria-hidden="true"><i /><i /><i /></span>
                          <span class="fw-trunc">{{ t.title }}</span>
                        </span>
                        <span class="fw-card-a fw-trunc">{{ t.artist }}</span>
                      </button>
                    </div>
                  </div>
                  <div class="fw-player">
                    <canvas ref="stripCanvas" class="fw-strip" aria-hidden="true" />
                    <div class="fw-player-row">
                      <span class="fw-art fw-art-sm" :style="artStyle(track)" />
                      <span class="fw-np">
                        <b class="fw-trunc">{{ track.title }}</b>
                        <small class="fw-trunc">{{ track.artist }}</small>
                      </span>
                      <span class="fw-tp">
                        <button type="button" aria-label="Previous" @click="step(-1)"><IconSkipBack :size="15" class="fw-fill" /></button>
                        <button type="button" class="fw-play" :aria-label="playing ? 'Pause' : 'Play'" @click="togglePlay">
                          <IconPause v-if="playing" :size="15" class="fw-fill" />
                          <IconPlay v-else :size="15" class="fw-fill" />
                        </button>
                        <button type="button" aria-label="Next" @click="step(1)"><IconSkipForward :size="15" class="fw-fill" /></button>
                      </span>
                      <IconListMusic :size="15" class="fw-q" />
                    </div>
                  </div>
                  <nav class="fw-nav" aria-hidden="true">
                    <span class="on"><IconHouse :size="17" />Home</span>
                    <span><IconSearch :size="17" />Add</span>
                    <span><IconLibrary :size="17" />Library</span>
                    <span><IconUsers :size="17" />People</span>
                    <span><IconMessageSquare :size="17" />Inbox</span>
                  </nav>
                </div>

                <!-- SCREEN OFF -->
                <button type="button" class="fw-off" :class="{ on: scene === 'off' }" :tabindex="scene === 'off' ? 0 : -1" aria-label="Wake the phone" @click="wake">
                  <span class="fw-off-pill">
                    <span class="fw-bars" :class="{ paused: !playing }" aria-hidden="true"><i /><i /><i /></span>
                    {{ playing ? "screen off · still playing" : "screen off · paused" }}
                  </span>
                  <span class="fw-off-hint">tap to wake</span>
                </button>

                <!-- LOCK SCREEN -->
                <div class="fw-lock" :class="{ on: scene === 'lock' }" :inert="scene !== 'lock'">
                  <span class="fw-lock-wall" :style="artStyle(track)" aria-hidden="true" />
                  <div class="fw-status fw-status-lock">
                    <span />
                    <span class="fw-status-ic"><IconSignal :size="12" /><IconWifi :size="12" /><IconBatteryFull :size="15" /></span>
                  </div>
                  <IconLock :size="14" class="fw-lock-ic" />
                  <p class="fw-lock-date">{{ dateLabel }}</p>
                  <p class="fw-lock-time">{{ clock }}</p>
                  <div class="fw-media">
                    <div class="fw-media-top">
                      <span class="fw-art fw-art-md" :style="artStyle(track)" />
                      <span class="fw-np">
                        <b class="fw-trunc">{{ track.title }}</b>
                        <small class="fw-trunc">{{ track.artist }}</small>
                      </span>
                      <svg class="fw-media-app" viewBox="156 101 276 310" aria-label="flow">
                        <polygon points="406,256 181,385.9 181,126.1" fill="url(#fw-logo-grad)" stroke="url(#fw-logo-grad)" stroke-width="40" stroke-linejoin="round" />
                      </svg>
                    </div>
                    <div class="fw-scrub">
                      <span class="fw-scrub-bar"><i :style="{ transform: `scaleX(${pos / track.dur})` }" /></span>
                      <span class="fw-scrub-t"><span>{{ fmt(pos) }}</span><span>−{{ fmt(track.dur - pos) }}</span></span>
                    </div>
                    <div class="fw-media-tp">
                      <button type="button" aria-label="Previous track" @click="step(-1)"><IconSkipBack :size="22" class="fw-fill" /></button>
                      <button type="button" :aria-label="playing ? 'Pause' : 'Play'" @click="togglePlay">
                        <IconPause v-if="playing" :size="28" class="fw-fill" />
                        <IconPlay v-else :size="28" class="fw-fill" />
                      </button>
                      <button type="button" aria-label="Next track" @click="step(1)"><IconSkipForward :size="22" class="fw-fill" /></button>
                    </div>
                    <div class="fw-media-foot"><IconVolume2 :size="13" /><span class="fw-vol"><i /></span><IconAirplay :size="13" /></div>
                  </div>
                  <div class="fw-lock-foot" aria-hidden="true">
                    <span><IconFlashlight :size="16" /></span>
                    <span><IconCamera :size="16" /></span>
                  </div>
                </div>
                <span class="fw-island" aria-hidden="true" />
                <span class="fw-homebar" aria-hidden="true" />
              </div>
            </div>
          </div>

          <!-- callouts (wide screens) -->
          <div class="fw-callouts" aria-hidden="true">
            <span class="fw-callout c-app" :class="{ on: scene === 'app' }"><code>&lt;audio&gt;</code> mounted once in app.vue</span>
            <span class="fw-callout c-off" :class="{ on: scene === 'off' }"><code>206</code> m4a over HTTP Range, not an iframe</span>
            <span class="fw-callout c-lock" :class="{ on: scene === 'lock' }"><code>navigator.mediaSession</code> metadata + action handlers</span>
          </div>
        </div>

        <div class="fw-story">
          <p v-reveal class="v2-eyebrow">Live recreation · tap anything</p>
          <h3 v-reveal="60" class="fw-h3">Background playback is <span class="fw-grad">the whole point.</span></h3>
          <ol class="fw-steps">
            <li v-for="(s, i) in SCENES" :key="s.id" v-reveal="120 + i * 70">
              <button type="button" class="fw-step" :class="{ on: scene === s.id }" :aria-pressed="scene === s.id" @click="pickScene(s.id)">
                <span class="fw-step-n">{{ s.n }}</span>
                <span class="fw-step-txt">
                  <b>{{ s.title }}</b>
                  <span>{{ s.body }}</span>
                </span>
                <span v-if="scene === s.id && !reduced" :key="sceneKey" class="fw-step-prog" :style="{ animationDuration: `${s.ms}ms` }" />
              </button>
            </li>
          </ol>
          <div v-reveal="360" class="fw-demo">
            <button type="button" class="fw-demo-btn" :class="{ on: demoArmed }" :aria-pressed="demoArmed" @click="toggleDemo">
              <span class="fw-demo-ic">
                <IconVolume2 v-if="!demoArmed" :size="16" />
                <span v-else class="fw-bars" :class="{ paused: !demoOn }" aria-hidden="true"><i /><i /><i /></span>
              </span>
              {{ demoArmed ? "Stop the demo loop" : "Play a demo loop" }}
            </button>
            <p class="fw-demo-note">
              A tiny synth built live with WebAudio, kept quiet. While it plays, the visualizer reads a real
              <code>AnalyserNode</code> instead of the synthetic beat.
            </p>
          </div>
        </div>
      </div>

      <!-- ============ pipeline ============ -->
      <div ref="pipeEl" class="fw-pipe" :class="{ 'is-paused': !pipeIn || reduced }">
        <div class="fw-sub-head">
          <p v-reveal class="v2-eyebrow">Architecture</p>
          <h3 v-reveal="60" class="fw-h3">From a search box to <span class="fw-grad">a locked phone.</span></h3>
          <p v-reveal="120" class="fw-sub-lede">Every box is a decision the lock screen forced. Tap one for the detail that makes it work.</p>
        </div>

        <div v-reveal="160" class="fw-pipe-frame" :class="wide ? 'is-wide' : 'is-tall'">
          <svg ref="pipeSvg" :key="wide ? 'w' : 't'" class="fw-pipe-svg" :viewBox="layout.vb" role="group" aria-label="flow architecture pipeline">
            <defs>
              <filter id="fw-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
            </defs>
            <g class="fw-edges">
              <g v-for="e in layout.edges" :key="e.id" class="fw-edge" :class="[`k-${e.kind}`, { on: edgeOn(e) }]">
                <path :id="e.id" :d="e.d" class="fw-edge-base" />
                <path :d="e.d" class="fw-edge-flow" />
              </g>
            </g>
            <g v-if="!reduced" class="fw-packets">
              <template v-for="e in layout.edges" :key="`p-${e.id}`">
                <g v-for="k in 2" :key="k" :class="`fw-pk k-${e.kind}`">
                  <circle r="7" class="fw-pk-halo" filter="url(#fw-soft)" />
                  <circle r="3.2" class="fw-pk-core" />
                  <animateMotion
                    :dur="`${e.dur}s`"
                    :begin="`${-((k - 1) * e.dur) / 2}s`"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keyPoints="0;1"
                    keyTimes="0;1"
                    keySplines="0.45 0 0.25 1"
                  >
                    <mpath :href="`#${e.id}`" />
                  </animateMotion>
                </g>
              </template>
            </g>
            <g
              v-for="n in layout.nodes"
              :key="n.id"
              class="fw-node"
              :class="[`k-${n.kind}`, { on: pipeActive === n.id }]"
              :transform="`translate(${n.x - n.w / 2} ${n.y - n.h / 2})`"
              tabindex="0"
              role="button"
              :aria-pressed="pipeActive === n.id"
              :aria-label="`${n.label}: ${n.title}`"
              @click="pickNode(n.id)"
              @keydown.enter.prevent="pickNode(n.id)"
              @keydown.space.prevent="pickNode(n.id)"
            >
              <rect :width="n.w" :height="n.h" rx="14" class="fw-node-box" />
              <circle cx="20" :cy="n.h / 2" r="5" class="fw-node-dot" />
              <text x="34" :y="n.h / 2 - 3" class="fw-node-l">{{ n.label }}</text>
              <text x="34" :y="n.h / 2 + 14" class="fw-node-s">{{ n.sub }}</text>
            </g>
          </svg>
        </div>

        <div class="fw-pipe-detail" aria-live="polite">
          <div :key="activeNode.id" class="fw-pd-inner">
            <p class="fw-pd-k" :class="`k-${activeNode.kind}`">{{ activeNode.label }}</p>
            <h4>{{ activeNode.title }}</h4>
            <p class="fw-pd-b">{{ activeNode.body }}</p>
            <code class="fw-pd-code">{{ activeNode.code }}</code>
          </div>
          <div class="fw-pd-side">
            <ul class="fw-legend">
              <li class="k-audio"><i />audio bytes</li>
              <li class="k-meta"><i />metadata</li>
              <li class="k-ctrl"><i />matching · control</li>
            </ul>
            <button v-if="pipePinned && !reduced" type="button" class="fw-link" @click="resumePipe">Resume the tour ↻</button>
          </div>
        </div>
      </div>

      <!-- ============ spotify matcher ============ -->
      <div ref="impEl" class="fw-imp">
        <div class="fw-sub-head">
          <p v-reveal class="v2-eyebrow">Spotify import</p>
          <h3 v-reveal="60" class="fw-h3">Matching songs, <span class="fw-grad">not guessing.</span></h3>
          <p v-reveal="120" class="fw-sub-lede">
            Each Spotify track is searched on YouTube and every candidate is scored, with duration weighted most because a
            different length almost always means a different recording. Below 0.40 is reported as not found; below 0.72 is
            flagged for you to check. This runs the real formula.
          </p>
        </div>

        <div v-reveal="160" class="fw-imp-grid">
          <div class="fw-imp-list">
            <div class="fw-imp-src">
              <span class="fw-imp-cover" :style="artStyle(TRACKS[1]!)" />
              <span>
                <small>Spotify playlist</small>
                <b>Late Night Drives</b>
                <small>{{ IMPORT_SCORED.length }} songs · syncs in place on re-import</small>
              </span>
            </div>
            <ol>
              <li v-for="(t, i) in IMPORT_SCORED" :key="t.title" class="fw-imp-row" :class="`s-${impStatus(i)}`">
                <span class="fw-imp-i">{{ i + 1 }}</span>
                <span class="fw-imp-tt">
                  <b class="fw-trunc">{{ t.title }}</b>
                  <small class="fw-trunc">{{ t.artist }} · {{ fmt(t.dur) }}</small>
                </span>
                <span class="fw-imp-st">
                  <template v-if="impStatus(i) === 'ok'"><IconCheck :size="13" /> {{ t.top.toFixed(2) }}</template>
                  <template v-else-if="impStatus(i) === 'unsure'">check · {{ t.top.toFixed(2) }}</template>
                  <template v-else-if="impStatus(i) === 'miss'"><IconX :size="13" /> not found</template>
                  <template v-else-if="impStatus(i) === 'active'"><span class="fw-spin" />scoring</template>
                  <template v-else>queued</template>
                </span>
              </li>
            </ol>
            <p class="fw-imp-sum" :class="{ on: imp.phase === 'summary' || reduced }">
              <b>{{ IMPORT_SUMMARY.ok }}</b> matched · <b>{{ IMPORT_SUMMARY.unsure }}</b> to check ·
              <b>{{ IMPORT_SUMMARY.miss }}</b> not found <span>→ a matching flow playlist, name and cover included</span>
            </p>
          </div>

          <div class="fw-imp-cands" :class="`p-${imp.phase}`">
            <div class="fw-imp-ch">
              <small>YouTube candidates for</small>
              <b>{{ impCur.title }} <span>· {{ impCur.artist }} · {{ fmt(impCur.dur) }}</span></b>
            </div>
            <ul :key="impCur.title">
              <li
                v-for="(c, ci) in impCur.scored"
                :key="c.title"
                class="fw-cand"
                :class="{ best: impPicked && ci === impCur.best, dim: impPicked && ci !== impCur.best, [`st-${impCur.status}`]: true }"
                :style="{ '--d': `${ci * 140}ms` }"
              >
                <div class="fw-cand-top">
                  <span class="fw-cand-t">
                    <b class="fw-trunc">{{ c.title }}</b>
                    <small>{{ c.channel }} · {{ fmt(c.dur) }} <em :class="{ good: c.s.delta <= 5 }">Δ{{ c.s.delta }}s</em></small>
                  </span>
                  <span class="fw-cand-score">{{ impShowBars ? c.s.score.toFixed(2) : "–" }}</span>
                </div>
                <div class="fw-meter">
                  <span class="fw-meter-fill">
                    <i class="m-dur" :style="{ width: impShowBars ? `${c.s.dur * 100}%` : '0%' }" />
                    <i class="m-title" :style="{ width: impShowBars ? `${c.s.title * 100}%` : '0%' }" />
                    <i class="m-artist" :style="{ width: impShowBars ? `${c.s.artist * 100}%` : '0%' }" />
                  </span>
                  <span v-if="impShowBars && c.s.penalty" class="fw-meter-pen" :style="{ left: `${Math.max(0, c.s.score) * 100}%`, width: `${Math.min(c.s.penalty, c.s.dur + c.s.title + c.s.artist - c.s.score) * 100}%` }" />
                  <span class="fw-tick t40" />
                  <span class="fw-tick t72" />
                </div>
                <div v-if="c.s.notes.length" class="fw-cand-notes">
                  <span v-for="n in c.s.notes" :key="n">{{ n }}</span>
                </div>
                <span v-if="impPicked && ci === impCur.best" class="fw-cand-badge">
                  <template v-if="impCur.status === 'ok'"><IconCheck :size="12" /> best match</template>
                  <template v-else-if="impCur.status === 'unsure'">uncertain · flagged</template>
                  <template v-else>below 0.40 · not found</template>
                </span>
              </li>
            </ul>
            <div class="fw-imp-key">
              <span><i class="m-dur" />duration ·45</span>
              <span><i class="m-title" />title ·35</span>
              <span><i class="m-artist" />artist ·20</span>
              <span class="k-tick">| 0.40 · 0.72</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ feature grid ============ -->
      <ul class="fw-feats">
        <li v-for="(f, i) in FEATURES" :key="f.title" v-reveal="i * 70" class="fw-feat">
          <span class="fw-feat-ic">
            <IconCirclePlay v-if="f.icon === 'play'" :size="18" />
            <IconFilm v-else-if="f.icon === 'film'" :size="18" />
            <IconUsers v-else-if="f.icon === 'users'" :size="18" />
            <IconKeyRound v-else-if="f.icon === 'key'" :size="18" />
            <IconContainer v-else-if="f.icon === 'box'" :size="18" />
            <IconSmartphone v-else :size="18" />
          </span>
          <h4>{{ f.title }}</h4>
          <p>{{ f.body }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.world {
  --fl-green: #22c55e;
  --fl-lime: #84cc16;
  --fl-amber: #f59e0b;
  --fl-grad: linear-gradient(110deg, var(--fl-green), var(--fl-lime) 52%, var(--fl-amber));
  --app-bg: #121212;
  --app-card: #1c1c1c;
  --app-side: #0b0b0b;
  --app-border: #2e2e2e;
  --app-muted: #a3a3a3;
  position: relative;
  min-height: 100vh;
  padding: clamp(80px, 12vw, 160px) 0;
  overflow-x: clip;
  isolation: isolate;
  color: var(--text);
}
.fw-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.fw-aura {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(60% 40% at 15% 8%, rgba(34, 197, 94, 0.13), transparent 70%),
    radial-gradient(50% 35% at 90% 30%, rgba(245, 158, 11, 0.08), transparent 70%),
    radial-gradient(60% 30% at 50% 70%, rgba(132, 204, 22, 0.06), transparent 70%);
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 85%, transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 85%, transparent);
}
.fw-inner {
  position: relative;
}
.fw-grad {
  background: var(--fl-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
code {
  font-family: var(--font-mono);
}

/* cuts slide by exactly one wavelength → seamless loop */
.fw-cut {
  animation: fw-cut linear infinite;
}
@keyframes fw-cut {
  to {
    transform: translateX(var(--wl));
  }
}
.is-reduced .fw-cut {
  animation: none;
}

/* ---------- header ---------- */
.fw-head {
  display: grid;
  gap: clamp(32px, 5vw, 64px);
  align-items: end;
}
@media (min-width: 1000px) {
  .fw-head {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  }
}
.fw-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--fl-lime);
}
.fw-logo {
  width: 22px;
  height: 25px;
}
.fw-word {
  margin: 14px 0 0;
  line-height: 0;
  --beat: 0;
}
.fw-word-svg {
  display: block;
  width: min(100%, 720px);
  height: auto;
  overflow: visible;
}
.fw-word-text,
.fw-word-glow {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 236px;
  letter-spacing: -0.02em;
}
.fw-word-text {
  fill: url(#fw-word-grad);
}
.fw-word-glow {
  fill: url(#fw-word-grad);
  filter: blur(26px);
  opacity: calc(0.22 + var(--beat) * 0.4);
}
.fw-tagline {
  margin: 18px 0 0;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(20px, 2.6vw, 32px);
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.fw-lede {
  margin: 18px 0 0;
}
.fw-lede strong {
  color: var(--text);
  font-weight: 600;
}
.fw-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 26px 0 0;
}
.fw-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--border);
}
.fw-stat {
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  padding: clamp(16px, 2vw, 24px);
  min-width: 0;
}
.fw-stat dt {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(34px, 4.4vw, 56px);
  line-height: 1;
  background: var(--fl-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.fw-stat dd {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}
.fw-stat dd b {
  display: block;
  color: var(--text);
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 12.5px;
  margin-bottom: 2px;
}

/* ---------- show ---------- */
.fw-show {
  position: relative;
  display: grid;
  gap: clamp(40px, 6vw, 72px);
  align-items: center;
  margin-top: clamp(72px, 10vw, 140px);
}
@media (min-width: 1000px) {
  .fw-show {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  }
}
.fw-stage-canvas {
  position: absolute;
  top: -160px;
  bottom: -160px;
  left: 50%;
  width: 100vw;
  height: calc(100% + 320px);
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 0;
  -webkit-mask-image: radial-gradient(ellipse 70% 62% at var(--cx, 50%) var(--cy, 50%), #000 35%, transparent 100%);
  mask-image: radial-gradient(ellipse 70% 62% at var(--cx, 50%) var(--cy, 50%), #000 35%, transparent 100%);
}
@media (max-width: 999px) {
  .fw-stage-canvas {
    -webkit-mask-image: radial-gradient(ellipse 90% 40% at var(--cx, 50%) var(--cy, 30%), #000 40%, transparent 100%);
    mask-image: radial-gradient(ellipse 90% 40% at var(--cx, 50%) var(--cy, 30%), #000 40%, transparent 100%);
  }
}
.fw-phone-col {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding: 28px 0;
}
.fw-story {
  position: relative;
  z-index: 1;
}

/* phone: designed at 300×650, scaled */
.fw-phone-wrap {
  --s: 1;
  width: calc(300px * var(--s));
  height: calc(650px * var(--s));
}
@media (max-width: 420px) {
  .fw-phone-wrap {
    --s: 0.86;
  }
}
.fw-phone {
  width: 300px;
  height: 650px;
  transform: scale(var(--s));
  transform-origin: top left;
  border-radius: 50px;
  padding: 10px;
  background: linear-gradient(145deg, #3a3a40, #16161a 40%, #2a2a30);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 0 0 2px #0a0a0c,
    0 40px 80px -20px rgba(0, 0, 0, 0.8),
    0 0 120px -30px rgba(34, 197, 94, 0.35);
  position: relative;
}
.fw-phone::before,
.fw-phone::after {
  content: "";
  position: absolute;
  width: 3px;
  border-radius: 2px;
  background: #2a2a30;
}
.fw-phone::before {
  left: -3px;
  top: 150px;
  height: 56px;
  box-shadow: 0 72px 0 #2a2a30;
}
.fw-phone::after {
  right: -3px;
  top: 190px;
  height: 84px;
}
.fw-screen {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 40px;
  overflow: hidden;
  background: #000;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #f5f5f5;
  isolation: isolate;
}
.fw-island {
  position: absolute;
  top: 10px;
  left: 50%;
  width: 84px;
  height: 24px;
  margin-left: -42px;
  border-radius: 14px;
  background: #000;
  z-index: 5;
}
.fw-homebar {
  position: absolute;
  bottom: 6px;
  left: 50%;
  width: 100px;
  height: 4px;
  margin-left: -50px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.55);
  z-index: 5;
}
.fw-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 44px;
  padding: 6px 26px 0 30px;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.fw-status-ic {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.fw-fill {
  fill: currentColor;
}
.fw-trunc {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fw-screen button {
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}

/* layers */
.fw-app,
.fw-off,
.fw-lock {
  position: absolute;
  inset: 0;
  transition:
    opacity 0.6s var(--ease-out),
    filter 0.6s var(--ease-out),
    transform 0.8s var(--ease-out);
}
.fw-app {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, color-mix(in srgb, var(--fl-green) 16%, var(--app-bg)) 0, var(--app-bg) 300px);
  opacity: 0;
  filter: brightness(0.2);
  transform: scale(0.98);
  pointer-events: none;
}
.fw-app.on {
  opacity: 1;
  filter: none;
  transform: none;
  pointer-events: auto;
}
.fw-app-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 4px 14px 0;
}
.fw-app-head h4 {
  margin: 4px 0 10px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.fw-app-btns {
  display: flex;
  gap: 8px;
}
.fw-screen .fw-btn-p,
.fw-screen .fw-btn-s {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}
.fw-screen .fw-btn-p {
  background: var(--fl-green);
  color: #052e12;
}
.fw-screen .fw-btn-s {
  background: #2b2b2b;
}
.fw-app-sec {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 18px 0 10px;
  font-size: 15px;
  font-weight: 700;
}
.fw-app-sec small {
  font-size: 11px;
  font-weight: 500;
  color: var(--app-muted);
}
.fw-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.fw-screen .fw-card {
  display: block;
  text-align: left;
  background: var(--app-card);
  border-radius: 12px;
  padding: 8px;
  transition: background 0.2s;
  min-width: 0;
}
.fw-screen .fw-card:hover {
  background: #262626;
}
.fw-art {
  position: relative;
  display: block;
  border-radius: 8px;
  overflow: hidden;
}
.fw-art::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-radial-gradient(circle at 110% 110%, transparent 0 9px, rgba(255, 255, 255, 0.07) 9px 10px);
}
.fw-card .fw-art {
  aspect-ratio: 1;
  box-shadow: 0 8px 18px -8px rgba(0, 0, 0, 0.7);
}
.fw-card-play {
  position: absolute;
  right: 6px;
  bottom: 6px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--fl-green);
  color: #052e12;
  opacity: 0;
  transform: translateY(4px);
  transition: 0.25s var(--ease-out);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.5);
}
.fw-card:hover .fw-card-play,
.fw-card:focus-visible .fw-card-play {
  opacity: 1;
  transform: none;
}
.fw-card-t {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  min-width: 0;
}
.fw-card-t.cur {
  color: var(--fl-green);
}
.fw-card-a {
  margin-top: 1px;
  font-size: 11px;
  color: var(--app-muted);
}

/* NowPlayingBars */
.fw-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 10px;
  flex-shrink: 0;
}
.fw-bars i {
  width: 2px;
  height: 100%;
  border-radius: 1px;
  background: currentColor;
  transform-origin: bottom;
  animation: fw-eq 0.9s ease-in-out infinite;
}
.fw-bars i:nth-child(2) {
  animation-delay: -0.3s;
  animation-duration: 0.7s;
}
.fw-bars i:nth-child(3) {
  animation-delay: -0.55s;
  animation-duration: 1.1s;
}
.fw-bars.paused i {
  animation-play-state: paused;
}
@keyframes fw-eq {
  0%,
  100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}

.fw-player {
  flex-shrink: 0;
  background: var(--app-side);
  border-top: 1px solid var(--app-border);
  padding: 4px 10px 8px;
}
.fw-strip {
  display: block;
  width: 100%;
  height: 20px;
}
.fw-player-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 9px;
}
.fw-art-sm {
  width: 40px;
  height: 40px;
  border-radius: 6px;
}
.fw-np {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.fw-np b {
  font-size: 12.5px;
  font-weight: 600;
}
.fw-np small {
  font-size: 11px;
  color: var(--app-muted);
}
.fw-tp {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.fw-screen .fw-tp button {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  color: var(--app-muted);
}
.fw-screen .fw-tp .fw-play {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--fl-green);
  color: #052e12;
}
.fw-q {
  color: var(--app-muted);
}
.fw-nav {
  flex-shrink: 0;
  display: flex;
  justify-content: space-around;
  background: var(--app-side);
  border-top: 1px solid var(--app-border);
  padding: 7px 4px 18px;
  font-size: 9.5px;
  font-weight: 500;
  color: var(--app-muted);
}
.fw-nav span {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.fw-nav .on {
  color: var(--fl-green);
}

/* screen off */
.fw-screen .fw-off {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: radial-gradient(80% 50% at 50% 0%, rgba(255, 255, 255, 0.05), transparent 60%), #000;
  opacity: 0;
  pointer-events: none;
}
.fw-screen .fw-off.on {
  opacity: 1;
  pointer-events: auto;
}
.fw-off-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(132, 204, 22, 0.35);
  background: rgba(34, 197, 94, 0.08);
  color: var(--fl-lime);
  font-family: var(--font-mono);
  font-size: 11px;
}
.fw-off-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.28);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

/* lock screen */
.fw-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0;
  transform: scale(1.04);
  pointer-events: none;
  background: #050507;
}
.fw-lock.on {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
.fw-lock-wall {
  position: absolute;
  inset: -40px;
  border-radius: 0;
  filter: blur(40px) saturate(1.3);
  opacity: 0.75;
  transition: background 0.8s;
}
.fw-lock-wall::after {
  display: none;
}
.fw-lock > :not(.fw-lock-wall) {
  position: relative;
}
.fw-status-lock {
  width: 100%;
}
.fw-lock-ic {
  margin-top: 4px;
  opacity: 0.9;
}
.fw-lock-date {
  margin: 10px 0 0;
  font-size: 15px;
  font-weight: 500;
  opacity: 0.85;
}
.fw-lock-time {
  margin: 0;
  font-size: 82px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
}
.fw-media {
  width: calc(100% - 24px);
  margin-top: auto;
  margin-bottom: 14px;
  padding: 14px 14px 10px;
  border-radius: 24px;
  background: rgba(30, 30, 34, 0.55);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.6);
}
.fw-lock.on .fw-media {
  animation: fw-rise 0.9s var(--ease-out) both 0.15s;
}
@keyframes fw-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
}
.fw-media-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}
.fw-art-md {
  width: 46px;
  height: 46px;
  border-radius: 9px;
}
.fw-media .fw-np b {
  font-size: 13.5px;
}
.fw-media .fw-np small {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}
.fw-media-app {
  width: 18px;
  height: 20px;
  align-self: start;
}
.fw-scrub {
  margin-top: 14px;
}
.fw-scrub-bar {
  display: block;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}
.fw-scrub-bar i {
  display: block;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  transform-origin: left;
  transition: transform 1s linear;
}
.fw-scrub-t {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.5);
}
.fw-media-tp {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 34px;
  margin-top: 6px;
}
.fw-screen .fw-media-tp button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  transition: background 0.2s;
}
.fw-screen .fw-media-tp button:hover {
  background: rgba(255, 255, 255, 0.1);
}
.fw-media-foot {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.55);
}
.fw-vol {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}
.fw-vol i {
  display: block;
  width: 62%;
  height: 100%;
  background: rgba(255, 255, 255, 0.75);
}
.fw-lock-foot {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 0 34px 26px;
}
.fw-lock-foot span {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

/* callouts */
.fw-callouts {
  display: none;
}
@media (min-width: 1180px) {
  .fw-callouts {
    display: block;
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .fw-callout {
    position: absolute;
    max-width: 172px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--border-strong);
    background: color-mix(in srgb, var(--bg) 70%, transparent);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-2);
    opacity: 0;
    transform: translateY(8px);
    transition:
      opacity 0.5s var(--ease-out),
      transform 0.5s var(--ease-out);
  }
  .fw-callout code {
    display: block;
    margin-bottom: 3px;
    color: var(--fl-lime);
    font-size: 11px;
    overflow-wrap: anywhere;
  }
  .fw-callout.on {
    opacity: 1;
    transform: none;
    transition-delay: 0.35s;
  }
  .fw-callout::before {
    content: "";
    position: absolute;
    top: 50%;
    width: 34px;
    height: 1px;
    background: linear-gradient(90deg, var(--fl-lime), transparent);
  }
  .c-app {
    right: calc(50% + 168px);
    top: 74%;
  }
  .c-app::before {
    left: 100%;
    background: linear-gradient(90deg, transparent, var(--fl-lime));
  }
  .c-off {
    right: calc(50% + 168px);
    top: 40%;
  }
  .c-off::before {
    left: 100%;
    background: linear-gradient(90deg, transparent, var(--fl-lime));
  }
  .c-lock {
    right: calc(50% + 168px);
    top: 64%;
  }
  .c-lock::before {
    left: 100%;
    background: linear-gradient(90deg, transparent, var(--fl-lime));
  }
}

/* story */
.fw-h3 {
  margin: 12px 0 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(26px, 3.6vw, 44px);
  letter-spacing: -0.02em;
  line-height: 1.08;
}
.fw-steps {
  list-style: none;
  padding: 0;
  margin: 28px 0 0;
  display: grid;
  gap: 10px;
}
.fw-step {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  width: 100%;
  text-align: left;
  padding: 16px 18px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 72%, transparent);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: var(--text-2);
  font: inherit;
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.3s,
    background 0.3s;
}
.fw-step:hover {
  border-color: var(--border-strong);
}
.fw-step.on {
  border-color: color-mix(in srgb, var(--fl-lime) 45%, transparent);
  background: color-mix(in srgb, var(--fl-green) 8%, var(--bg));
}
.fw-step-n {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
  padding-top: 2px;
}
.fw-step.on .fw-step-n {
  color: var(--fl-lime);
}
.fw-step-txt b {
  display: block;
  color: var(--text);
  font-size: 16px;
  font-weight: 600;
}
.fw-step-txt span {
  display: block;
  margin-top: 4px;
  font-size: 14px;
  line-height: 1.55;
}
.fw-step-prog {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  width: 100%;
  background: var(--fl-grad);
  transform-origin: left;
  animation: fw-prog linear both;
}
@keyframes fw-prog {
  from {
    transform: scaleX(0);
  }
}
.fw-demo {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 18px;
}
.fw-demo-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 20px 0 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--fl-lime) 40%, transparent);
  background: color-mix(in srgb, var(--fl-green) 10%, transparent);
  color: var(--text);
  font: 600 14px var(--font-sans);
  cursor: pointer;
  transition:
    background 0.25s,
    transform 0.25s var(--ease-out);
}
.fw-demo-btn:hover {
  background: color-mix(in srgb, var(--fl-green) 18%, transparent);
  transform: translateY(-1px);
}
.fw-demo-ic {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--fl-green);
  color: #052e12;
}
.fw-demo-btn.on .fw-demo-ic .fw-bars {
  height: 12px;
}
.fw-demo-note {
  flex: 1 1 240px;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
}
.fw-demo-note code {
  color: var(--text-2);
  font-size: 12px;
}

/* ---------- shared sub-heads ---------- */
.fw-sub-head {
  max-width: 760px;
}
.fw-sub-lede {
  margin: 14px 0 0;
  color: var(--text-2);
  font-size: clamp(15px, 1.4vw, 17px);
  line-height: 1.6;
}

/* ---------- pipeline ---------- */
.fw-pipe {
  margin-top: clamp(96px, 13vw, 180px);
}
.fw-pipe-frame {
  margin-top: 36px;
  padding: clamp(10px, 2vw, 24px);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background:
    radial-gradient(80% 120% at 50% 0%, rgba(34, 197, 94, 0.06), transparent 60%),
    linear-gradient(var(--surface), var(--surface));
  background-size: auto;
  position: relative;
  overflow: hidden;
}
.fw-pipe-frame::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: 22px 22px;
  -webkit-mask-image: radial-gradient(ellipse at center, #000, transparent 75%);
  mask-image: radial-gradient(ellipse at center, #000, transparent 75%);
  pointer-events: none;
}
.fw-pipe-svg {
  position: relative;
  display: block;
  width: 100%;
  height: auto;
  margin-inline: auto;
}
.fw-pipe-frame.is-tall .fw-pipe-svg {
  max-width: 440px;
}
.fw-edge-base {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 1.5;
}
.fw-edge-flow {
  fill: none;
  stroke-width: 1.6;
  stroke-dasharray: 3 9;
  stroke-linecap: round;
  opacity: 0.35;
  animation: fw-dash 1.1s linear infinite;
  transition:
    opacity 0.4s,
    stroke-width 0.4s;
}
.fw-edge.on .fw-edge-flow {
  opacity: 1;
  stroke-width: 2.4;
}
@keyframes fw-dash {
  to {
    stroke-dashoffset: -12;
  }
}
.k-audio .fw-edge-flow {
  stroke: var(--fl-green);
}
.k-meta .fw-edge-flow {
  stroke: var(--cyan);
}
.k-ctrl .fw-edge-flow {
  stroke: var(--fl-amber);
}
.fw-pk.k-audio {
  fill: #6ee79a;
}
.fw-pk.k-meta {
  fill: #7fd3f0;
}
.fw-pk.k-ctrl {
  fill: #fbbf47;
}
.fw-pk-halo {
  opacity: 0.6;
}
.fw-node {
  cursor: pointer;
  outline: none;
}
.fw-node-box {
  fill: #121218;
  stroke: rgba(255, 255, 255, 0.12);
  stroke-width: 1;
  transition:
    stroke 0.3s,
    fill 0.3s;
}
.fw-node:hover .fw-node-box,
.fw-node:focus-visible .fw-node-box {
  stroke: rgba(255, 255, 255, 0.35);
}
.fw-node.on .fw-node-box {
  fill: #16201a;
  stroke: var(--fl-lime);
  stroke-width: 1.5;
}
.fw-node-dot {
  fill: var(--muted);
  transition: fill 0.3s;
}
.fw-node.k-src .fw-node-dot {
  fill: var(--fl-amber);
}
.fw-node.k-srv .fw-node-dot {
  fill: var(--violet);
}
.fw-node.k-store .fw-node-dot {
  fill: var(--cyan);
}
.fw-node.k-net .fw-node-dot {
  fill: var(--pink);
}
.fw-node.k-client .fw-node-dot {
  fill: var(--fl-green);
}
.fw-node.on .fw-node-dot {
  filter: drop-shadow(0 0 6px currentColor);
}
.fw-node-l {
  fill: var(--text);
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 15px;
}
.fw-node-s {
  fill: var(--muted);
  font-family: var(--font-mono);
  font-size: 11px;
}
.is-tall .fw-node-l {
  font-size: 14px;
}
.is-tall .fw-node-s {
  font-size: 10.5px;
}
.fw-pipe.is-paused .fw-edge-flow {
  animation-play-state: paused;
}
.fw-pipe-detail {
  display: grid;
  gap: 20px;
  margin-top: 18px;
  padding: clamp(18px, 2.4vw, 28px);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
}
@media (min-width: 800px) {
  .fw-pipe-detail {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }
}
.fw-pd-inner {
  animation: fw-in 0.5s var(--ease-out);
  min-width: 0;
}
@keyframes fw-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
.fw-pd-k {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fl-lime);
}
.fw-pipe-detail h4 {
  margin: 8px 0 0;
  font-family: var(--font-display);
  font-size: clamp(18px, 2vw, 24px);
  font-weight: 600;
  letter-spacing: -0.01em;
}
.fw-pd-b {
  margin: 10px 0 0;
  color: var(--text-2);
  line-height: 1.6;
  max-width: 72ch;
}
.fw-pd-code {
  display: inline-block;
  max-width: 100%;
  margin-top: 14px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border);
  color: var(--fl-lime);
  font-size: 12.5px;
  overflow-wrap: anywhere;
}
.fw-pd-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: flex-start;
}
.fw-legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
}
.fw-legend li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.fw-legend i {
  width: 18px;
  height: 2px;
  border-radius: 1px;
}
.fw-legend .k-audio i {
  background: var(--fl-green);
}
.fw-legend .k-meta i {
  background: var(--cyan);
}
.fw-legend .k-ctrl i {
  background: var(--fl-amber);
}
.fw-link {
  background: none;
  border: 0;
  padding: 0;
  color: var(--fl-lime);
  font: 500 13px var(--font-mono);
  cursor: pointer;
}

/* ---------- importer ---------- */
.fw-imp {
  margin-top: clamp(96px, 13vw, 180px);
}
.fw-imp-grid {
  display: grid;
  gap: 16px;
  margin-top: 36px;
}
@media (min-width: 900px) {
  .fw-imp-grid {
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  }
}
.fw-imp-list,
.fw-imp-cands {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  padding: clamp(14px, 2vw, 22px);
  min-width: 0;
}
.fw-imp-src {
  display: flex;
  gap: 14px;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.fw-imp-cover {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  flex-shrink: 0;
}
.fw-imp-src > span:last-child {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.fw-imp-src small {
  font-size: 12px;
  color: var(--muted);
}
.fw-imp-src b {
  font-size: 17px;
  margin: 1px 0;
}
.fw-imp-list ol {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}
.fw-imp-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 9px 8px;
  border-radius: 10px;
  transition: background 0.3s;
}
.fw-imp-row.s-active {
  background: rgba(255, 255, 255, 0.05);
}
.fw-imp-i {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
  text-align: right;
}
.fw-imp-tt {
  min-width: 0;
}
.fw-imp-tt b {
  font-size: 14px;
  font-weight: 600;
}
.fw-imp-tt small {
  font-size: 12px;
  color: var(--muted);
}
.fw-imp-st {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  border: 1px solid var(--border);
  white-space: nowrap;
}
.s-ok .fw-imp-st {
  color: var(--fl-green);
  border-color: color-mix(in srgb, var(--fl-green) 40%, transparent);
  background: color-mix(in srgb, var(--fl-green) 10%, transparent);
}
.s-unsure .fw-imp-st {
  color: var(--fl-amber);
  border-color: color-mix(in srgb, var(--fl-amber) 40%, transparent);
  background: color-mix(in srgb, var(--fl-amber) 10%, transparent);
}
.s-miss .fw-imp-st {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.08);
}
.s-active .fw-imp-st {
  color: var(--text);
}
.fw-spin {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  border-right-color: transparent;
  animation: fw-spin 0.8s linear infinite;
}
@keyframes fw-spin {
  to {
    transform: rotate(1turn);
  }
}
.fw-imp-sum {
  margin: 12px 0 0;
  padding: 12px 8px 0;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-2);
  opacity: 0.35;
  transition: opacity 0.5s;
}
.fw-imp-sum.on {
  opacity: 1;
}
.fw-imp-sum b {
  color: var(--text);
  font-family: var(--font-mono);
}
.fw-imp-sum span {
  display: block;
  margin-top: 3px;
  color: var(--muted);
}
.fw-imp-ch {
  display: flex;
  flex-direction: column;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
  min-width: 0;
}
.fw-imp-ch small {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.fw-imp-ch b {
  margin-top: 4px;
  font-size: 17px;
}
.fw-imp-ch b span {
  font-weight: 400;
  color: var(--muted);
  font-size: 14px;
}
.fw-imp-cands ul {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 10px;
}
.fw-cand {
  position: relative;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.25);
  animation: fw-in 0.5s var(--ease-out) both;
  animation-delay: var(--d);
  transition:
    opacity 0.4s,
    border-color 0.4s,
    background 0.4s;
}
.fw-cand.dim {
  opacity: 0.45;
}
.fw-cand.best.st-ok {
  border-color: color-mix(in srgb, var(--fl-green) 60%, transparent);
  background: color-mix(in srgb, var(--fl-green) 8%, transparent);
}
.fw-cand.best.st-unsure {
  border-color: color-mix(in srgb, var(--fl-amber) 60%, transparent);
  background: color-mix(in srgb, var(--fl-amber) 7%, transparent);
}
.fw-cand.best.st-miss {
  border-color: rgba(248, 113, 113, 0.5);
}
.fw-cand-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}
.fw-cand-t {
  min-width: 0;
}
.fw-cand-t b {
  font-size: 14px;
  font-weight: 600;
}
.fw-cand-t small {
  font-size: 12px;
  color: var(--muted);
}
.fw-cand-t em {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 11px;
  color: #f8a171;
}
.fw-cand-t em.good {
  color: var(--fl-green);
}
.fw-cand-score {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
.fw-meter {
  position: relative;
  height: 8px;
  margin-top: 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
}
.fw-meter-fill {
  position: absolute;
  inset: 0;
  display: flex;
  border-radius: 4px;
  overflow: hidden;
}
.fw-meter-fill i {
  display: block;
  height: 100%;
  transition: width 0.9s var(--ease-out);
  transition-delay: var(--d);
}
.m-dur {
  background: var(--fl-green);
}
.m-title {
  background: var(--fl-lime);
}
.m-artist {
  background: var(--fl-amber);
}
.fw-meter-pen {
  position: absolute;
  top: 0;
  height: 100%;
  background: repeating-linear-gradient(135deg, rgba(248, 113, 113, 0.75) 0 3px, rgba(248, 113, 113, 0.15) 3px 6px);
  border-radius: 0 4px 4px 0;
  animation: fw-in 0.5s var(--ease-out) both 0.8s;
}
.fw-tick {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 1px;
  background: rgba(255, 255, 255, 0.45);
}
.t40 {
  left: 40%;
}
.t72 {
  left: 72%;
}
.fw-cand-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.fw-cand-notes span {
  font-family: var(--font-mono);
  font-size: 11px;
  color: #f87171;
}
.fw-cand-badge {
  position: absolute;
  top: -9px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 600;
  color: #052e12;
  background: var(--fl-green);
  animation: fw-pop 0.45s var(--ease-out) both;
}
.st-unsure .fw-cand-badge {
  background: var(--fl-amber);
  color: #3a2502;
}
.st-miss .fw-cand-badge {
  background: #f87171;
  color: #3b0909;
}
@keyframes fw-pop {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
}
.fw-imp-key {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
}
.fw-imp-key span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.fw-imp-key i {
  width: 10px;
  height: 6px;
  border-radius: 2px;
}

/* ---------- features ---------- */
.fw-feats {
  list-style: none;
  padding: 0;
  margin: clamp(72px, 10vw, 140px) 0 0;
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
}
.fw-feat {
  position: relative;
  padding: 22px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  overflow: hidden;
  transition:
    border-color 0.3s,
    transform 0.4s var(--ease-out);
}
.fw-feat::after {
  content: "";
  position: absolute;
  inset: auto -30% -60% -30%;
  height: 80%;
  background: radial-gradient(closest-side, rgba(132, 204, 22, 0.12), transparent);
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
}
.fw-feat:hover {
  border-color: var(--border-strong);
  transform: translateY(-3px);
}
.fw-feat:hover::after {
  opacity: 1;
}
.fw-feat-ic {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  color: var(--fl-lime);
  background: color-mix(in srgb, var(--fl-green) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--fl-green) 28%, transparent);
}
.fw-feat h4 {
  margin: 16px 0 0;
  font-size: 17px;
  font-weight: 700;
}
.fw-feat p {
  margin: 8px 0 0;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.6;
}

/* ---------- reduced motion ---------- */
.is-reduced .fw-app,
.is-reduced .fw-off,
.is-reduced .fw-lock,
.is-reduced .fw-scrub-bar i,
.is-reduced .fw-meter-fill i {
  transition: none;
}
.is-reduced .fw-bars i,
.is-reduced .fw-edge-flow,
.is-reduced .fw-spin,
.is-reduced .fw-cand,
.is-reduced .fw-pd-inner,
.is-reduced .fw-media,
.is-reduced .fw-cand-badge,
.is-reduced .fw-meter-pen {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  .fw-cut,
  .fw-bars i,
  .fw-edge-flow {
    animation: none;
  }
}
</style>
