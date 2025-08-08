// plugin.vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    viteSingleFile()
  ],
  resolve: {
    alias: {
      'youtubei.js/dist/src/parser/nodes': path.resolve(__dirname, 'node_modules/youtubei.js/dist/src/parser/nodes.js')
    }
  },
  build: {
    minify: true,
    target: 'esnext',
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.ts'),
      output: {
        entryFileNames: 'index.js',
      }
    }
  }
});