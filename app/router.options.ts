import type { RouterConfig } from "@nuxt/schema";

// Explicit scroll handling: app.vue renders <NuxtPage page-key="static" />, so Nuxt never sees a "new page" and
// its built-in scroll handling doesn't run (e.g. going from the bottom of / to /resume kept the scroll position).

/** resolves once the element exists (the target page may still be rendering), or null after `ms` */
function waitFor(selector: string, ms = 1500): Promise<Element | null> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      const el = document.querySelector(selector);
      if (el || performance.now() - start > ms) return resolve(el);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export default <RouterConfig>{
  async scrollBehavior(to, from, savedPosition) {
    // back/forward: return to where you were
    if (savedPosition) return savedPosition;
    // section links (/#flow): scroll to the section, below the floating nav — smooth on the same page
    if (to.hash) {
      const el = await waitFor(to.hash);
      if (el) return { el, top: 80, behavior: from.path === to.path ? "smooth" : "instant" };
    }
    // any other page change starts at the top — instantly, not via the CSS smooth scroll
    if (to.path !== from.path) return { top: 0, left: 0, behavior: "instant" };
  },
};
