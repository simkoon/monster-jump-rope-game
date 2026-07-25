import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
// Test config lives in vitest.config.ts (Vitest bundles its own Vite copy,
// so keeping the plugin-typed app config separate avoids a type clash).
export default defineConfig({
  // Project GitHub Pages is served under /<repo>/ — assets must resolve there.
  base: '/monster-jump-rope-game/',
  plugins: [react(), tailwindcss()],
});
