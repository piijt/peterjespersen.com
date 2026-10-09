/**
 * True while the element is (roughly) on screen. Worlds use it to pause animation loops off-screen.
 *   const el = ref<HTMLElement>(); const inView = useInView(el)
 */
export function useInView(el: Ref<HTMLElement | undefined | null>, rootMargin = "0px 0px -10% 0px") {
  const inView = ref(false);
  let io: IntersectionObserver | undefined;
  onMounted(() => {
    io = new IntersectionObserver(([e]) => { inView.value = !!e?.isIntersecting; }, { rootMargin });
    if (el.value) io.observe(el.value);
  });
  watch(el, (next, prev) => {
    if (prev) io?.unobserve(prev);
    if (next) io?.observe(next);
  });
  onBeforeUnmount(() => io?.disconnect());
  return inView;
}

/** prefers-reduced-motion, reactive */
export function useReducedMotion() {
  const reduced = ref(false);
  onMounted(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    reduced.value = mq.matches;
    mq.addEventListener("change", (e) => { reduced.value = e.matches; });
  });
  return reduced;
}
