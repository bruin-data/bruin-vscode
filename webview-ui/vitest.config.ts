import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path';

export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: tag => tag.startsWith('vscode-')
      }
    }
  })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setup.ts'],
    deps: {
      inline: ['@vue/test-utils']
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
})