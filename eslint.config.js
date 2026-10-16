import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      curly: ['error', 'all'],
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'error',
      'no-inline-comments': 'error',
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx'], location: 'anywhere' }],
      'max-params': ['error', 3],
      'no-nested-ternary': 'error',
      'no-unused-vars': 'error',
      'object-shorthand': 'error',
    },
  },
];
