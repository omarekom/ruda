import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
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
