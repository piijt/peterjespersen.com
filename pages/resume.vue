<script setup lang="ts">
import { PROFILE, HIGHLIGHTS, ROLES, SKILLS, AI_SKILL, EDUCATION, LANGUAGES } from "~/utils/resume";

definePageMeta({ layout: "v2" });
useHead({ title: "Resume — Peter Højer Jespersen" });
useSeoMeta({
  description: "Peter Højer Jespersen — fullstack engineer from Odense, Denmark. Platform engineering, distributed systems, C++, C#, TypeScript, Vue.",
});

// Kinematic was acquired by Makin' 3D: the timeline draws the two as one track that merges
const [makin3d, kinematic, ...earlier] = ROLES;

// the timeline's glowing line fills as you scroll through it
const timeline = ref<HTMLElement>();
const fill = ref(0);
let raf = 0;
function measure() {
  raf = 0;
  const el = timeline.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  fill.value = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
onMounted(() => {
  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  cancelAnimationFrame(raf);
});

const print = () => window.print();
</script>

<template>
  <main class="cv">
    <!-- header -->
    <header class="v2-container head">
      <p class="v2-eyebrow intro-in">Resume · Fullstack Engineer · Odense, Denmark</p>
      <h1 class="name intro-in" style="animation-delay: 80ms">Peter Højer<br><span class="v2-grad">Jespersen</span></h1>
      <p class="v2-lede intro-in" style="animation-delay: 160ms">{{ PROFILE }}</p>
      <div class="actions no-print intro-in" style="animation-delay: 220ms">
        <a class="cta" href="mailto:pj@peterjespersen.com">pj@peterjespersen.com</a>
        <a class="v2-chip" href="https://www.linkedin.com/in/peter-h%C3%B8jer-jespersen-630037107/" target="_blank" rel="noopener">LinkedIn ↗</a>
        <a class="v2-chip" href="https://github.com/piijt" target="_blank" rel="noopener">github.com/piijt ↗</a>
        <button type="button" class="v2-chip" @click="print">Print / save as PDF</button>
      </div>
      <p class="print-only print-contact">pj@peterjespersen.com · linkedin.com/in/peter-højer-jespersen · github.com/piijt · peterjespersen.com</p>
      <dl class="highlights">
        <div v-for="(h, i) in HIGHLIGHTS" :key="h.label" v-reveal="i * 70" class="hl">
          <dd>{{ h.value }}</dd>
          <dt>{{ h.label }}</dt>
        </div>
      </dl>
    </header>

    <!-- experience -->
    <section class="v2-container block" aria-labelledby="exp">
      <p class="v2-eyebrow">Experience</p>
      <h2 id="exp" v-reveal class="v2-h2 h2">Where I've <span class="v2-grad">shipped.</span></h2>

      <ol ref="timeline" class="timeline" :style="{ '--fill': fill }">
        <!-- Makin' 3D, with Kinematic merging into it -->
        <li v-if="makin3d" v-reveal class="role" :class="makin3d.color">
          <span class="node" aria-hidden="true" />
          <div class="role-card featured">
            <div class="role-main">
              <div class="role-head">
                <div>
                  <h3>{{ makin3d.company }}</h3>
                  <p class="role-title">{{ makin3d.title }}</p>
                </div>
                <span class="period">{{ makin3d.period }}</span>
              </div>
              <p class="place">{{ makin3d.place }}</p>
              <p class="note">{{ makin3d.note }}</p>
              <p v-if="makin3d.summary" class="summary">{{ makin3d.summary }}</p>
              <ul class="bullets">
                <li v-for="b in makin3d.bullets" :key="b">{{ b }}</li>
              </ul>
              <div class="stack"><span v-for="s in makin3d.stack" :key="s">{{ s }}</span></div>
            </div>
            <div class="role-aside no-print">
              <SiteBroadcastGrid />
              <p class="aside-cap">Near-real-time position broadcast: every machine knows what's around it.</p>
            </div>
          </div>
        </li>
        <li v-if="kinematic" v-reveal class="merge no-print" aria-hidden="true">
          <span class="merge-label">acquired by Makin' 3D · same team, same platform</span>
        </li>
        <li v-if="kinematic" v-reveal class="role" :class="kinematic.color">
          <span class="node" aria-hidden="true" />
          <div class="role-card">
            <div class="role-head">
              <div>
                <h3>{{ kinematic.company }}</h3>
                <p class="role-title">{{ kinematic.title }}</p>
              </div>
              <span class="period">{{ kinematic.period }}</span>
            </div>
            <p class="place">{{ kinematic.place }}</p>
            <p v-if="kinematic.summary" class="summary">{{ kinematic.summary }}</p>
            <ul class="bullets"><li v-for="b in kinematic.bullets" :key="b">{{ b }}</li></ul>
            <div class="stack"><span v-for="s in kinematic.stack" :key="s">{{ s }}</span></div>
          </div>
        </li>

        <li v-for="r in earlier" :key="r.id" v-reveal class="role" :class="r.color">
          <span class="node" aria-hidden="true" />
          <div class="role-card">
            <div class="role-head">
              <div>
                <h3>
                  <a v-if="r.url" :href="r.url" target="_blank" rel="noopener">{{ r.company }} <span class="ext">↗</span></a>
                  <template v-else>{{ r.company }}</template>
                </h3>
                <p class="role-title">{{ r.title }}</p>
              </div>
              <span class="period">{{ r.period }}</span>
            </div>
            <p class="place">{{ r.place }}</p>
            <ul class="bullets"><li v-for="b in r.bullets" :key="b">{{ b }}</li></ul>
            <div class="stack"><span v-for="s in r.stack" :key="s">{{ s }}</span></div>
            <NuxtLink v-if="r.id === 'trade-raid'" to="/#trade-raid" class="see no-print">See the Trade-Raid showcase →</NuxtLink>
          </div>
        </li>
      </ol>
    </section>

    <!-- skills -->
    <section class="v2-container block" aria-labelledby="skills">
      <p class="v2-eyebrow">Core skills</p>
      <h2 id="skills" v-reveal class="v2-h2 h2">Not tied to <span class="v2-grad">one corner</span> of the stack.</h2>
      <div class="skills">
        <div v-for="(g, i) in SKILLS" :key="g.group" v-reveal="i * 70" class="skill-group">
          <h3>{{ g.group }}</h3>
          <div class="skill-items"><span v-for="s in g.items" :key="s">{{ s }}</span></div>
        </div>
        <div v-reveal="300" class="skill-group ai">
          <h3>AI-augmented engineering</h3>
          <p>{{ AI_SKILL }}</p>
        </div>
      </div>
    </section>

    <!-- education + languages -->
    <section class="v2-container block edu-block" aria-labelledby="edu">
      <div>
        <p class="v2-eyebrow">Education</p>
        <h2 id="edu" class="sr-only">Education</h2>
        <div class="edu">
          <div v-for="(e, i) in EDUCATION" :key="e.degree" v-reveal="i * 80" class="edu-card">
            <span class="period">{{ e.period }}</span>
            <h3>{{ e.degree }}</h3>
            <p class="school">{{ e.school }}</p>
            <p v-if="e.detail" class="detail">{{ e.detail }}</p>
          </div>
        </div>
      </div>
      <div>
        <p class="v2-eyebrow">Languages</p>
        <ul class="langs">
          <li v-for="l in LANGUAGES" :key="l.name" v-reveal><strong>{{ l.name }}</strong><span>{{ l.level }}</span></li>
        </ul>
      </div>
    </section>

    <div class="no-print"><SiteContact /></div>
  </main>
</template>

<style scoped>
.cv { padding-top: clamp(110px, 16vh, 170px); }
.head { padding-bottom: clamp(40px, 6vw, 80px); }
/* above the fold: animate in on load, never wait for a scroll observer */
.intro-in { animation: rise 1s var(--ease-out) both; }
@keyframes rise { from { opacity: 0; transform: translateY(24px); filter: blur(6px); } }
@media (prefers-reduced-motion: reduce) { .intro-in { animation: none; } }
.name { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.03em; line-height: 0.95; font-size: clamp(42px, 8.4vw, 120px); margin: 14px 0 22px; }
.name .v2-grad { display: inline-block; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 28px; }
.cta { font-family: var(--font-display); font-weight: 600; font-size: 15px; color: var(--bg); text-decoration: none; padding: 12px 20px; border-radius: 999px; background: var(--grad-brand); }
.v2-chip { text-decoration: none; cursor: pointer; font: inherit; font-family: var(--font-mono); font-size: 12px; }
.v2-chip:hover { color: var(--text); border-color: var(--border-strong); }

.highlights { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 48px 0 0; }
.hl { display: flex; flex-direction: column; gap: 4px; padding: 18px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); }
.hl dd { margin: 0; font-family: var(--font-display); font-weight: 600; font-size: clamp(26px, 3.2vw, 40px); background: var(--grad-brand); -webkit-background-clip: text; background-clip: text; color: transparent; width: max-content; }
.hl dt { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }

