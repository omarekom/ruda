declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ImportMetaEnv {
  /** URL of the library API's api.php; defaults to /library/api.php on the same origin. */
  readonly VITE_LIBRARY_API?: string;
}
