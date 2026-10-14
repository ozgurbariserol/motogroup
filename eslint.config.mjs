import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// MotoGroup — paylaşımlı ESLint (flat config). Tip-bilgili olmayan 'recommended'
// (hızlı; parserOptions.project gerekmez). Prettier ile çakışan stil kuralları kapalı.
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/build/**',
      'packages/shared/src/database.types.ts',
      '**/next-env.d.ts',
      '**/expo-env.d.ts',
      '**/*.config.js',
      '**/*.config.mjs',
      'apps/mobile/app.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
