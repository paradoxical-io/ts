module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  overrides: [
    {
      // turn the original rule off *only* for test files
      files: ['**/*.test.*', '**/*.itest.*', '**/test/**'],
      rules: {
        '@typescript-eslint/unbound-method': 'off',
        'no-restricted-imports': 'off',
      },
    },
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          'assert',
          'buffer',
          'child_process',
          'cluster',
          'crypto',
          'dgram',
          'dns',
          'domain',
          'events',
          'freelist',
          'fs',
          'http',
          'https',
          'module',
          'net',
          'os',
          'path',
          'punycode',
          'querystring',
          'readline',
          'repl',
          'smalloc',
          'stream',
          'string_decoder',
          'sys',
          'timers',
          'tls',
          'tracing',
          'tty',
          'url',
          'util',
          'vm',
          'zlib',
        ],
        patterns: [
          // dont' let common import any other common stuff
          '@paradoxical-io/common-*/*',
          '\\.\\./dist/*',
          'src',
          '.*\\.(i)?test$',
        ],
      },
    ],
  },
};
