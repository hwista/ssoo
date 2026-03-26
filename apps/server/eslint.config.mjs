import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';
import pluginImport from 'eslint-plugin-import';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.d.ts'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: pluginImport,
    },
    rules: {
      // TypeScript ESLint rules
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off', // Use @typescript-eslint/no-unused-vars instead
      'no-undef': 'off', // TypeScript handles this

      // Export rules - 와일드카드 export 금지
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: '와일드카드 export(export * from) 금지: 명시적 re-export를 사용하세요.',
        },
      ],

      // Layered dependency boundaries
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/modules/common',
              from: './src/modules/pms',
              message: 'pms 모듈은 common을 참조할 수 있지만 common은 pms를 참조할 수 없습니다.',
            },
            {
              target: './src/modules/pms',
              from: './src/modules/common',
              message: '도메인 의존성은 한 방향(pms -> common)만 허용됩니다.',
            },
          ],
        },
      ],
    },
  },
];
