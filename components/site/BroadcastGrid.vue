<script setup lang="ts">
// Miniature of the Makin' 3D position-broadcast system: machines drift across a spatial grid, each one pings its
// position, and every pair within range is linked — live awareness of the equipment around you.
const W = 320;
const H = 200;
const RANGE = 78;
const CELL = 40;

const root = ref<SVGSVGElement>();
const inView = useInView(root as Ref<HTMLElement | undefined>);
const reduced = useReducedMotion();

// fixed seed so server and client render the same first frame
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const machines = reactive(
  Array.from({ length: 11 }, (_, i) => ({
    id: i,
    x: 20 + rand() * (W - 40),
    y: 20 + rand() * (H - 40),
    vx: (rand() - 0.5) * 0.35,
    vy: (rand() - 0.5) * 0.35,
    ping: rand() * 3,
  })),
);

const links = computed(() => {
  const out: { a: number; b: number; d: number }[] = [];
  for (let i = 0; i < machines.length; i++)
    for (let j = i + 1; j < machines.length; j++) {
      const d = Math.hypot(machines[i]!.x - machines[j]!.x, machines[i]!.y - machines[j]!.y);
      if (d < RANGE) out.push({ a: i, b: j, d });
    }
  return out;
});
// the highlighted machine and how many neighbours it currently "sees"
const me = computed(() => machines[0]!);
const neighbours = computed(() => links.value.filter((l) => l.a === 0 || l.b === 0).length);
const cellOf = (m: { x: number; y: number }) => `${String.fromCharCode(65 + Math.floor(m.x / CELL))}${Math.floor(m.y / CELL) + 1}`;

let raf = 0;
let last = 0;
function tick(t: number) {
  raf = requestAnimationFrame(tick);
  const dt = Math.min(48, t - (last || t)) / 16;
  last = t;
  for (const m of machines) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (m.x < 12 || m.x > W - 12) m.vx *= -1;
    if (m.y < 12 || m.y > H - 12) m.vy *= -1;
    m.ping = (m.ping + 0.012 * dt) % 3;
  }
}
watch([inView, reduced], ([on, still]) => {
  cancelAnimationFrame(raf);
  last = 0;
  if (on && !still) raf = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <figure class="bg">
    <svg ref="root" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Machines on a spatial grid broadcasting their positions to neighbours within range">
      <defs>
        <radialGradient id="bg-ping">
          <stop offset="0.6" stop-color="var(--cyan)" stop-opacity="0" />
          <stop offset="1" stop-color="var(--cyan)" stop-opacity="0.55" />
        </radialGradient>
      </defs>
      <g class="grid">
        <line v-for="i in Math.floor(W / CELL) - 1" :key="`v${i}`" :x1="i * CELL" :x2="i * CELL" y1="0" :y2="H" />
        <line v-for="i in Math.floor(H / CELL) - 1" :key="`h${i}`" :y1="i * CELL" :y2="i * CELL" x1="0" :x2="W" />
      </g>
      <circle class="range" :cx="me.x" :cy="me.y" :r="RANGE" />
      <line
        v-for="l in links" :key="`${l.a}-${l.b}`" class="link" :class="{ mine: l.a === 0 }"
        :x1="machines[l.a]!.x" :y1="machines[l.a]!.y" :x2="machines[l.b]!.x" :y2="machines[l.b]!.y"
        :style="{ opacity: 1 - l.d / RANGE }"
      />
      <g v-for="m in machines" :key="m.id">
        <circle v-if="m.ping < 1" class="ping" :cx="m.x" :cy="m.y" :r="4 + m.ping * 22" :style="{ opacity: 1 - m.ping }" />
        <rect class="machine" :class="{ me: m.id === 0 }" :x="m.x - 4" :y="m.y - 4" width="8" height="8" rx="2" />
      </g>
    </svg>
    <figcaption>
      <span><i class="dot" /> machine #001 · cell {{ cellOf(me) }}</span>
      <span>{{ neighbours }} in range · broadcasting</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.bg { margin: 0; border-radius: var(--radius); border: 1px solid var(--border); background: rgba(68, 188, 227, 0.04); overflow: hidden; }
svg { display: block; width: 100%; height: auto; }
.grid line { stroke: rgba(68, 188, 227, 0.12); stroke-width: 1; }
.range { fill: rgba(68, 188, 227, 0.05); stroke: rgba(68, 188, 227, 0.35); stroke-dasharray: 3 4; }
.link { stroke: var(--mint); stroke-width: 1; }
.link.mine { stroke: var(--cyan); stroke-width: 1.6; }
.ping { fill: none; stroke: var(--cyan); stroke-width: 1; }
.machine { fill: #2b3a4a; stroke: var(--cyan); stroke-width: 1; }
.machine.me { fill: var(--cyan); filter: drop-shadow(0 0 6px var(--cyan)); }
figcaption { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 8px 12px; font-family: var(--font-mono); font-size: 11px; color: var(--muted); border-top: 1px solid var(--border); }
figcaption span { display: inline-flex; align-items: center; gap: 6px; }
.dot { width: 7px; height: 7px; border-radius: 2px; background: var(--cyan); box-shadow: 0 0 8px var(--cyan); }
</style>
