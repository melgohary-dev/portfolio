import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const eslintConfig = tseslint.config(
  { ignores: ['node_modules/**', 'dist/**'] },
  ...tseslint.configs.recommended,
  prettier,
);

export default eslintConfig;
