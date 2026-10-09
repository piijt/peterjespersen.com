<script setup lang="ts">
// Trade-Raid world: case study for trade-raid.com (Steam skins → World of Warcraft gold).
// Kinetic title, live stats, 3D device showcase (pointer + scroll), the ported "how it works" stage
// from the production app, an architecture lane and a feature grid with looping micro-animations.
// Every loop pauses off-screen (.idle) and reduced motion gets a static end state (.reduced).

const STEP_MS = 3200;
const GOLD = 12500;
const A = "/worlds/trade-raid";

type IconName = "user" | "checkCircle" | "swap" | "mail" | "check" | "arrow" | "lock";
const ICON: Record<IconName, string[]> = {
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"],
  checkCircle: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M8 12.5l2.8 2.8 5.7-5.8"],
  swap: ["M4 8h14l-3.5-3.5", "M20 16H6l3.5 3.5"],
  mail: ["M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M3.5 7l8.5 6 8.5-6"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  arrow: ["M7 17L17 7", "M8 7h9v9"],
  lock: ["M8 11V8a4 4 0 0 1 8 0v3", "M6 11h12v9H6z"],
};

const steps: { icon: IconName; title: string; text: string }[] = [
  { icon: "user", title: "Sign in with Steam", text: "Log in through Steam and add your trade link." },
  { icon: "checkCircle", title: "Pick your items", text: "Choose your skins, game version, realm and character." },
  { icon: "swap", title: "Accept the trade offer", text: "The bot sends an offer — accept and confirm it on Steam." },
  { icon: "mail", title: "Receive your gold", text: "Gold arrives in your in-game mailbox or via the Auction House." },
];

const games = ["cs2", "dota2", "rust", "tf2"] as const;
const items = games.map((g) => ({ src: `${A}/${g}.png`, alt: `${g.toUpperCase()} item` }));

// background drift: x/y in %, size px, duration s, delay s, far = smaller/blurred layer
const floaters = [
  { src: "cs2", x: 4, y: 5, s: 64, t: 13, d: 0, far: false },
  { src: "dota2", x: 88, y: 3, s: 58, t: 16, d: -3, far: false },
  { src: "rust", x: 93, y: 34, s: 50, t: 12, d: -6, far: false },
  { src: "tf2", x: 2, y: 41, s: 54, t: 15, d: -2, far: false },
  { src: "steam", x: 86, y: 66, s: 46, t: 18, d: -8, far: false },
  { src: "wow-midnight", x: 5, y: 78, s: 62, t: 17, d: -5, far: false },
  { src: "cs2", x: 58, y: 1, s: 34, t: 11, d: -4, far: true },
  { src: "rust", x: 42, y: 95, s: 36, t: 14, d: -7, far: true },
  { src: "dota2", x: 72, y: 88, s: 30, t: 19, d: -9, far: true },
  { src: "tf2", x: 30, y: 22, s: 28, t: 13, d: -1, far: true },
];
const coins = [
  { x: 76, y: 20, s: 18, t: 9, d: -2 },
  { x: 18, y: 28, s: 14, t: 11, d: -5 },
  { x: 64, y: 58, s: 12, t: 10, d: -1 },
  { x: 12, y: 62, s: 16, t: 12, d: -7 },
  { x: 95, y: 82, s: 14, t: 8, d: -3 },
];

const left = "TRADE".split("");
const right = "RAID".split("");

type Stat = { from: number; to: number; label: string; suffix?: string; group?: boolean; coin?: boolean };
const stats: Stat[] = [
  { from: 2010, to: 2019, label: "live in production since" },
  { from: 0, to: 7000, suffix: "+", label: "orders completed", group: true },
  { from: 0, to: 25, suffix: "M", label: "gold given away in giveaways", coin: true },
  { from: 0, to: 158, label: "Trustpilot reviews" },
];
const statVals = ref(stats.map((s) => s.to));
const fmt = (n: number, s: Stat) => (s.group ? n.toLocaleString("en-US") : String(n)) + (s.suffix ?? "");

const stack = ["Nuxt 4", "Vue 3", "TypeScript", "Node.js", "Express", "MongoDB", "Steam Web API", "Docker"];

const arch = [
  { k: "Storefront", v: "Nuxt 4 · Vue 3 · TS" },
  { k: "API", v: "Express · MongoDB · pricing" },
  { k: "Trade bots", v: "steam-tradeoffer-manager" },
  { k: "Steam", v: "Steam Web API" },
];

// ---------------------------------------------------------------- state
const root = ref<HTMLElement>();
const headEl = ref<HTMLElement>();
const statsEl = ref<HTMLElement>();
const showEl = ref<HTMLElement>();
const stageEl = ref<HTMLElement>();

const inView = useInView(root, "200px 0px 200px 0px");
const headIn = useInView(headEl);
const statsIn = useInView(statsEl);
const showIn = useInView(showEl, "120px 0px 120px 0px");
const stageIn = useInView(stageEl);
const reduced = useReducedMotion();

const lit = ref(false);
watch([headIn, reduced], ([h, r]) => { if (h || r) lit.value = true; });

// ---------------------------------------------------------------- tweens
const rafs = new Set<number>();
function tween(dur: number, fn: (k: number) => void) {
  const start = performance.now();
  let id = 0;
  const tick = (now: number) => {
    rafs.delete(id);
    const t = Math.min(1, (now - start) / dur);
    fn(1 - Math.pow(1 - t, 3));
    if (t < 1) { id = requestAnimationFrame(tick); rafs.add(id); }
  };
  id = requestAnimationFrame(tick);
  rafs.add(id);
}

let statsDone = false;
onMounted(() => {
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) statVals.value = stats.map((s) => s.from);
});
watch([statsIn, reduced], ([on, r]) => {
  if (r) { statsDone = true; statVals.value = stats.map((s) => s.to); return; }
  if (!on || statsDone) return;
  statsDone = true;
  stats.forEach((s, i) => tween(1800 + i * 250, (k) => { statVals.value[i] = Math.round(s.from + (s.to - s.from) * k); }));
});

// ---------------------------------------------------------------- how-it-works stage (ported)
const step = ref(0);
const gold = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
let goldRaf = 0;

function countGold() {
  cancelAnimationFrame(goldRaf);
  if (reduced.value) { gold.value = GOLD; return; }
  const start = performance.now();
  const dur = STEP_MS * 0.7;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    gold.value = Math.round(GOLD * (1 - Math.pow(1 - t, 3)));
    if (t < 1) goldRaf = requestAnimationFrame(tick);
  };
  goldRaf = requestAnimationFrame(tick);
}
watch(step, (s) => {
  if (s === 3) countGold();
  else if (s === 0) { cancelAnimationFrame(goldRaf); gold.value = 0; }
});

