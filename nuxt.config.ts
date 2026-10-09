// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  css: ["~/assets/css/main.css", "~/assets/css/v2.css"],
  app: {
    head: {
      link: [
        {
          rel: "icon",
          type: "image/png",
          href: "/favicon-96x96.png",
          sizes: "96x96",
        },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "shortcut icon",
          href: "/favicon.ico",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "apple-touch-icon.png",
        },
        {
          rel: "manifest",
          href: "site.webmanifest",
        },
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  modules: ["nuxt-lucide-icons"],
  lucide: {
    namePrefix: "Icon",
  },
  compatibilityDate: "2024-11-01",
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      // the portfolio API (api/); empty = use the bundled contributions snapshot only
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "",
    },
  },
});
