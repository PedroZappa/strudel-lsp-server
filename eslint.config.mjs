import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

const typeCheckedFiles = ['src/**/*.ts', 'test/**/*.ts'];
const typeCheckedConfigs = [
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
].map((config) => ({ ...config, files: typeCheckedFiles }));

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'client/**',
      'dist/**',
      'server/**',
      'scripts/e2e.sh',
      '*.tsbuildinfo',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...typeCheckedConfigs,
  {
    files: typeCheckedFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      curly: ['error', 'all'],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
);
