import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: parseInt(process.env.UI_PORT || '5173'),
    strictPort: true,
  },
  resolve: {
    alias: {
      // Force CommonJS version of libsodium-wrappers to avoid ESM module resolution issues
      // The package is hoisted to root node_modules due to workspaces
      'libsodium-wrappers': resolve(
        __dirname,
        '../node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js'
      ),
    },
  },
  ssr: {
    // Don't externalize @holochain/client - bundle it so the alias applies
    noExternal: ['@holochain/client'],
  },
  optimizeDeps: {
    // Pre-bundle these for faster dev startup
    include: ['@holochain/client', 'libsodium-wrappers'],
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
  },
});
