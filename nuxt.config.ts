// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  css: [
    '~/assets/css/main.css',
  ],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  modules: ['nuxt-lucide-icons'],
  lucide: {
    namePrefix: 'Icon'
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
})