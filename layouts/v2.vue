<script setup lang="ts">
// Full-bleed layout for the v2 front page: floating nav, film grain and a cursor glow over everything.
useHead({ bodyAttrs: { class: "v2" } });
const route = useRoute();

// Section links: on the home page, scroll straight to the section and update the URL ourselves — routing a
// same-page hash change through vue-router left the page where it was. From other pages (e.g. /resume → /#flow)
// the link navigates normally and app/router.options.ts scrolls to the section once the home page has rendered.
const NAV_OFFSET = 80;
const router = useRouter();
function go(href: string, e: MouseEvent) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab etc.: let the browser handle it
  e.preventDefault();
  const [path, hash] = href.split("#");
  const el = route.path === (path || "/") && hash ? document.getElementById(hash) : null;
  if (!el) return void router.push(href);
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (hash === "top" ? 0 : NAV_OFFSET), behavior: "smooth" });
  if (location.hash !== `#${hash}`) history.pushState(history.state, "", `#${hash}`);
}

const links = [
  { href: "/#commits", label: "Commits" },
  { href: "/#trade-raid", label: "Trade-Raid" },
  { href: "/#flow", label: "flow" },
  { href: "/#snapshot", label: "Snapshot" },
];

// cursor glow follows the pointer with a little lag (fine pointers only)
const glow = ref<HTMLElement>();
let raf = 0;
let tx = -999;
let ty = -999;
let x = tx;
let y = ty;
function onMove(e: PointerEvent) {
  tx = e.clientX;
  ty = e.clientY;
}
function frame() {
  x += (tx - x) * 0.12;
  y += (ty - y) * 0.12;
  if (glow.value) glow.value.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  raf = requestAnimationFrame(frame);
}
onMounted(() => {
  if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.addEventListener("pointermove", onMove, { passive: true });
  raf = requestAnimationFrame(frame);
});
onBeforeUnmount(() => {
  window.removeEventListener("pointermove", onMove);
  cancelAnimationFrame(raf);
});
</script>

<template>
  <div class="v2-shell">
    <nav class="nav" aria-label="Main">
      <a href="/#top" class="brand" aria-label="Home" @click="go('/#top', $event)"><span class="v2-grad">pj</span></a>
      <a v-for="l in links" :key="l.href" :href="l.href" class="nav-link" @click="go(l.href, $event)">{{ l.label }}</a>
      <NuxtLink v-if="route.path !== '/resume'" to="/resume" class="nav-link nav-cta">Resume</NuxtLink>
      <a v-else href="mailto:pj@peterjespersen.com" class="nav-link nav-cta">Contact</a>
    </nav>
    <slot />
    <div ref="glow" class="glow" aria-hidden="true" />
    <div class="grain" aria-hidden="true" />
  </div>
</template>

<style scoped>
.v2-shell { position: relative; min-height: 100vh; }
.nav {
  position: fixed; z-index: 50; top: 16px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 2px; padding: 6px; max-width: calc(100vw - 24px); overflow-x: auto; scrollbar-width: none;
  border-radius: 999px; background: rgba(11, 11, 16, 0.6); border: 1px solid var(--border);
  backdrop-filter: blur(14px) saturate(1.4); -webkit-backdrop-filter: blur(14px) saturate(1.4);
}
.brand { font-family: var(--font-display); font-weight: 800; font-size: 15px; padding: 7px 12px; text-decoration: none; }
.nav-link {
  flex: none; padding: 8px 13px; border-radius: 999px; color: var(--text-2); text-decoration: none;
  font-family: var(--font-mono); font-size: 12px; transition: color 0.2s, background 0.2s;
}
.nav-link:hover { color: var(--text); background: var(--surface-2); }
.nav-cta { color: var(--bg); background: var(--grad-brand); font-weight: 600; }
@media (max-width: 520px) {
  .nav-link { padding: 8px 9px; }
  .nav > .nav-link:nth-child(2) { display: none; } /* "Commits" (after the brand) sits right under the hero anyway */
  .brand { padding: 7px 8px; }
}
.nav-cta:hover { color: var(--bg); background: var(--grad-brand); filter: brightness(1.1); }

.glow {
  position: fixed; z-index: 1; top: -300px; left: -300px; width: 600px; height: 600px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(68, 188, 227, 0.09), transparent 60%); mix-blend-mode: screen;
}
.grain {
  position: fixed; inset: -50%; z-index: 60; pointer-events: none; opacity: 0.06;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  animation: grain 1.2s steps(6) infinite;
}
@keyframes grain {
  0% { transform: translate(0, 0); } 20% { transform: translate(-4%, 3%); } 40% { transform: translate(3%, -5%); }
  60% { transform: translate(-6%, -2%); } 80% { transform: translate(5%, 4%); } 100% { transform: translate(0, 0); }
}
@media (prefers-reduced-motion: reduce) { .grain { animation: none; } }
</style>
