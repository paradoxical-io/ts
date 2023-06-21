/**
 * The root eslint config for the entire monorepo
 *
 * backend/pure typescript packages can just extend this and be good to go
 *
 */

module.exports = {
  root: true,
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  extends: ['airbnb/base', 'airbnb-typescript/base', 'plugin:prettier/recommended'],
  overrides: [
    {
      // turn the original rule off *only* for test files
      files: ['**/*.test.*', '**/*.itest.*', '**/test/**'],
      rules: {
        '@typescript-eslint/unbound-method': 'off',
      },
    },
  ],
  rules: {
    '@typescript-eslint/unbound-method': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-floating-promises': ['error'],
    '@typescript-eslint/dot-notation': 'off',
    '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true }],
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        modifiers: ['destructured'],
        format: null,
      },
    ],
    'arrow-body-style': ['warn', 'as-needed'],
    'arrow-parens': ['error', 'as-needed'],
    'class-methods-use-this': 'off',
    // tsc will already check consistent returns
    'consistent-return': 'off',
    curly: 'error',
    'import/first': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/prefer-default-export': 'off',
    'import/order': 'off',
    'import/no-cycle': 'off',
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'jest/expect-expect': ['warn', { assertFunctionNames: ['expect', 'safeExpect'] }],
    'jest/no-disabled-tests': 'warn',
    'jsx-a11y/accessible-emoji': 'off',
    'max-classes-per-file': 'off',
    'no-await-in-loop': 'off',
    'no-console': 'error',
    'no-continue': 'off',
    'no-plusplus': 'off',
    'no-nested-ternary': 'warn',
    'no-underscore-dangle': 'off',
    'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
    'no-restricted-imports': [
      'error',
      {
        patterns: ['\\.\\./dist/*', 'src', '.*\\.(i)?test$'],
      },
    ],
    'prefer-destructuring': 'off',

    /**
     * Disable prettier and trailing-spaces for normal IDE workflow.  Specifically IDE's often add
     * smart indentation that adds spaces to newlines to preserve contextual indentation.
     *
     * However, prettier shows an error for empty lines that just have spaces.
     *
     * While we want those lines and spaces _gone_ doing this during IDE integration is a pain
     * because it just shows a ton of errors.  To that point we can turn this off for code-write
     * linting (integrated with IDEs) and instead re-enable this during CI linting as a CLI flag
     * using the --rule command to eslint.  We then re-enable this as an ERROR during CI PR linting phases.
     *
     * Staged linting still runs prettier-quick so it should always fix things on commit _anyways_
     */
    'prettier/prettier': 'off',
    'trailing-spaces': 'off',

    /**
     * Back compat. These are flags we have disabled or made into warnings to be able to get eslint into the
     * backend services.  They can be updated to be more string but originally were not done so to minimize churn
     */
    'prefer-template': 'warn',
    'prefer-object-spread': 'off',
    '@typescript-eslint/no-shadow': 'warn',
    'no-param-reassign': 'warn',
    'simple-import-sort/exports': 'warn',
    'simple-import-sort/imports': 'warn',
    'no-useless-escape': 'warn',
  },
  plugins: ['jest', 'simple-import-sort', 'ban'],
  env: {
    'jest/globals': true,
  },
};
