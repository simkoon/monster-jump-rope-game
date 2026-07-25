import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
// Test config lives in vitest.config.ts (Vitest bundles its own Vite copy,
// so keeping the plugin-typed app config separate avoids a type clash).
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
