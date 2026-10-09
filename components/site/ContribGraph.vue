<script setup lang="ts">
// "Two accounts, one graph": per-year stacked bars (personal / work) + a GitHub-style heatmap of the chosen year,
// coloured by who made the commits (cyan personal → gold work), plus the headline stats.
import type { Contributions } from "~/shared/contributions";

const props = defineProps<{ data: Contributions | null }>();

const fmt = (n: number) => n.toLocaleString("en-US");
const years = computed(() => props.data?.years ?? []);
const maxYear = computed(() => Math.max(1, ...years.value.map((y) => y.total)));
const selected = ref<number | null>(null);
const year = computed(() => selected.value ?? years.value.at(-1)?.year ?? null);
const yearInfo = computed(() => years.value.find((y) => y.year === year.value) ?? null);

// heatmap cells for the chosen year: columns = weeks (Mon-first), rows = weekday
const cells = computed(() => {
  if (!props.data || !year.value) return [];
  const days = props.data.days.filter(([d]) => d.startsWith(`${year.value}-`));
  if (!days.length) return [];
  const jan1 = new Date(`${year.value}-01-01T00:00:00Z`);
  const offset = (jan1.getUTCDay() + 6) % 7;
  const max = Math.max(1, ...days.map(([, p, w]) => p + w));
  return days.map(([date, p, w]) => {
    const i = Math.round((new Date(`${date}T00:00:00Z`).getTime() - jan1.getTime()) / 86400000) + offset;
    const n = p + w;
    return { date, p, w, n, col: Math.floor(i / 7) + 1, row: (i % 7) + 1, level: n ? 0.25 + 0.75 * (Math.log1p(n) / Math.log1p(max)) : 0, share: n ? w / n : 0 };
  });
});
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthCols = computed(() => {
  if (!year.value) return [];
  const jan1 = new Date(`${year.value}-01-01T00:00:00Z`);
  const offset = (jan1.getUTCDay() + 6) % 7;
  return MONTHS.map((m, i) => {
    const d = new Date(Date.UTC(year.value!, i, 1));
    return { m, col: Math.floor((Math.round((d.getTime() - jan1.getTime()) / 86400000) + offset) / 7) + 1 };
  });
});
const hovered = ref<(typeof cells.value)[number] | null>(null);
const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const range = (s: { from: string | null; to: string | null }) => (s.from && s.to ? `${shortDate(s.from)} → ${shortDate(s.to)}` : "—");
</script>

<template>
  <section id="commits" class="graph-sec">
    <div class="v2-container">
      <p v-reveal class="v2-eyebrow">github.com/piijt + github.com/peterhjespersen</p>
      <h2 v-reveal="80" class="v2-h2">Two accounts.<br><span class="v2-grad">One graph.</span></h2>
      <p v-reveal="160" class="v2-lede">
        Side projects on my personal account, product work on my work account. Merged day by day, every year since 2017.
      </p>

      <div v-if="data" class="grid">
        <!-- years -->
        <div v-reveal class="card years">
          <div class="card-head">
            <span>Contributions per year</span>
            <span class="legend"><i class="sw personal" />personal <i class="sw work" />work</span>
          </div>
          <div class="bars" role="list">
            <button
              v-for="y in years" :key="y.year" type="button" role="listitem" class="bar" :class="{ on: y.year === year }"
              :aria-label="`${y.year}: ${fmt(y.total)} contributions (${fmt(y.personal)} personal, ${fmt(y.work)} work)`"
              @click="selected = y.year"
            >
              <span class="bar-val">{{ fmt(y.total) }}</span>
              <span class="bar-stack" :style="{ height: `${Math.max(2, (y.total / maxYear) * 100)}%` }">
                <span class="seg work" :style="{ flexGrow: y.work }" />
                <span class="seg personal" :style="{ flexGrow: y.personal }" />
              </span>
              <span class="bar-year">{{ String(y.year).slice(2) }}</span>
            </button>
          </div>
        </div>

        <!-- heatmap -->
        <div v-reveal="100" class="card heat">
          <div class="card-head">
            <span><strong class="heat-year">{{ year }}</strong> · {{ fmt(yearInfo?.total ?? 0) }} contributions</span>
            <span class="heat-hover">
              <template v-if="hovered">{{ shortDate(hovered.date) }} — {{ hovered.n }} <i class="sw personal" />{{ hovered.p }} <i class="sw work" />{{ hovered.w }}</template>
              <template v-else>hover a day</template>
            </span>
          </div>
          <div class="heat-scroll">
            <div class="months">
              <span v-for="m in monthCols" :key="m.m" :style="{ gridColumn: m.col }">{{ m.m }}</span>
            </div>
            <div class="cells" @mouseleave="hovered = null">
              <span
                v-for="c in cells" :key="c.date" class="cell"
                :style="{ gridColumn: c.col, gridRow: c.row, '--lvl': c.level, '--share': c.share }"
                :class="{ empty: !c.n }" @mouseenter="hovered = c"
              />
            </div>
          </div>
        </div>

        <!-- stats -->
        <div v-reveal="60" class="card stat">
          <span class="stat-k">longest streak</span>
          <span class="stat-v">{{ data.stats.longestStreak.days }}<small> days</small></span>
          <span class="stat-s">{{ range(data.stats.longestStreak) }}</span>
        </div>
        <div v-reveal="120" class="card stat">
          <span class="stat-k">busiest day</span>
          <span class="stat-v">{{ data.stats.busiestDay?.count ?? 0 }}<small> contributions</small></span>
          <span class="stat-s">{{ data.stats.busiestDay ? shortDate(data.stats.busiestDay.date) : "—" }}</span>
        </div>
        <div v-reveal="180" class="card stat">
          <span class="stat-k">current streak</span>
          <span class="stat-v">{{ data.stats.currentStreak.days }}<small> days</small></span>
          <span class="stat-s">{{ range(data.stats.currentStreak) }}</span>
        </div>
        <div v-for="(a, i) in data.accounts" :key="a.key" v-reveal="240 + i * 60" class="card stat account" :class="a.key">
          <span class="stat-k">{{ a.label.toLowerCase() }} account</span>
          <span class="stat-v">{{ fmt(a.total) }}</span>
          <a class="stat-s link" :href="`https://github.com/${a.login}`" target="_blank" rel="noopener">github.com/{{ a.login }} ↗</a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.graph-sec { position: relative; padding: clamp(80px, 12vw, 160px) 0; }
.grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; margin-top: 48px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; min-width: 0; }
.card-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 12px; color: var(--muted); margin-bottom: 16px; }
.legend, .heat-hover { display: inline-flex; align-items: center; gap: 6px; }
.sw { display: inline-block; width: 9px; height: 9px; border-radius: 2px; }
.sw.personal { background: var(--cyan); }
.sw.work { background: var(--gold); }

.years { grid-column: span 2; display: flex; flex-direction: column; }
.bars { flex: 1; min-height: 220px; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 6px; align-items: end; }
.bar { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 6px; background: none; border: 0; padding: 0; cursor: pointer; color: var(--muted); font: inherit; }
.bar-stack { width: 100%; max-width: 30px; display: flex; flex-direction: column; border-radius: 6px 6px 2px 2px; overflow: hidden; opacity: 0.55; transition: opacity 0.2s, transform 0.3s var(--ease-out); transform-origin: bottom; }
.seg { display: block; min-height: 0; }
.seg.personal { background: linear-gradient(180deg, var(--cyan), #2a7fa0); }
.seg.work { background: linear-gradient(180deg, #ffe08a, var(--gold)); }
.bar:hover .bar-stack, .bar.on .bar-stack { opacity: 1; }
.bar.on .bar-stack { box-shadow: 0 0 22px rgba(68, 188, 227, 0.45); }
.bar-val { font-family: var(--font-mono); font-size: 10px; opacity: 0; transition: opacity 0.2s; white-space: nowrap; }
.bar:hover .bar-val, .bar.on .bar-val { opacity: 1; color: var(--text); }
.bar-year { font-family: var(--font-mono); font-size: 11px; }
.bar.on .bar-year { color: var(--mint); }
.v2-reveal:not(.is-in) .bar-stack { transform: scaleY(0); }

.heat { grid-column: span 4; }
.heat-year { font-family: var(--font-display); color: var(--text); font-size: 15px; }
.heat-scroll { overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; }
.months, .cells { display: grid; grid-template-columns: repeat(54, 13px); gap: 3px; min-width: max-content; }
.months { height: 16px; font-family: var(--font-mono); font-size: 10px; color: var(--muted); }
.cells { grid-template-rows: repeat(7, 13px); }
.cell {
  border-radius: 3px;
  background: color-mix(in oklab, color-mix(in oklab, var(--cyan), var(--gold) calc(var(--share) * 100%)) calc(var(--lvl) * 100%), #161a24);
  box-shadow: 0 0 calc(var(--lvl) * 10px) color-mix(in oklab, var(--cyan), var(--gold) calc(var(--share) * 100%));
  transition: transform 0.15s;
}
.cell.empty { background: #161a24; box-shadow: none; }
.cell:hover { transform: scale(1.5); position: relative; z-index: 1; }

.stat { grid-column: span 2; display: flex; flex-direction: column; gap: 6px; }
.stat-k { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.stat-v { font-family: var(--font-display); font-weight: 600; font-size: clamp(30px, 3.4vw, 46px); line-height: 1.05; }
.stat-v small { font-family: var(--font-mono); font-size: 13px; color: var(--text-2); font-weight: 400; }
.stat-s { font-family: var(--font-mono); font-size: 12px; color: var(--text-2); }
.account { grid-column: span 3; }
.account.personal .stat-v { color: var(--cyan); }
.account.work .stat-v { color: var(--gold); }
.link { color: var(--text-2); text-decoration: none; }
.link:hover { color: var(--mint); }

@media (max-width: 980px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .years, .heat { grid-column: span 2; }
  .stat { grid-column: span 1; }
  .account { grid-column: span 1; }
}
@media (max-width: 520px) {
  .grid { grid-template-columns: 1fr; }
  .years, .heat, .stat, .account { grid-column: span 1; }
}
</style>
