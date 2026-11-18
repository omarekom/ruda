import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // tmp_gui_props/ holds throwaway GUI sketches, not app code.
  { ignores: ['**/dist/**', '**/node_modules/**', 'tmp_gui_props/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    languageOptions: { globals: { ...globals.browser, __RUDA_VERSION__: 'readonly' } },
  },
  prettier,
);
