declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ImportMetaEnv {
  /** URL of the library API's api.php; defaults to /library/api.php on the same origin. */
  readonly VITE_LIBRARY_API?: string;
}

/** The app version as shown to players, injected by vite.config.ts from package.json. */
declare const __RUDA_VERSION__: string;
