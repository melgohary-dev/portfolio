import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const eslintConfig = tseslint.config(
  { ignores: ['node_modules/**', '.next/**', 'out/**', 'next-env.d.ts'] },
  ...tseslint.configs.recommended,
  prettier,
);

export default eslintConfig;