const stageRunning = computed(() => stageIn.value && !reduced.value);
function play() {
  stop();
  timer = setInterval(() => (step.value = (step.value + 1) % steps.length), STEP_MS);
}
function stop() {
  clearInterval(timer);
  timer = undefined;
}
function goTo(i: number) {
  step.value = i;
  if (i === 3) countGold();
  if (stageRunning.value) play();
}
watch(stageRunning, (on) => (on ? play() : stop()));
watch(reduced, (r) => {
  if (!r) return;
  stop();
  step.value = 3;
  cancelAnimationFrame(goldRaf);
  gold.value = GOLD;
});

// ---------------------------------------------------------------- 3D showcase (pointer + scroll)
let tRx = 0, tRy = 0, rx = 0, ry = 0;
let tP = 0.2, p = 0.2;
let tMx = 50, tMy = 30, mx = 50, my = 30;
let showRaf = 0;

function kick() { if (!showRaf) showRaf = requestAnimationFrame(frame); }
function frame() {
  showRaf = 0;
  const el = showEl.value;
  if (!el) return;
  rx += (tRx - rx) * 0.08;
  ry += (tRy - ry) * 0.08;
  p += (tP - p) * 0.1;
  mx += (tMx - mx) * 0.08;
  my += (tMy - my) * 0.08;
  const e = Math.min(1, Math.max(0, (p - 0.08) / 0.42));
  const ease = 1 - Math.pow(1 - e, 3);
  el.style.setProperty("--rx", `${(24 - 18 * ease + rx).toFixed(2)}deg`);
  el.style.setProperty("--ry", `${(-20 + 11 * ease + ry).toFixed(2)}deg`);
  el.style.setProperty("--lift", `${((0.5 - p) * 150).toFixed(1)}px`);
  el.style.setProperty("--sink", `${((p - 0.5) * 110).toFixed(1)}px`);
  el.style.setProperty("--mx", `${mx.toFixed(1)}%`);
  el.style.setProperty("--my", `${my.toFixed(1)}%`);
  const rest = Math.abs(tRx - rx) + Math.abs(tRy - ry) + Math.abs(tP - p) * 100 + Math.abs(tMx - mx) * 0.1 + Math.abs(tMy - my) * 0.1;
  if (rest > 0.02) kick();
}
function onShowMove(e: PointerEvent) {
  if (reduced.value || e.pointerType !== "mouse" || !showEl.value) return;
  const r = showEl.value.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.height;
  tRy = (px - 0.5) * 14;
  tRx = -(py - 0.5) * 10;
  tMx = px * 100;
  tMy = py * 100;
  kick();
}
function onShowLeave() {
  tRx = 0; tRy = 0; tMx = 50; tMy = 30;
  if (!reduced.value) kick();
}
function onScroll() {
  const el = showEl.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  tP = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
  kick();
}
let listening = false;
function listen(on: boolean) {
  if (on === listening) return;
  listening = on;
  if (on) { window.addEventListener("scroll", onScroll, { passive: true }); onScroll(); }
  else window.removeEventListener("scroll", onScroll);
}
watch([showIn, reduced], ([on, r]) => listen(on && !r));

onBeforeUnmount(() => {
  stop();
  cancelAnimationFrame(goldRaf);
  cancelAnimationFrame(showRaf);
  rafs.forEach((id) => cancelAnimationFrame(id));
  rafs.clear();
  listen(false);
});
</script>

