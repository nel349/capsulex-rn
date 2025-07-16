import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactNativePlugin from 'eslint-plugin-react-native';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';

export default [
  js.configs.recommended,
  
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        __DEV__: 'readonly',
        global: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-native': reactNativePlugin,
      import: importPlugin,
      prettier: prettierPlugin,
      '@typescript-eslint': tseslint,
      '@tanstack/query': tanstackQueryPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',
      
      // React Native specific (some rules disabled until plugin supports ESLint v9)
      // 'react-native/no-unused-styles': 'error', // Disabled: ESLint v9 compatibility
      // 'react-native/split-platform-components': 'warn', // Disabled: ESLint v9 compatibility  
      // 'react-native/no-inline-styles': 'warn', // Disabled: ESLint v9 compatibility
      // 'react-native/no-color-literals': 'warn', // Disabled: ESLint v9 compatibility
      'react-native/no-raw-text': 'off',
      
      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      
      // TanStack Query
      '@tanstack/query/exhaustive-deps': 'error',
      '@tanstack/query/stable-query-client': 'error',
      
      // Import organization
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off', // React Native handles this
      
      // General best practices
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-undef': 'off', // TypeScript handles this
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
    },
  },
  
  // TypeScript files specific rules
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-optional-chain': 'error',
    },
  },
  
  // Prettier config (should be last)
  prettierConfig,
  
  // Ignored patterns
  {
    ignores: [
      'node_modules/',
      'android/',
      'ios/',
      'build/',
      'builds/',
      '.expo/',
      'dist/',
      'coverage/',
      '**/*.config.js',
      'metro.config.cjs',
      'babel.config.cjs',
    ],
  },
]; 