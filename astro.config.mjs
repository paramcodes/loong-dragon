// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://loong-dragon.pages.dev',
  integrations: [react()],
  vite: {
    plugins: [tailwind()],
    resolve: {
      alias: { '@': new URL('./src/', import.meta.url).pathname },
    },
  },
});
