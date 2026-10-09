import type { RouterConfig } from "@nuxt/schema";

// Explicit scroll handling: app.vue renders <NuxtPage page-key="static" />, so Nuxt never sees a "new page" and
// its built-in scroll-to-top doesn't run when going e.g. from the bottom of / to /resume.
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // back/forward: return to where you were
    if (savedPosition) return savedPosition;
    // section links (/#trade-raid): scroll to the section, below the floating nav
    if (to.hash) return { el: to.hash, top: 80, behavior: from.path === to.path ? "smooth" : "instant" };
    // any other page change starts at the top — instantly, not via the CSS smooth scroll
    if (to.path !== from.path) return { top: 0, left: 0, behavior: "instant" };
  },
};
