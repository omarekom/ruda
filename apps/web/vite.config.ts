import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';
import { createSourceArchive, displayVersion, sourceArchiveName } from '../../scripts/sourceZip.ts';

/** The dev server has no `dist`, so it makes the source archive the About dialog links to on demand. */
function sourceArchive(): Plugin {
  return {
    name: 'ruda-source-archive',
    configureServer(server) {
      server.middlewares.use(`/${sourceArchiveName()}`, (_request, response) => {
        response.setHeader('Content-Type', 'application/zip');
        response.end(createSourceArchive());
      });
    },
  };
}

export default defineConfig({
  define: { __RUDA_VERSION__: JSON.stringify(displayVersion()) },
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