.block { padding: clamp(60px, 9vw, 120px) 0 0; }
.h2 { font-size: clamp(32px, 5.4vw, 64px); margin-bottom: 40px; }

/* ---------- timeline ---------- */
.timeline { --x: 18px; position: relative; list-style: none; margin: 0; padding: 0 0 0 calc(var(--x) * 2 + 10px); }
.timeline::before, .timeline::after { content: ""; position: absolute; left: var(--x); top: 8px; bottom: 8px; width: 2px; border-radius: 2px; }
.timeline::before { background: var(--border); }
.timeline::after { background: linear-gradient(180deg, var(--cyan), var(--violet), var(--gold), var(--mint)); transform-origin: top; transform: scaleY(var(--fill)); box-shadow: 0 0 14px rgba(68, 188, 227, 0.6); }
.role { position: relative; margin-bottom: 22px; }
.node { position: absolute; left: calc(-1 * (var(--x) + 10px) - 6px); top: 26px; width: 14px; height: 14px; border-radius: 50%; background: var(--bg); border: 2px solid var(--c); box-shadow: 0 0 0 5px var(--bg), 0 0 18px var(--c); }
.role.cyan { --c: var(--cyan); } .role.violet { --c: var(--violet); } .role.gold { --c: var(--gold); } .role.mint { --c: var(--mint); } .role.pink { --c: var(--pink); }
.role-card { position: relative; padding: clamp(18px, 2.4vw, 28px); border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); transition: border-color 0.3s, background 0.3s; overflow: hidden; }
.role-card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--c); opacity: 0.8; }
.role-card:hover { border-color: color-mix(in oklab, var(--c) 45%, transparent); background: color-mix(in oklab, var(--c) 4%, var(--surface)); }
.featured { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(240px, 1fr); gap: 28px; }
.role-aside { display: flex; flex-direction: column; gap: 10px; align-self: start; }
.aside-cap { margin: 0; font-family: var(--font-mono); font-size: 11px; color: var(--muted); }
.role-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; }
.role h3 { margin: 0; font-family: var(--font-display); font-weight: 600; font-size: clamp(20px, 2.2vw, 28px); }
.role h3 a { color: inherit; text-decoration: none; }
.role h3 a:hover { color: var(--c); }
.ext { font-size: 0.6em; color: var(--muted); }
.role-title { margin: 4px 0 0; color: var(--c); font-weight: 500; }
.period { flex: none; font-family: var(--font-mono); font-size: 12px; color: var(--text-2); padding: 5px 10px; border-radius: 999px; border: 1px solid var(--border); background: rgba(255, 255, 255, 0.02); }
.place { margin: 10px 0 0; font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
.note { margin: 4px 0 0; font-size: 13px; font-style: italic; color: var(--muted); }
.summary { margin: 14px 0 0; color: var(--text); }
.bullets { margin: 14px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 9px; }
.bullets li { position: relative; padding-left: 20px; color: var(--text-2); line-height: 1.55; }
.bullets li::before { content: "▸"; position: absolute; left: 0; color: var(--c); }
.stack { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.stack span { font-family: var(--font-mono); font-size: 11px; padding: 4px 9px; border-radius: 999px; color: var(--text-2); background: color-mix(in oklab, var(--c) 10%, transparent); border: 1px solid color-mix(in oklab, var(--c) 25%, transparent); }
.see { display: inline-block; margin-top: 14px; font-family: var(--font-mono); font-size: 12px; color: var(--gold); text-decoration: none; }
.see:hover { text-decoration: underline; }
.merge { position: relative; margin: -8px 0 14px; height: 44px; }
.merge::before { content: ""; position: absolute; left: calc(-1 * (var(--x) + 10px) - 1px); top: -10px; width: 34px; height: 54px; border: 2px solid var(--violet); border-right: 0; border-bottom: 0; border-radius: 18px 0 0 0; transform: scaleY(-1); opacity: 0.7; }
.merge-label { position: absolute; left: 30px; top: 12px; font-family: var(--font-mono); font-size: 11px; color: var(--violet); }

/* ---------- skills ---------- */
.skills { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.skill-group { padding: 22px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); }
.skill-group h3 { margin: 0 0 14px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mint); font-weight: 600; }
.skill-items { display: flex; flex-wrap: wrap; gap: 8px; }
.skill-items span {
  padding: 7px 12px; border-radius: 10px; font-size: 14px; color: var(--text); background: var(--surface-2); border: 1px solid var(--border);
  transition: transform 0.2s var(--ease-out), border-color 0.2s, box-shadow 0.2s;
}
.skill-items span:hover { transform: translateY(-2px); border-color: rgba(68, 188, 227, 0.5); box-shadow: 0 6px 20px rgba(68, 188, 227, 0.18); }
.ai { grid-column: 1 / -1; position: relative; overflow: hidden; background: linear-gradient(120deg, rgba(139, 92, 246, 0.14), rgba(255, 79, 163, 0.08), rgba(242, 201, 76, 0.08)), var(--surface); border-color: rgba(139, 92, 246, 0.35); }
.ai h3 { background: var(--grad-hot); -webkit-background-clip: text; background-clip: text; color: transparent; width: max-content; }
.ai p { margin: 0; font-size: clamp(16px, 1.6vw, 20px); line-height: 1.55; max-width: 70ch; }

/* ---------- education ---------- */
.edu-block { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 40px; }
.edu { display: grid; gap: 12px; margin-top: 16px; }
.edu-card { padding: 20px 22px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); }
.edu-card h3 { margin: 10px 0 0; font-family: var(--font-display); font-weight: 600; font-size: 19px; }
.school { margin: 4px 0 0; color: var(--cyan); }
.detail { margin: 8px 0 0; font-size: 14px; color: var(--text-2); }
.langs { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 12px; }
.langs li { display: flex; flex-direction: column; gap: 3px; padding: 18px 20px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); }
.langs strong { font-family: var(--font-display); font-weight: 600; }
.langs span { font-size: 14px; color: var(--text-2); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.print-only { display: none; }

@media (max-width: 900px) {
  .featured { grid-template-columns: 1fr; }
  .highlights { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .skills, .edu-block { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .timeline { --x: 6px; padding-left: 26px; }
  .node { left: -27px; }
  .merge::before { left: -21px; }
}

/* ---------- print: a clean one-colour CV ---------- */
@media print {
  .cv { padding-top: 0; color: #111; }
  .no-print, :global(.nav), :global(.grain), :global(.glow) { display: none !important; }
  .print-only { display: block; }
  :global(body.v2), :global(html) { background: #fff !important; }
  .v2-grad, .hl dd, .ai h3 { background: none; color: #111; -webkit-text-fill-color: #111; }
  .name { font-size: 34px; margin: 4px 0 8px; }
  .v2-lede, .bullets li, .summary, .detail, .langs span { color: #222; font-size: 12px; }
  .highlights { margin-top: 14px; gap: 6px; }
  .hl, .role-card, .skill-group, .edu-card, .langs li { background: none; border: 1px solid #ddd; padding: 10px 12px; break-inside: avoid; }
  .timeline::before, .timeline::after { display: none; }
  .timeline { padding-left: 0; }
  .node, .role-card::before { display: none; }
  .block { padding-top: 18px; }
  .h2 { font-size: 20px; margin-bottom: 10px; }
  .stack span, .skill-items span, .period { color: #333; background: none; border-color: #ccc; }
  :global(.v2-reveal) { opacity: 1 !important; transform: none !important; }

  /* compact enough for ~2 A4 pages */
  .v2-eyebrow { color: #555; font-size: 9px; }
  .v2-lede { max-width: none; line-height: 1.45; margin: 0; }
  .print-contact { margin: 6px 0 0; font-size: 11px; color: #333; }
  .head { padding-bottom: 0; }
  .highlights { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 10px; }
  .hl { padding: 6px 8px; }
  .hl dd { font-size: 17px; }
  .hl dt { font-size: 8px; }
  .h2 { break-after: avoid; }
  .featured { display: block; }
  .role { margin-bottom: 8px; break-inside: avoid; }
  .role h3 { font-size: 16px; }
  .role-title { font-size: 12px; margin-top: 2px; }
  .period { font-size: 10px; padding: 2px 8px; }
  .place, .note { font-size: 10px; margin-top: 3px; }
  .summary { margin-top: 6px; font-size: 12px; }
  .bullets { gap: 3px; margin-top: 6px; }
  .bullets li { font-size: 11px; line-height: 1.4; }
  .stack { margin-top: 6px; gap: 4px; }
  .stack span { font-size: 9px; padding: 1px 6px; }
  .skills { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .skill-group h3 { font-size: 9px; margin-bottom: 6px; }
  .skill-items { gap: 4px; }
  .skill-items span { font-size: 10px; padding: 2px 7px; }
  .ai p { font-size: 11px; }
  .edu-block { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 14px; }
  .edu { gap: 6px; margin-top: 6px; }
  .edu-card h3 { font-size: 13px; margin-top: 6px; }
  .school, .detail { font-size: 11px; }
  .langs { gap: 6px; margin-top: 6px; }
  .langs li { padding: 6px 10px; }
}
</style>
