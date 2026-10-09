<template>
  <section id="contact" class="contact">
    <div class="v2-container">
      <p v-reveal class="v2-eyebrow">What's next</p>
      <h2 v-reveal="80" class="v2-h2 big">Let's build<br><span class="v2-grad-hot">something loud.</span></h2>
      <div v-reveal="160" class="actions">
        <a class="cta" href="mailto:pj@peterjespersen.com">pj@peterjespersen.com</a>
        <a class="v2-chip" href="https://github.com/piijt" target="_blank" rel="noopener">GitHub · piijt ↗</a>
        <a class="v2-chip" href="https://github.com/peterhjespersen" target="_blank" rel="noopener">GitHub · peterhjespersen ↗</a>
        <a class="v2-chip" href="https://www.linkedin.com/in/peter-h%C3%B8jer-jespersen-630037107/" target="_blank" rel="noopener">LinkedIn ↗</a>
        <NuxtLink class="v2-chip" to="/resume">Resume →</NuxtLink>
      </div>
      <p class="foot">© {{ new Date().getFullYear() }} Peter Jespersen</p>
    </div>
  </section>
</template>

<style scoped>
.contact { padding: clamp(100px, 16vw, 220px) 0 48px; background: radial-gradient(ellipse at 50% 120%, rgba(139, 92, 246, 0.22), transparent 60%); }
.big { font-size: clamp(44px, 9vw, 128px); }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 40px; }
.cta {
  font-family: var(--font-display); font-weight: 600; font-size: clamp(18px, 2.4vw, 28px); color: var(--bg); text-decoration: none;
  padding: 16px 26px; border-radius: 999px; background: var(--grad-brand); box-shadow: 0 10px 40px rgba(60, 240, 185, 0.25);
  transition: transform 0.25s var(--ease-out), box-shadow 0.25s;
}
.cta:hover { transform: translateY(-3px); box-shadow: 0 16px 50px rgba(60, 240, 185, 0.4); }
.v2-chip { text-decoration: none; transition: color 0.2s, border-color 0.2s; }
.v2-chip:hover { color: var(--text); border-color: var(--border-strong); }
.foot { margin-top: clamp(80px, 12vw, 140px); font-family: var(--font-mono); font-size: 11px; color: var(--muted); }
</style>
