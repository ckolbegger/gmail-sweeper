const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');

module.exports = tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            react: reactPlugin,
        },
        rules: {
            'react/prop-types': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
        ignores: ['dist/**', 'node_modules/**'],
    }
);
