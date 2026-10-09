import type { Contributions } from "~/shared/contributions";

/**
 * Merged GitHub contributions of both accounts, from the portfolio API (api/, MongoDB-backed).
 * Falls back to the bundled snapshot (public/contributions.snapshot.json, refreshed with `pnpm snapshot` in api/)
 * when the API isn't configured or can't be reached, so the page always has real numbers.
 */
export function useContributions() {
  const apiBase = useRuntimeConfig().public.apiBase as string;
  return useAsyncData<Contributions>(
    "contributions",
    async () => {
      if (apiBase) {
        try {
          return await $fetch<Contributions>(`${apiBase}/contributions`, { timeout: 6000 });
        } catch {
          /* fall through to the snapshot */
        }
      }
      return await $fetch<Contributions>("/contributions.snapshot.json");
    },
    { server: false, lazy: true },
  );
}
