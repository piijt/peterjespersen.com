<script setup lang="ts">
// Hero: a tall scroll track with the WebGL city pinned inside it. Scrolling the track = flying through time.
import type { Contributions } from "~/shared/contributions";

const props = defineProps<{ data: Contributions | null }>();

const track = ref<HTMLElement>();
const progress = ref(0);
const pinned = ref<number | null>(null);
const focusYear = ref<number | null>(null);
const failed = ref(false);
const hover = ref<{ date: string; personal: number; work: number; x: number; y: number } | null>(null);

const fmt = (n: number) => n.toLocaleString("en-US");
const yearTotal = computed(() => props.data?.years.find((y) => y.year === focusYear.value) ?? null);
// running total up to the year the camera is over
const runningTotal = computed(() =>
  (props.data?.years ?? []).filter((y) => focusYear.value !== null && y.year <= focusYear.value).reduce((s, y) => s + y.total, 0),
);
const longDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// phases of the scroll: intro (title) → flight (year ticker) → outro (grand total)
const phase = computed(() => (progress.value < 0.1 ? "intro" : progress.value < 0.92 ? "flight" : "outro"));

let raf = 0;
function measure() {
  raf = 0;
  const el = track.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const max = r.height - innerHeight;
  progress.value = max > 0 ? Math.min(1, Math.max(0, -r.top / max)) : 0;
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
onMounted(() => {
  // dev aid: /?p=0.5 pins the flight at that point and skips the grow-in (for headless screenshots)
  const p = import.meta.dev ? new URLSearchParams(location.search).get("p") : null;
  if (p !== null) {
    pinned.value = Math.min(1, Math.max(0, Number(p) || 0));
    progress.value = pinned.value;
    return;
  }
  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  cancelAnimationFrame(raf);
});
</script>

<template>
  <section id="top" ref="track" class="hero-track">
    <div class="stage">
      <LazySiteContribCity
        v-if="data && !failed" :days="data.days" :progress="progress" :instant="pinned !== null"
        @hover="hover = $event" @focus="focusYear = $event" @failed="failed = true"
      />
      <div v-else class="fallback" aria-hidden="true" />
      <div class="vignette" aria-hidden="true" />

      <!-- intro -->
      <div class="intro" :class="{ gone: phase !== 'intro' }">
        <p class="v2-eyebrow">Software developer · Denmark</p>
        <h1 class="title">
          <span class="line">Peter</span>
          <span class="line v2-grad">Jespersen</span>
        </h1>
        <p class="lede">
          I build products end to end — storefronts, trading bots, data platforms, music apps.
          Below: every commit I've made, on two GitHub accounts, as a city.
        </p>
        <dl v-if="data" class="stats">
          <div><dt>contributions</dt><dd>{{ fmt(data.stats.total) }}</dd></div>
          <div><dt>longest streak</dt><dd>{{ data.stats.longestStreak.days }}<small>days</small></dd></div>
          <div><dt>busiest day</dt><dd>{{ data.stats.busiestDay?.count ?? 0 }}<small>commits</small></dd></div>
          <div><dt>last 12 months</dt><dd>{{ fmt(data.stats.lastYear) }}</dd></div>
        </dl>
        <div class="scroll-hint" aria-hidden="true"><span />scroll to fly through time</div>
      </div>

      <!-- flight: which year we're over -->
      <div class="ticker" :class="{ on: phase === 'flight' && focusYear }" aria-hidden="true">
        <div class="ticker-year">{{ focusYear }}</div>
        <div v-if="yearTotal" class="ticker-row">
          <span class="dot personal" />{{ fmt(yearTotal.personal) }} personal
          <span class="dot work" />{{ fmt(yearTotal.work) }} work
        </div>
        <div class="ticker-total">{{ fmt(runningTotal) }} <span>so far</span></div>
      </div>

      <!-- outro -->
      <div class="outro" :class="{ on: phase === 'outro' }">
        <p class="v2-eyebrow">2017 → today</p>
        <p class="outro-num v2-grad-hot">{{ data ? fmt(data.stats.total) : "" }}</p>
        <p class="outro-sub">contributions · {{ fmt(data?.stats.activeDays ?? 0) }} active days · 2 accounts · 1 developer</p>
      </div>

      <div class="legend" aria-hidden="true">
        <span><i class="dot personal" />personal · piijt</span>
        <span><i class="dot work" />work · peterhjespersen</span>
      </div>

      <div v-if="hover" class="tip" :style="{ left: `${hover.x}px`, top: `${hover.y}px` }" aria-hidden="true">
        <strong>{{ hover.personal + hover.work }} contribution{{ hover.personal + hover.work === 1 ? "" : "s" }}</strong>
        <span>{{ longDate(hover.date) }}</span>
        <span v-if="hover.personal + hover.work" class="tip-split">
          <i class="dot personal" />{{ hover.personal }} <i class="dot work" />{{ hover.work }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-track { position: relative; height: 420vh; }
.stage { position: sticky; top: 0; height: 100vh; height: 100svh; overflow: hidden; }
.fallback {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 60% 70%, rgba(68, 188, 227, 0.18), transparent 60%),
    radial-gradient(ellipse at 20% 30%, rgba(242, 201, 76, 0.1), transparent 55%), var(--bg);
}
.vignette {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(11, 11, 16, 0.85) 0%, transparent 28%, transparent 70%, var(--bg) 100%),
    radial-gradient(ellipse at center, transparent 55%, rgba(11, 11, 16, 0.65) 100%);
}

