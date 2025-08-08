import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'youtubei.js/dist/src/parser/nodes': path.resolve(__dirname, 'node_modules/youtubei.js/dist/src/parser/nodes.js')
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    globals: true
  },
});