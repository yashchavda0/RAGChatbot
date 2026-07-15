import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { resolve } from 'path'

export default defineConfig({
  // cssInjectedByJsPlugin inlines the compiled (and scoped, see postcss.config.js)
  // CSS directly into widget.js, so the embed snippet stays a single <script> tag.
  plugins: [react(), cssInjectedByJsPlugin()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      name: 'RAGChatbotWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    outDir: 'dist',
    minify: 'esbuild',
    target: 'es2018',
  },
})