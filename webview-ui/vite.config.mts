import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";
import fs from 'fs-extra'; // You'll need to install this: npm install fs-extra

// Add a simple hook to copy the codicons font after build
const copyCodiconsPlugin = () => {
  return {
    name: 'copy-codicons',
    closeBundle: async () => {
      const sourcePath = resolve(__dirname, 'node_modules/@vscode/codicons/dist/codicon.ttf');
      const destPath = resolve(__dirname, 'build/assets/codicon.ttf');
      
      try {
        await fs.copy(sourcePath, destPath);
        console.log('Codicons font copied successfully');
      } catch (err) {
        console.error('Error copying codicons font:', err);
      }
    }
  };
};

const copyTestAssetsPlugin = () => {
  return {
    name: 'copy-test-assets',
    closeBundle: async () => {
      const sourceTestFolder = resolve(__dirname, '../src/ui-test/test-pipeline');
      const destTestFolder = resolve(__dirname, '../out/ui-test/test-pipeline');
      try {
        await fs.copy(sourceTestFolder, destTestFolder);
        console.log('Test assets copied successfully');
      } catch (err) {
        console.error('Error copying test assets:', err);
      }
    }
  };
};

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  plugins: [vue(), copyCodiconsPlugin(), copyTestAssetsPlugin()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    }
  },
  build: {
    outDir: "build",
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        lineage: resolve(__dirname, 'lineage/index.html'),
        queryPreview: resolve(__dirname, 'query-preview/index.html'),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});