<template>
  <section id="trade-raid" ref="root" class="world" :class="{ idle: !inView, reduced }">
    <!-- ambient background -->
    <div class="bg" aria-hidden="true">
      <span class="glow g1" />
      <span class="glow g2" />
      <span class="glow g3" />
      <div class="marquee"><span>STEAM SKINS ⟶ WOW GOLD ✦ STEAM SKINS ⟶ WOW GOLD ✦&nbsp;</span><span>STEAM SKINS ⟶ WOW GOLD ✦ STEAM SKINS ⟶ WOW GOLD ✦&nbsp;</span></div>
      <img
        v-for="(f, i) in floaters" :key="`f${i}`" :src="`${A}/${f.src}.png`" alt="" class="floater" :class="{ far: f.far, extra: i > 5 }"
        :style="{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.s}px`, height: `${f.s}px`, animationDuration: `${f.t}s`, animationDelay: `${f.d}s` }"
        width="76" height="76" loading="lazy"
      >
      <span
        v-for="(c, i) in coins" :key="`c${i}`" class="fcoin"
        :style="{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.s}px`, height: `${c.s}px`, animationDuration: `${c.t}s`, animationDelay: `${c.d}s` }"
      />
    </div>

    <div class="v2-container inner">
      <!-- ============ head ============ -->
      <header ref="headEl" class="head">
        <p v-reveal class="v2-eyebrow eyebrow">
          <span class="live"><i />live</span> Case study · 2019 → today · solo-built
        </p>
        <h2 class="title" :class="{ lit }" aria-label="Trade-Raid">
          <span class="word" aria-hidden="true">
            <span v-for="(c, i) in left" :key="`l${i}`" class="ch" :style="{ '--i': i }">{{ c }}</span>
          </span>
          <span class="mark" aria-hidden="true" :style="{ '--i': 5 }">
            <img :src="`${A}/logo-icon.png`" alt="" width="136" height="219">
          </span>
          <span class="word" aria-hidden="true">
            <span v-for="(c, i) in right" :key="`r${i}`" class="ch" :style="{ '--i': i + 6 }">{{ c }}</span>
          </span>
        </h2>
        <p v-reveal="120" class="v2-lede lede">
          Trade your <strong>CS2, DOTA2, RUST and TF2</strong> skins for <strong class="gold-t">World of Warcraft gold</strong>.
          I designed, built and run the whole platform — storefront, API, Steam trading bots and pricing engine.
        </p>
        <div v-reveal="200" class="cta-row">
          <a class="cta" href="https://trade-raid.com" target="_blank" rel="noopener">
            Visit trade-raid.com
            <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path v-for="(d, k) in ICON.arrow" :key="k" :d="d" /></svg>
          </a>
          <span class="games">
            <img v-for="g in games" :key="g" :src="`${A}/${g}.png`" :alt="g.toUpperCase()" width="28" height="28" loading="lazy">
            <span class="arrow-mini">⟶</span>
            <img :src="`${A}/wow-midnight.png`" alt="World of Warcraft" width="28" height="28" loading="lazy">
          </span>
        </div>
      </header>

      <!-- ============ stats ============ -->
      <dl ref="statsEl" class="stats">
        <div v-for="(s, i) in stats" :key="s.label" v-reveal="i * 90" class="stat">
          <dt>{{ s.label }}</dt>
          <dd>
            <span v-if="s.coin" class="coin sm" aria-hidden="true" />
            {{ fmt(statVals[i] ?? s.to, s) }}
          </dd>
        </div>
      </dl>

      <!-- ============ 3D showcase ============ -->
      <div ref="showEl" v-reveal class="show" @pointermove="onShowMove" @pointerleave="onShowLeave">
        <div class="floor" aria-hidden="true"><span /></div>
        <div class="scene">
          <figure class="win win-trade">
            <div class="bar"><i /><i /><i /><span class="url">trade-raid.com/trade</span></div>
            <div class="screen">
              <img src="/shots/trade-raid/trade.png" alt="Trade-Raid trade page: Steam inventory, trading details and WoW game version picker" width="1440" height="900" loading="lazy">
              <span class="sheen" />
            </div>
          </figure>
          <figure class="win win-home">
            <div class="bar">
              <i /><i /><i />
              <span class="url">
                <svg class="ic lock" viewBox="0 0 24 24" aria-hidden="true"><path v-for="(d, k) in ICON.lock" :key="k" :d="d" /></svg>
                trade-raid.com
              </span>
            </div>
            <div class="screen">
              <img src="/shots/trade-raid/home.png" alt="Trade-Raid landing page with the animated how-it-works stage" width="1440" height="900" loading="lazy">
              <span class="sheen" />
            </div>
          </figure>
          <figure class="phone">
            <div class="screen">
              <img src="/shots/trade-raid/home-mobile.png" alt="Trade-Raid on a phone" width="390" height="844" loading="lazy">
              <span class="sheen" />
            </div>
            <span class="notch" />
          </figure>
          <span class="callout c1"><span class="coin sm" aria-hidden="true" />Skins → gold, priced live</span>
          <span class="callout c2"><span class="dot" />Bot sends the Steam offer</span>
        </div>
      </div>

      <!-- ============ how it works (ported from trade-raid.com) ============ -->
      <div class="block-head">
        <p v-reveal class="v2-eyebrow">The core loop</p>
        <h3 v-reveal="80" class="h3">One trade, <span class="tr-grad">four steps</span>, zero middlemen.</h3>
      </div>

      <div ref="stageEl" v-reveal class="hiw">
        <div class="stage" :class="`s${step}`" aria-hidden="true">
          <div class="node inv">
            <div class="node-head">
              <img :src="`${A}/steam.png`" alt="" width="22" height="22">Steam inventory
            </div>
            <div class="tiles">
              <div v-for="(it, i) in items" :key="i" class="tile" :style="{ '--i': i }">
                <img :src="it.src" :alt="it.alt" width="40" height="40">
                <span class="tick"><svg class="ic" viewBox="0 0 24 24"><path :d="ICON.check[0]" /></svg></span>
              </div>
            </div>
          </div>

          <div class="lane lane-in">
            <span class="track" />
            <img v-for="(it, i) in items" :key="i" :src="it.src" alt="" class="packet" :style="{ '--i': i }" width="26" height="26">
          </div>

          <div class="hub">
            <span class="halo" />
            <span class="halo h2" />
            <span class="ring" />
            <span class="core"><img :src="`${A}/logo-icon.png`" alt="" width="136" height="219"></span>
          </div>

          <div class="lane lane-out">
            <span class="track" />
            <span v-for="i in 5" :key="i" class="packet coin" :style="{ '--i': i - 1 }" />
          </div>

          <div class="node mail">
            <div class="node-head">
              <img :src="`${A}/wow-midnight.png`" alt="" width="22" height="22">WoW mailbox
            </div>
            <div class="mail-body">
              <div class="mailbox">
                <svg class="ic" viewBox="0 0 24 24"><path v-for="(d, k) in ICON.mail" :key="k" :d="d" /></svg>
                <span class="badge-new">1</span>
              </div>
              <div class="gold">
                <span class="coin sm" />
                <strong>{{ gold.toLocaleString("en-US") }}</strong>
              </div>
            </div>
          </div>
        </div>

        <ol class="steps">
          <li v-for="(s, i) in steps" :key="s.title">
            <button type="button" class="step" :class="{ on: step === i, done: step > i }" :aria-current="step === i ? 'step' : undefined" @click="goTo(i)">
              <span class="num">
                <svg v-if="step > i" class="ic" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICON.check[0]" /></svg>
                <template v-else>{{ i + 1 }}</template>
              </span>
              <span class="step-copy">
                <strong>{{ s.title }}</strong>
                <span>{{ s.text }}</span>
              </span>
              <span v-if="step === i && !reduced" :key="`p${step}`" class="progress" :style="{ animationDuration: `${STEP_MS}ms` }" />
            </button>
          </li>
        </ol>
      </div>

      <!-- ============ what I built ============ -->
      <div class="block-head">
        <p v-reveal class="v2-eyebrow">Under the hood</p>
        <h3 v-reveal="80" class="h3">Every layer, <span class="tr-grad">built and run by me</span>.</h3>
      </div>

      <ol v-reveal class="arch" aria-label="Architecture">
        <li v-for="(n, i) in arch" :key="n.k" class="arch-node" :style="{ '--i': i }">
          <strong>{{ n.k }}</strong><span>{{ n.v }}</span>
          <span v-if="i < arch.length - 1" class="wire" aria-hidden="true"><i /><i /><i /></span>
        </li>
      </ol>

      <div class="grid">
        <!-- trade bot -->
        <article v-reveal class="card">
          <div class="viz viz-bot" aria-hidden="true">
            <span class="bot">
              <svg viewBox="0 0 48 48"><rect x="8" y="14" width="32" height="24" rx="8" /><path d="M24 14V7" /><circle cx="24" cy="6" r="2.5" /><circle class="eye" cx="18" cy="26" r="3" /><circle class="eye" cx="30" cy="26" r="3" /></svg>
            </span>
            <span class="path" />
            <span class="offer">
              <img :src="`${A}/cs2.png`" alt="" width="18" height="18"><img :src="`${A}/rust.png`" alt="" width="18" height="18"><b>offer</b>
            </span>
            <span class="steam"><img :src="`${A}/steam.png`" alt="" width="34" height="34"><span class="ok"><svg class="ic" viewBox="0 0 24 24"><path :d="ICON.check[0]" /></svg></span></span>
          </div>
          <h4>Steam trading-bot service</h4>
          <p>A separate service that sends trade offers to customers with <code>steam-tradeoffer-manager</code> and follows each one through to an accepted trade.</p>
        </article>

        <!-- pricing engine -->
        <article v-reveal="90" class="card">
          <div class="viz viz-price" aria-hidden="true">
            <div class="formula">
              <span class="tok">steam price</span><span class="op">×</span><span class="tok">rate<small>version · region</small></span><span class="op">=</span>
              <span class="coin big" />
            </div>
            <div class="bonus">
              <span class="b b1">+ event bonus %</span>
              <span class="b b2">+10% · &gt;10 items</span>
            </div>
          </div>
          <h4>Pricing engine</h4>
          <p>Converts Steam market prices into gold per game version and region, layered with event bonus percentages and a +10% bucket bonus for selecting more than 10 items.</p>
        </article>

        <!-- stacked items -->
        <article v-reveal="90" class="card">
          <div class="viz viz-stack" aria-hidden="true">
            <span v-for="n in 4" :key="n" class="st" :style="{ '--n': n - 1 }"><img :src="`${A}/rust.png`" alt="" width="34" height="34"></span>
            <span class="qty">× qty</span>
          </div>
          <h4>Stacked items</h4>
          <p>Rust-style stacked items are handled as quantities, so a stack is priced, selected and traded correctly instead of as a single skin.</p>
        </article>
      </div>

      <!-- ============ stack + CTA ============ -->
      <div v-reveal class="foot">
        <ul class="chips">
          <li v-for="t in stack" :key="t" class="v2-chip">{{ t }}</li>
        </ul>
        <a class="cta ghost" href="https://trade-raid.com" target="_blank" rel="noopener">
          See it live
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path v-for="(d, k) in ICON.arrow" :key="k" :d="d" /></svg>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.world {
  --tr1: #5666ff;
  --tr2: #4b90ff;
  --tr-grad: linear-gradient(120deg, #5666ff, #4b90ff);
  --tr-gold: #f2c94c;
  --s3: rgba(255, 255, 255, 0.1);
  --s4: rgba(255, 255, 255, 0.18);
  position: relative; min-height: 100vh; overflow: clip; isolation: isolate;
  padding-block: clamp(80px, 12vw, 160px);
  background: var(--bg);
}
.inner { position: relative; z-index: 1; }
.ic { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; flex: none; }

/* ---------------------------------------------------------------- background */
.bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
  -webkit-mask: linear-gradient(transparent, #000 10%, #000 88%, transparent); mask: linear-gradient(transparent, #000 10%, #000 88%, transparent); }
.glow { position: absolute; border-radius: 50%; filter: blur(20px); animation: breathe 12s ease-in-out infinite; }
.g1 { left: -10%; top: 2%; width: 70vw; height: 70vw; max-width: 1000px; max-height: 1000px; background: radial-gradient(circle, rgba(86, 102, 255, 0.22), transparent 62%); }
.g2 { right: -15%; top: 38%; width: 60vw; height: 60vw; max-width: 900px; max-height: 900px; background: radial-gradient(circle, rgba(75, 144, 255, 0.16), transparent 62%); animation-delay: -4s; }
.g3 { left: 20%; bottom: 0; width: 60vw; height: 40vw; background: radial-gradient(ellipse, rgba(242, 201, 76, 0.08), transparent 62%); animation-delay: -8s; }
@keyframes breathe { 50% { transform: scale(1.12) translate(2%, -2%); opacity: 0.8; } }

.marquee {
  position: absolute; top: clamp(30px, 6vw, 90px); left: 0; display: flex; width: max-content; white-space: nowrap;
  font-family: var(--font-display); font-weight: 800; font-size: clamp(56px, 11vw, 170px); line-height: 1; letter-spacing: -0.02em;
  color: transparent; -webkit-text-stroke: 1px rgba(140, 155, 255, 0.1); transform: rotate(-4deg); transform-origin: left;
}
.marquee span { display: block; animation: marquee 60s linear infinite; }
@keyframes marquee { to { transform: translateX(-100%); } }

.floater { position: absolute; object-fit: contain; opacity: 0.55; animation: drift 14s ease-in-out infinite alternate;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.6)) saturate(0.9); }
.floater.far { opacity: 0.22; filter: blur(2px); }
@keyframes drift {
  0% { transform: translate3d(0, 0, 0) rotate(-8deg); }
  50% { transform: translate3d(14px, -26px, 0) rotate(6deg); }
  100% { transform: translate3d(-10px, 18px, 0) rotate(-2deg); }
}
.fcoin { position: absolute; border-radius: 50%; opacity: 0.7; animation: drift 10s ease-in-out infinite alternate;
  background: radial-gradient(circle at 35% 35%, #ffe68a, #f2c94c 55%, #b8860b); box-shadow: 0 0 18px rgba(242, 201, 76, 0.5); }

/* ---------------------------------------------------------------- head */
.head { position: relative; }
.eyebrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: #8fa0ff; }
.live { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 7px; border-radius: 999px; background: rgba(60, 240, 185, 0.1); color: var(--mint); border: 1px solid rgba(60, 240, 185, 0.25); }
.live i { width: 7px; height: 7px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 0 0 rgba(60, 240, 185, 0.6); animation: ping 1.8s ease-out infinite; }
@keyframes ping { 70%, 100% { box-shadow: 0 0 0 8px rgba(60, 240, 185, 0); } }

.title {
  display: flex; align-items: center; gap: 0.06em; margin: 18px 0 0; perspective: 800px;
  font-family: var(--font-display); font-weight: 800; letter-spacing: -0.04em; line-height: 0.95;
  font-size: clamp(34px, 10.4vw, 150px);
}
.word { display: inline-flex; }
.ch {
  display: inline-block; transform-origin: 50% 100%;
  background: linear-gradient(180deg, #fff 18%, #b9c2ff 55%, #5d6dff 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  opacity: 0; transform: translateY(0.5em) rotateX(-75deg);
  transition: opacity 0.7s var(--ease-out), transform 0.9s var(--ease-out);
  transition-delay: calc(var(--i) * 55ms);
}
.title.lit .ch { opacity: 1; transform: none; animation: shine 6s ease-in-out infinite; animation-delay: calc(1.4s + var(--i) * 90ms); }
.title.lit .ch:hover { animation: hop 0.5s var(--ease-out); }
@keyframes shine {
  0%, 12%, 100% { text-shadow: 0 0 0 rgba(86, 102, 255, 0); }
  5% { text-shadow: 0 0 28px rgba(110, 130, 255, 0.85), 0 0 60px rgba(75, 144, 255, 0.45); }
}
@keyframes hop { 40% { transform: translateY(-0.12em) rotate(-4deg); } }
.mark { display: inline-grid; place-items: center; height: 1.05em; width: 0.62em; margin-inline: 0.02em; opacity: 0; transform: scale(0.4) rotate(-40deg);
  transition: opacity 0.8s var(--ease-out) 0.3s, transform 1.1s var(--ease-out) 0.3s; }
.mark img { height: 100%; width: auto; filter: drop-shadow(0 0 24px rgba(160, 230, 120, 0.35)); }
.title.lit .mark { opacity: 1; transform: none; }
.title.lit .mark img { animation: float-mark 5s ease-in-out infinite; }
@keyframes float-mark { 50% { transform: translateY(-0.06em) rotate(4deg); filter: drop-shadow(0 0 36px rgba(160, 230, 120, 0.55)); } }

.lede { margin-top: clamp(18px, 2.5vw, 28px); }
.lede strong { color: var(--text); font-weight: 600; }
.lede .gold-t { color: var(--tr-gold); }
.cta-row { display: flex; align-items: center; gap: 18px 24px; flex-wrap: wrap; margin-top: 28px; }
.cta {
  position: relative; display: inline-flex; align-items: center; gap: 10px; padding: 14px 22px; border-radius: 999px; overflow: hidden;
  font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: #fff; text-decoration: none;
  background: var(--tr-grad); box-shadow: 0 10px 40px -10px rgba(86, 102, 255, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: transform 0.3s var(--ease-out), box-shadow 0.3s;
}
.cta::after { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.35) 50%, transparent 65%); transform: translateX(-120%); transition: transform 0.7s var(--ease-out); }
.cta:hover { transform: translateY(-2px); box-shadow: 0 16px 50px -10px rgba(86, 102, 255, 1), inset 0 1px 0 rgba(255, 255, 255, 0.25); }
.cta:hover::after { transform: translateX(120%); }
.cta .ic { transition: transform 0.3s var(--ease-out); }
.cta:hover .ic { transform: translate(2px, -2px); }
.cta.ghost { background: rgba(86, 102, 255, 0.12); border: 1px solid rgba(86, 102, 255, 0.5); box-shadow: none; }
.games { display: inline-flex; align-items: center; gap: 8px; }
.games img { width: 28px; height: 28px; object-fit: contain; }
.arrow-mini { color: var(--tr-gold); font-family: var(--font-mono); }

/* ---------------------------------------------------------------- stats */
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; margin: clamp(48px, 7vw, 88px) 0 0; padding: 0;
  border-radius: var(--radius-lg); overflow: hidden; background: var(--border); border: 1px solid var(--border); }
.stat { display: flex; flex-direction: column-reverse; gap: 6px; padding: clamp(18px, 2.4vw, 28px); background: rgba(14, 14, 22, 0.92); }
.stat dt { font-family: var(--font-mono); font-size: 12px; color: var(--muted); letter-spacing: 0.04em; }
.stat dd { margin: 0; display: flex; align-items: center; gap: 10px; font-family: var(--font-display); font-weight: 800; font-size: clamp(28px, 3.6vw, 48px);
  letter-spacing: -0.03em; font-variant-numeric: tabular-nums; color: var(--text); }
.stat:nth-child(3) dd { color: var(--tr-gold); }
.coin { display: inline-block; flex: none; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ffe68a, #f2c94c 55%, #b8860b);
  box-shadow: 0 0 12px rgba(242, 201, 76, 0.55); position: relative; overflow: hidden; }
.coin::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.85) 50%, transparent 65%); transform: translateX(-120%); animation: coin-shine 2.8s ease-in-out infinite; }
@keyframes coin-shine { 55%, 100% { transform: translateX(120%); } }
.coin.sm { width: 0.62em; height: 0.62em; font-size: inherit; }
.gold .coin.sm { width: 14px; height: 14px; }
.callout .coin.sm { width: 12px; height: 12px; }
.coin.big { width: 34px; height: 34px; }

