import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget/index.ts'),
      name: 'UserFeedbackWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    outDir: 'public',
    emptyOutDir: false,
    minify: 'oxc',
    sourcemap: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
