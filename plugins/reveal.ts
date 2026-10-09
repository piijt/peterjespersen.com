// v-reveal: fades/slides a .v2-reveal element in the first time it scrolls into view.
// v-reveal="120" delays it by 120ms (for staggering siblings).
// Registered on the server too (getSSRProps) so server-rendered markup and hydration agree.
export default defineNuxtPlugin((nuxtApp) => {
  let io: IntersectionObserver | undefined;
  const observer = () =>
    (io ??= new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io!.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    ));

  nuxtApp.vueApp.directive<HTMLElement, number | undefined>("reveal", {
    getSSRProps: (binding) => ({
      class: "v2-reveal",
      // the client vnode doesn't carry this class (mounted() adds it), which is fine
      "data-allow-mismatch": "class",
      style: binding.value ? { transitionDelay: `${binding.value}ms` } : undefined,
    }),
    mounted(el, binding) {
      el.classList.add("v2-reveal");
      if (binding.value) el.style.transitionDelay = `${binding.value}ms`;
      observer().observe(el);
    },
    unmounted(el) {
      io?.unobserve(el);
    },
  });
});
