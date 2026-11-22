import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies static HTML/CSS/JS files and generated assets into dist/ so
      // both pure static GitHub Pages deployment and Vite production builds work seamlessly.
      {
        name: 'copy-unbundled-static-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          const staticFiles = ['style.css', 'sketch.js'];
          for (const file of staticFiles) {
            const srcFile = path.resolve(__dirname, file);
            if (fs.existsSync(srcFile)) {
              fs.copyFileSync(srcFile, path.resolve(distDir, file));
            }
          }

          const jsDir = path.resolve(__dirname, 'js');
          const distJsDir = path.resolve(distDir, 'js');
          if (fs.existsSync(jsDir)) {
            fs.cpSync(jsDir, distJsDir, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
