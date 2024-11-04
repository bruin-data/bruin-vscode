import path from "path"
import vue from '@vitejs/plugin-vue'
const { defineConfig } = await import('vitest/config');
import { resolve } from 'path'

import tailwind from "tailwindcss"
import autoprefixer from "autoprefixer"

// https://vitejs.dev/config/
export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  build: {
    outDir: "build",
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        lineage: resolve(__dirname, 'lineage/index.html'),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
})