.intro {
  position: absolute; left: var(--gutter); right: var(--gutter); top: clamp(96px, 16vh, 170px); max-width: 1100px;
  transition: opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out); pointer-events: none;
}
.intro.gone { opacity: 0; transform: translateY(-40px); }
.title { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.03em; line-height: 0.92; margin: 14px 0 0; font-size: clamp(46px, 9.4vw, 136px); }
/* width: max-content so the gradient (background-clip: text) covers the whole word */
.line { display: block; width: max-content; animation: rise 1.2s var(--ease-out) both; }
.line + .line { animation-delay: 0.12s; }
@keyframes rise { from { opacity: 0; transform: translateY(0.4em) skewY(4deg); filter: blur(8px); } }
.lede { margin: 22px 0 0; max-width: 46ch; color: var(--text-2); font-size: clamp(15px, 1.5vw, 19px); line-height: 1.6; animation: rise 1.2s 0.3s var(--ease-out) both; }
.stats { display: flex; flex-wrap: wrap; gap: 10px 34px; margin: 30px 0 0; animation: rise 1.2s 0.45s var(--ease-out) both; }
.stats div { display: flex; flex-direction: column-reverse; }
.stats dt { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.stats dd { margin: 0; font-family: var(--font-display); font-weight: 600; font-size: clamp(24px, 3vw, 38px); }
.stats small { font-size: 0.45em; color: var(--text-2); margin-left: 4px; font-family: var(--font-mono); }
.scroll-hint { display: inline-flex; align-items: center; gap: 10px; margin-top: 36px; font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
.scroll-hint span { width: 18px; height: 28px; border: 1.5px solid var(--border-strong); border-radius: 10px; position: relative; }
.scroll-hint span::after { content: ""; position: absolute; left: 50%; top: 5px; width: 3px; height: 6px; margin-left: -1.5px; border-radius: 2px; background: var(--mint); animation: wheel 1.6s infinite; }
@keyframes wheel { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(9px); } }

.ticker {
  position: absolute; right: var(--gutter); bottom: clamp(70px, 14vh, 140px); text-align: right; opacity: 0; transform: translateY(20px);
  transition: opacity 0.5s, transform 0.5s var(--ease-out); pointer-events: none;
}
.ticker.on { opacity: 1; transform: none; }
.ticker-year { font-family: var(--font-display); font-weight: 800; font-size: clamp(64px, 12vw, 160px); line-height: 0.9; letter-spacing: -0.04em; -webkit-text-stroke: 1px rgba(255, 255, 255, 0.5); color: transparent; }
.ticker-row { margin-top: 10px; font-family: var(--font-mono); font-size: 13px; color: var(--text-2); display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.ticker-row .dot + * { margin-right: 10px; }
.ticker-total { margin-top: 6px; font-family: var(--font-display); font-size: clamp(22px, 2.6vw, 32px); }
.ticker-total span { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }

.outro { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; opacity: 0; transition: opacity 0.8s; pointer-events: none; padding: 0 var(--gutter); }
.outro.on { opacity: 1; }
.outro-num { margin: 8px 0 0; font-family: var(--font-display); font-weight: 800; font-size: clamp(72px, 16vw, 220px); line-height: 0.95; letter-spacing: -0.04em; }
.outro-sub { margin: 12px 0 0; font-family: var(--font-mono); color: var(--text-2); font-size: clamp(12px, 1.3vw, 15px); }

.legend { position: absolute; left: var(--gutter); bottom: 22px; display: flex; flex-wrap: wrap; gap: 6px 18px; font-family: var(--font-mono); font-size: 11px; color: var(--muted); pointer-events: none; }
.legend span { display: inline-flex; align-items: center; gap: 7px; }
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 2px; }
.dot.personal { background: var(--cyan); box-shadow: 0 0 10px var(--cyan); }
.dot.work { background: var(--gold); box-shadow: 0 0 10px var(--gold); }

.tip {
  position: fixed; z-index: 40; transform: translate(14px, 14px); pointer-events: none; display: flex; flex-direction: column; gap: 3px;
  padding: 9px 12px; border-radius: 10px; background: rgba(11, 11, 16, 0.85); border: 1px solid var(--border-strong);
  backdrop-filter: blur(8px); font-family: var(--font-mono); font-size: 12px; color: var(--text-2); white-space: nowrap;
}
.tip strong { color: var(--text); font-family: var(--font-sans); font-size: 14px; }
.tip-split { display: inline-flex; align-items: center; gap: 6px; }

@media (max-width: 640px) {
  .ticker { left: var(--gutter); right: var(--gutter); }
  .stats { gap: 12px 24px; }
}
@media (prefers-reduced-motion: reduce) {
  .line, .lede, .stats { animation: none; }
  .scroll-hint span::after { animation: none; }
}
</style>
