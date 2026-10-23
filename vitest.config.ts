import { defineConfig } from 'vitest/config';

// Vitest transforms .tsx via its own esbuild (jsx: automatic, React 19 runtime),
// so no @vitejs/plugin-react is needed here — keeping plugins out avoids the
// Vite-version type clash between root Vite 8 and Vitest's bundled Vite.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Vitest blanks every CSS import by default — including `?raw`. Let only raw CSS text
    // through so palette.test.ts can pin palette.ts to the index.css tokens (D-14).
    // Regular `.css` imports stay blanked (no Tailwind processing in tests).
    css: { include: [/\.css\?raw$/] },
  },
});
