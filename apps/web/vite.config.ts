import { execFileSync } from 'node:child_process';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';

/** The dev server has no `dist`, so it makes the source archive the About dialog links to on demand. */
function sourceArchive(): Plugin {
  return {
    name: 'ruda-source-archive',
    configureServer(server) {
      server.middlewares.use('/ruda-source.zip', (_request, response) => {
        const archive = execFileSync('git', ['archive', '--format=zip', '--prefix=ruda/', 'HEAD'], {
          cwd: import.meta.dirname,
          maxBuffer: 256 * 1024 * 1024,
        });
        response.setHeader('Content-Type', 'application/zip');
        response.end(archive);
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), sourceArchive()],
  server: {
    // The library API runs on PHP's development server: pnpm --filter @ruda/library-api dev
    proxy: {
      '/library': {
        target: 'http://127.0.0.1:8090',
        rewrite: (path) => path.replace(/^\/library/, ''),
      },
    },
  },
});
