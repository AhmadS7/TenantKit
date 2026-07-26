import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      'complexity': ['warn', { max: 10 }],
      'max-lines-per-function': [
        'warn',
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['warn', { max: 4 }],
      'max-depth': ['warn', { max: 4 }],
    },
  },
  {
    files: ['__tests__/**'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
]);

export default eslintConfig;
