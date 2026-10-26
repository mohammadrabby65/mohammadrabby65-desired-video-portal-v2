import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'child_process';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function collectUsedLucideIcons(dir: string, out = new Set<string>()): Set<string> {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectUsedLucideIcons(fullPath, out);
    } else if (/\.[jt]sx?$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(content)) !== null) {
        for (const part of match[1].split(',')) {
          const importedName = part.trim().split(/\s+as\s+/)[0].trim();
          if (importedName) out.add(importedName);
        }
      }
    }
  }
  return out;
}

export default defineConfig(() => {
  const usedIcons = collectUsedLucideIcons(path.resolve(__dirname, 'src'));

  return {
    plugins: [
      {
        name: 'optimize-lucide-barrel',
        load(id) {
          if (
            usedIcons.size > 0 &&
            id.replace(/\\/g, '/').endsWith('lucide-react/dist/esm/lucide-react.js')
          ) {
            const raw = fs.readFileSync(id, 'utf8');
            const filteredLines = raw.split('\n').filter((line) => {
              if (!line.startsWith('export {')) return false;
              for (const icon of usedIcons) {
                if (new RegExp(`\\bas\\s+${icon}\\b`).test(line)) {
                  return true;
                }
              }
              return false;
            });
            return filteredLines.join('\n');
          }
          return null;
        },
        transform(code, id) {
          if (id.includes('node_modules') && code.length > 50000 && /\.[cm]?js$/.test(id)) {
            return {
              code: esbuild.transformSync(code, {
                loader: 'js',
                minify: true,
                target: 'es2022',
              }).code,
              map: null,
            };
          }
          return null;
        },
      },
      react(),
      tailwindcss(),
      {
        name: 'bundle-backend-server',
        closeBundle() {
          const buildScript = path.resolve(__dirname, 'scripts/build-server.cjs');
          if (fs.existsSync(buildScript)) {
            execFileSync(process.execPath, [buildScript], {stdio: 'inherit'});
          }
        },
      },
    ],
    build: {
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        external: [
          'firebase/app',
          'firebase/firestore',
          'firebase/auth',
          'firebase/app-check',
          'hls.js',
        ],
        output: {
          paths: {
            'firebase/app': '/assets/vendor/firebase-app.js',
            'firebase/firestore': '/assets/vendor/firebase-firestore.js',
            'firebase/auth': '/assets/vendor/firebase-auth.js',
            'firebase/app-check': '/assets/vendor/firebase-app-check.js',
            'hls.js': '/assets/vendor/hls.js',
          },
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react')) {
                return 'vendor-react';
              }
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