/* ---------------------------------------------------------------- 3D showcase */
.show {
  --rx: 24deg; --ry: -20deg; --lift: 40px; --sink: -30px; --mx: 50%; --my: 30%;
  position: relative; margin: clamp(56px, 8vw, 110px) auto 0; aspect-ratio: 16 / 10.4; max-width: 1120px; perspective: 1700px;
}
.scene { position: absolute; inset: 0; transform-style: preserve-3d; transform: rotateX(var(--rx)) rotateY(var(--ry)); will-change: transform; }
.win { position: absolute; margin: 0; border-radius: 14px; overflow: hidden; background: #12131c; border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 40px 120px -30px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(86, 102, 255, 0.15), 0 0 80px -20px rgba(86, 102, 255, 0.45); }
.win-home { left: 2%; top: 9%; width: 74%; transform: translateZ(0); -webkit-box-reflect: below 14px linear-gradient(transparent 72%, rgba(255, 255, 255, 0.1)); }
.win-trade { right: 0; top: 0; width: 50%; transform: translateZ(-170px) translateY(var(--sink)); opacity: 0.8; }
.bar { display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; background: linear-gradient(#1b1d2a, #161824); border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.bar i { width: 9px; height: 9px; border-radius: 50%; background: #ff5f57; }
.bar i:nth-child(2) { background: #febc2e; }
.bar i:nth-child(3) { background: #28c840; }
.url { display: inline-flex; align-items: center; gap: 6px; margin: 0 auto; padding: 3px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.06);
  font-family: var(--font-mono); font-size: 11px; color: var(--text-2); white-space: nowrap; }
.url .lock { font-size: 10px; color: var(--mint); }
.screen { position: relative; overflow: hidden; }
.screen img { display: block; width: 100%; height: auto; }
.sheen { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: screen;
  background: radial-gradient(600px circle at var(--mx) var(--my), rgba(255, 255, 255, 0.12), transparent 45%),
    linear-gradient(125deg, rgba(255, 255, 255, 0.1) 0%, transparent 28%, transparent 70%, rgba(86, 102, 255, 0.08)); }
.phone { position: absolute; margin: 0; right: 7%; bottom: -3%; width: 19%; padding: 7px; border-radius: 30px; background: linear-gradient(145deg, #2a2c3a, #0e0f16);
  border: 1px solid rgba(255, 255, 255, 0.16); transform: translateZ(150px) translateY(var(--lift));
  box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.95), 0 0 60px -10px rgba(75, 144, 255, 0.5); }
.phone .screen { border-radius: 23px; aspect-ratio: 390 / 844; }
.phone .screen img { height: 100%; object-fit: cover; object-position: top; }
.notch { position: absolute; top: 12px; left: 50%; width: 30%; height: 12px; transform: translateX(-50%); border-radius: 999px; background: #05050a; }
.callout {
  position: absolute; display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 999px; white-space: nowrap;
  font-family: var(--font-mono); font-size: 12px; color: var(--text); background: rgba(18, 19, 30, 0.75); border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.8);
  animation: bob 5s ease-in-out infinite;
}
.callout .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 10px var(--mint); }
.c1 { left: -2%; bottom: 14%; transform: translateZ(220px); }
.c2 { right: 24%; top: 4%; transform: translateZ(120px); animation-delay: -2.5s; }
@keyframes bob { 50% { margin-top: -10px; } }
.floor { position: absolute; left: -35%; right: -35%; bottom: -22%; height: 70%; transform: rotateX(76deg); transform-origin: 50% 100%; overflow: hidden;
  -webkit-mask: radial-gradient(ellipse at 50% 100%, #000 10%, transparent 65%); mask: radial-gradient(ellipse at 50% 100%, #000 10%, transparent 65%); }
.floor span { position: absolute; inset: -60px 0 0; animation: floor 3s linear infinite;
  background-image: linear-gradient(rgba(86, 102, 255, 0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(86, 102, 255, 0.35) 1px, transparent 1px);
  background-size: 60px 60px; }
@keyframes floor { to { transform: translateY(60px); } }

/* ---------------------------------------------------------------- block heads */
.block-head { margin-top: clamp(80px, 11vw, 150px); margin-bottom: clamp(24px, 3vw, 36px); }
.h3 { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em; line-height: 1.08; font-size: clamp(26px, 4vw, 48px); margin: 10px 0 0; max-width: 22ch; }
.tr-grad { background: linear-gradient(120deg, #8a96ff, #4b90ff 60%, #7fc4ff); -webkit-background-clip: text; background-clip: text; color: transparent; }

/* ---------------------------------------------------------------- stage (ported from trade-raid.com HowItWorks) */
.hiw { display: flex; flex-direction: column; gap: 16px; }
.stage {
  position: relative; display: grid; align-items: stretch;
  grid-template-columns: minmax(0, 1fr) minmax(40px, 140px) auto minmax(40px, 140px) minmax(0, 1fr);
  padding: clamp(18px, 3vw, 36px); overflow: hidden; border-radius: var(--radius-lg); border: 1px solid var(--border);
  background: radial-gradient(circle at 50% 50%, rgba(86, 102, 255, 0.22), transparent 55%), linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  box-shadow: 0 30px 80px -40px rgba(86, 102, 255, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
.stage::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px); background-size: 18px 18px;
  -webkit-mask: radial-gradient(ellipse at center, #000, transparent 70%); mask: radial-gradient(ellipse at center, #000, transparent 70%); }
.node { position: relative; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--s3); border-radius: var(--radius-lg); padding: 14px; transition: border-color 0.4s, box-shadow 0.4s; min-width: 0; }
.node-head { display: flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px; color: var(--text-2); white-space: nowrap; overflow: hidden; }
.node-head img { width: 22px; height: 22px; object-fit: contain; flex: none; }
.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.tile { position: relative; display: grid; place-items: center; aspect-ratio: 1; border-radius: var(--radius); background: var(--s3); border: 2px solid transparent;
  transition: border-color 0.3s, opacity 0.4s, transform 0.4s; transition-delay: calc(var(--i) * 90ms); }
.tile img { width: 56%; height: 56%; object-fit: contain; }
.tick { position: absolute; top: -6px; right: -6px; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; font-size: 11px;
  background: var(--tr2); color: #fff; transform: scale(0); transition: transform 0.25s; transition-delay: inherit; }
.tick .ic { stroke-width: 3.4; }

.hub { --hub: clamp(72px, 10vw, 112px); position: relative; align-self: center; width: var(--hub); height: var(--hub); display: grid; place-items: center; }
.core { position: relative; z-index: 1; width: 78%; height: 78%; border-radius: 50%; display: grid; place-items: center; background: var(--bg); border: 2px solid var(--s3);
  transition: border-color 0.4s, box-shadow 0.4s; }
.core img { height: calc(var(--hub) * 0.46); width: auto; }
.ring { position: absolute; inset: 0; border-radius: 50%; border: 2px dashed rgba(75, 144, 255, 0.35); }
.halo { position: absolute; inset: 10%; border-radius: 50%; border: 2px solid rgba(75, 144, 255, 0.6); opacity: 0; }

.lane { position: relative; align-self: center; height: 32px; }
.track { position: absolute; left: 0; right: 0; top: 50%; height: 2px; transform: translateY(-50%); overflow: hidden;
  background: repeating-linear-gradient(90deg, var(--s4) 0 8px, transparent 8px 14px); }
.track::after { content: ""; position: absolute; inset: 0; width: 40%; opacity: 0; background: linear-gradient(90deg, transparent, #7fa8ff, transparent); }
.lane-out .track::after { background: linear-gradient(90deg, transparent, #ffe68a, transparent); }
.packet { position: absolute; top: 50%; left: 0; width: 26px; height: 26px; margin-top: -13px; object-fit: contain; opacity: 0; filter: drop-shadow(0 2px 8px rgba(86, 102, 255, 0.8)); }
.packet.coin { width: 16px; height: 16px; margin-top: -8px; filter: none; box-shadow: 0 0 12px rgba(242, 201, 76, 0.75); }

.mail { text-align: center; display: flex; flex-direction: column; }
.mail .node-head { justify-content: center; }
.mail-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.mailbox { position: relative; display: inline-grid; place-items: center; width: 84px; height: 84px; border-radius: var(--radius); background: var(--s3); color: var(--text-2);
  font-size: 40px; transition: color 0.4s, transform 0.4s; }
.mailbox .ic { stroke-width: 1.8; }
.badge-new { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; border-radius: 9px; padding: 0 4px; background: #ff4d6a; color: #fff;
  font-family: var(--font-sans); font-size: 11px; font-weight: 800; display: grid; place-items: center; transform: scale(0); transition: transform 0.3s; }
.gold { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 14px; font-family: var(--font-display); font-size: clamp(15px, 2.2vw, 24px); font-variant-numeric: tabular-nums; }
.gold strong { color: var(--tr-gold); font-weight: 800; }

/* step states */
.s0 .inv { border-color: var(--tr2); box-shadow: 0 0 0 4px rgba(75, 144, 255, 0.15); }
.s1 .tile, .s2 .tile { border-color: var(--tr2); }
.s1 .tick, .s2 .tick { transform: scale(1); }
.s1 .tile { transform: translateY(-2px); }
.s2 .tile { opacity: 0.3; transform: scale(0.92); }
.s2 .lane-in .packet { animation: travel 1.1s cubic-bezier(0.5, 0, 0.5, 1) both; animation-delay: calc(var(--i) * 260ms); }
.s2 .lane-in .track::after { animation: sweep 0.9s linear infinite; }
.s2 .core, .s3 .core { border-color: var(--tr2); box-shadow: 0 0 28px rgba(75, 144, 255, 0.65); }
.s2 .ring, .s3 .ring { animation: spin 4s linear infinite; border-color: rgba(75, 144, 255, 0.85); }
.s2 .halo, .s3 .halo { animation: halo 1.6s ease-out infinite; }
.s2 .halo.h2, .s3 .halo.h2 { animation-delay: 0.8s; }
.s3 .tile { opacity: 0.3; }
.s3 .lane-out .packet { animation: travel 1s cubic-bezier(0.5, 0, 0.5, 1) both; animation-delay: calc(var(--i) * 180ms); }
.s3 .lane-out .track::after { animation: sweep 0.9s linear infinite; }
.s3 .mail { border-color: var(--tr-gold); box-shadow: 0 0 0 4px rgba(242, 201, 76, 0.15), 0 0 50px -10px rgba(242, 201, 76, 0.4); }
.s3 .mailbox { color: var(--tr-gold); animation: pop 0.5s 0.9s both; }
.s3 .badge-new { transform: scale(1); transition-delay: 0.9s; }

@keyframes travel {
  0% { left: 0; opacity: 0; transform: scale(0.6); }
  15% { opacity: 1; transform: scale(1); }
  85% { opacity: 1; transform: scale(1); }
  100% { left: calc(100% - 26px); opacity: 0; transform: scale(0.6); }
}
@keyframes sweep { 0% { opacity: 1; transform: translateX(-100%); } 100% { opacity: 1; transform: translateX(260%); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes halo { 0% { opacity: 0.8; transform: scale(0.9); } 100% { opacity: 0; transform: scale(1.7); } }
@keyframes pop { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }

/* step cards */
.steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.step { position: relative; overflow: hidden; width: 100%; height: 100%; display: flex; gap: 12px; align-items: flex-start; text-align: left; padding: 14px;
  border-radius: var(--radius-lg); border: 1px solid var(--border); background: var(--surface); color: var(--text); font: inherit; cursor: pointer;
  transition: border-color 0.3s, background 0.3s, transform 0.3s var(--ease-out); }
.step:hover { border-color: var(--s4); transform: translateY(-2px); }
.step:focus-visible { outline: 2px solid var(--tr2); outline-offset: 2px; }
.step.on { border-color: var(--tr2); background: rgba(86, 102, 255, 0.1); }
.num { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--s3); font-family: var(--font-display); font-size: 12px; font-weight: 800; transition: background 0.3s; }
.num .ic { font-size: 14px; stroke-width: 3; }
.step.on .num, .step.done .num { background: linear-gradient(135deg, #5666ff, #4b90ff); color: #fff; }
.step-copy { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.step-copy strong { font-size: 14px; font-family: var(--font-sans); }
.step-copy span { font-size: 12.5px; line-height: 1.45; color: var(--text-2); }
.progress { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; background: var(--tr-grad); transform-origin: left; animation: fill linear both; }
@keyframes fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* ---------------------------------------------------------------- architecture lane */
.arch { list-style: none; padding: 0; margin: 0 0 16px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: clamp(28px, 4vw, 56px); }
.arch-node { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); }
.arch-node:last-child { border-color: rgba(86, 102, 255, 0.4); }
.arch-node strong { font-family: var(--font-display); font-size: 15px; font-weight: 600; }
.arch-node > span { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-2); }
.wire { position: absolute; left: 100%; top: 50%; width: clamp(28px, 4vw, 56px); height: 2px; margin-top: -1px;
  background: repeating-linear-gradient(90deg, var(--s4) 0 5px, transparent 5px 9px); }
.wire i { position: absolute; top: -2px; left: 0; width: 6px; height: 6px; border-radius: 50%; background: #7fa8ff; box-shadow: 0 0 8px #4b90ff;
  animation: wire 1.8s linear infinite; animation-delay: calc(var(--i) * 0.3s); opacity: 0; }
.wire i:nth-child(2) { animation-delay: calc(var(--i) * 0.3s + 0.6s); }
.wire i:nth-child(3) { animation-delay: calc(var(--i) * 0.3s + 1.2s); background: var(--tr-gold); box-shadow: 0 0 8px var(--tr-gold); animation-direction: reverse; }
@keyframes wire { 0% { left: 0; opacity: 0; } 15%, 85% { opacity: 1; } 100% { left: calc(100% - 6px); opacity: 0; } }

/* ---------------------------------------------------------------- feature grid */
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.card { position: relative; padding: clamp(18px, 2.4vw, 28px); border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); overflow: hidden;
  transition: border-color 0.4s, transform 0.4s var(--ease-out); }
.card::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.4s;
  background: radial-gradient(500px circle at 50% 0%, rgba(86, 102, 255, 0.16), transparent 60%); }
.card:hover { border-color: rgba(86, 102, 255, 0.4); transform: translateY(-3px); }
.card:hover::before { opacity: 1; }
.card h4 { margin: 18px 0 8px; font-family: var(--font-display); font-weight: 600; font-size: clamp(17px, 1.6vw, 21px); letter-spacing: -0.01em; }
.card p { margin: 0; color: var(--text-2); font-size: 15px; line-height: 1.6; }
.card code { font-family: var(--font-mono); font-size: 0.86em; color: #a9b4ff; background: rgba(86, 102, 255, 0.12); padding: 1px 6px; border-radius: 6px; }
.viz { position: relative; height: 140px; border-radius: var(--radius); background: rgba(0, 0, 0, 0.28); border: 1px solid var(--border); overflow: hidden;
  background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px); background-size: 16px 16px; }

/* bot */
.viz-bot { display: flex; align-items: center; justify-content: space-between; padding: 0 22px; }
.bot { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 16px; background: rgba(86, 102, 255, 0.18); border: 1px solid rgba(86, 102, 255, 0.5); z-index: 1; }
.bot svg { width: 40px; height: 40px; fill: none; stroke: #9aa6ff; stroke-width: 2.4; stroke-linecap: round; }
.bot .eye { fill: #9aa6ff; stroke: none; transform-box: fill-box; transform-origin: center; animation: blink 4s infinite; }
@keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
.viz-bot .path { position: absolute; left: 86px; right: 76px; top: 50%; height: 2px; background: repeating-linear-gradient(90deg, var(--s4) 0 6px, transparent 6px 11px); }
.offer { position: absolute; left: 86px; top: 50%; display: inline-flex; align-items: center; gap: 4px; padding: 5px 8px; margin-top: -15px; border-radius: 8px;
  background: #1a1d33; border: 1px solid rgba(86, 102, 255, 0.6); box-shadow: 0 6px 20px rgba(86, 102, 255, 0.4); animation: offer 2.8s cubic-bezier(0.6, 0, 0.3, 1) infinite; }
.offer img { width: 18px; height: 18px; object-fit: contain; }
.offer b { font-family: var(--font-mono); font-size: 10px; font-weight: 600; color: #a9b4ff; }
@keyframes offer { 0% { left: 86px; opacity: 0; transform: scale(0.7); } 12% { opacity: 1; transform: none; } 70% { opacity: 1; transform: none; } 80%, 100% { left: calc(100% - 150px); opacity: 0; transform: scale(0.7); } }
.steam { position: relative; z-index: 1; width: 52px; height: 52px; display: grid; place-items: center; border-radius: 50%; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border); }
.steam img { width: 34px; height: 34px; object-fit: contain; }
.ok { position: absolute; right: -4px; top: -4px; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; background: var(--mint); color: #062; font-size: 12px; animation: ok 2.8s infinite; }
.ok .ic { stroke-width: 3.4; }
@keyframes ok { 0%, 74% { transform: scale(0); } 82% { transform: scale(1.25); } 88%, 96% { transform: scale(1); } 100% { transform: scale(0); } }

/* pricing */
.viz-price { display: flex; flex-direction: column; justify-content: center; gap: 14px; padding: 0 18px; }
.formula { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; font-family: var(--font-mono); font-size: 12px; }
.tok { display: inline-flex; flex-direction: column; padding: 6px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border); color: var(--text); white-space: nowrap; }
.tok small { font-size: 9.5px; color: var(--muted); }
.op { color: var(--muted); }
.bonus { display: flex; gap: 8px; flex-wrap: wrap; }
.b { font-family: var(--font-mono); font-size: 11px; padding: 4px 9px; border-radius: 999px; opacity: 0.25; animation: bonus 3.6s ease-in-out infinite; }
.b1 { color: #a9b4ff; background: rgba(86, 102, 255, 0.15); border: 1px solid rgba(86, 102, 255, 0.5); }
.b2 { color: var(--tr-gold); background: rgba(242, 201, 76, 0.1); border: 1px solid rgba(242, 201, 76, 0.45); animation-delay: 0.6s; }
@keyframes bonus { 0%, 15% { opacity: 0.25; transform: translateY(4px); } 25%, 80% { opacity: 1; transform: none; } 95%, 100% { opacity: 0.25; transform: translateY(4px); } }

/* stacked items */
.viz-stack { display: grid; place-items: center; container-type: inline-size; }
.st { position: absolute; left: 50%; top: 50%; width: 64px; height: 64px; margin: -32px 0 0 -32px; display: grid; place-items: center; border-radius: 14px;
  background: #1c1e2c; border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5); animation: fan 4s var(--ease-out) infinite; }
.st img { width: 36px; height: 36px; object-fit: contain; }
@keyframes fan {
  0%, 15%, 100% { transform: translate(calc(var(--n) * 4px), calc(var(--n) * -4px)); }
  40%, 75% { transform: translateX(calc((var(--n) - 1.5) * min(76px, 20cqi))) rotate(calc((var(--n) - 1.5) * 4deg)); }
}
.qty { position: absolute; right: 14px; top: 12px; font-family: var(--font-mono); font-size: 11px; padding: 3px 9px; border-radius: 999px;
  color: var(--tr-gold); background: rgba(242, 201, 76, 0.1); border: 1px solid rgba(242, 201, 76, 0.45); }

/* ---------------------------------------------------------------- foot */
.foot { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-top: clamp(40px, 5vw, 64px); }
.chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }

/* ---------------------------------------------------------------- pause / reduced */
.world.idle *, .world.idle *::before, .world.idle *::after { animation-play-state: paused !important; }
.world.reduced *, .world.reduced *::before, .world.reduced *::after { animation: none !important; transition: none !important; }
.world.reduced .show { --rx: 8deg !important; --ry: -12deg !important; --lift: 0px !important; --sink: 0px !important; }
.world.reduced .title .ch, .world.reduced .title .mark { opacity: 1; transform: none; }
.world.reduced .b { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .world *, .world *::before, .world *::after { animation: none !important; }
  .ch, .mark { opacity: 1 !important; transform: none !important; }
}

/* ---------------------------------------------------------------- responsive */
@media (max-width: 960px) {
  .arch { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .arch-node:nth-child(2) .wire { display: none; }
  .steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .grid { grid-template-columns: 1fr; }
  .show { aspect-ratio: 1 / 1.02; perspective: 1100px; }
  .win-home { left: 0; top: 18%; width: 90%; }
  .win-trade { right: 0; top: 0; width: 66%; }
  .phone { right: 0; bottom: 4%; width: 32%; padding: 5px; border-radius: 22px; }
  .phone .screen { border-radius: 17px; }
  .notch { top: 9px; height: 8px; }
  .bar { height: 20px; padding: 0 8px; gap: 4px; }
  .bar i { width: 6px; height: 6px; }
  .url { font-size: 9px; padding: 1px 8px; }
  .c2 { display: none; }
  .c1 { left: 0; bottom: 0; font-size: 11px; }
  .floater.extra { display: none; }
}
@media (max-width: 560px) {
  .stage { grid-template-columns: minmax(0, 1fr) 24px auto 24px minmax(0, 1fr); padding: 14px 10px; }
  .hub { --hub: 64px; }
  .node { padding: 8px; border-radius: var(--radius); }
  .node-head { font-size: 9.5px; gap: 5px; margin-bottom: 8px; letter-spacing: 0.02em; }
  .node-head img { width: 15px; height: 15px; }
  .tiles { gap: 5px; }
  .tile { border-radius: 10px; }
  .mailbox { width: 50px; height: 50px; font-size: 26px; }
  .gold { font-size: 14px; }
  .packet { width: 18px; height: 18px; margin-top: -9px; }
  .packet.coin { width: 12px; height: 12px; margin-top: -6px; }
  .steps { grid-template-columns: 1fr; gap: 8px; }
  .arch { grid-template-columns: 1fr; gap: 22px; }
  .wire { left: 50%; top: 100%; width: 2px; height: 22px; margin: 0; background: repeating-linear-gradient(180deg, var(--s4) 0 5px, transparent 5px 9px); }
  .arch-node:nth-child(2) .wire { display: block; }
  .wire i { left: -2px; animation-name: wire-v; }
  .formula { font-size: 11px; gap: 5px; }
  .tok { padding: 5px 7px; }
  .coin.big { width: 26px; height: 26px; }
}
@keyframes wire-v { 0% { top: 0; opacity: 0; } 15%, 85% { opacity: 1; } 100% { top: calc(100% - 6px); opacity: 0; } }
</style>
