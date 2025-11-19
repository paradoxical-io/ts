# Environment Module

A lightweight utility module for managing and detecting runtime environments in Node.js applications. This module provides a type-safe way to work with different deployment environments (local, dev, prod) and detect whether code is running on a developer machine or a remote server.

## Features

- Type-safe environment detection and management using the `PARADOX_ENV` environment variable
- Automatic detection of local vs. remote execution context based on OS platform
- Environment validation with helpful error messages
- Simple API for setting and querying the current environment
- Zero runtime overhead for environment checks

## Core Concepts

The module distinguishes between two related but different concepts:

1. **Execution Context** (`isLocal`/`isRemote`): Where the code is physically running (developer machine vs. remote server)
2. **Environment Configuration** (`currentEnvironment()`): Which environment configuration is active (local, dev, prod)

This allows scenarios like running code on a local machine while pointing to dev or prod services.

## Installation

This module is part of `@paradoxical-io/common-server`:

```bash
npm install @paradoxical-io/common-server
# or
yarn add @paradoxical-io/common-server
```

## Usage

### Setting the Environment

Before using environment-related functions, you must set the `PARADOX_ENV` environment variable:

```typescript
import { setEnvironment } from '@paradoxical-io/common-server/env';

// Set the environment programmatically
setEnvironment('dev');

// Or set via environment variable
// PARADOX_ENV=prod node app.js
```

### Checking the Current Environment

```typescript
import { currentEnvironment, isProd } from '@paradoxical-io/common-server/env';

// Get the current environment
const env = currentEnvironment(); // Returns 'local' | 'dev' | 'prod'

// Check if running in production
if (isProd()) {
  console.log('Production mode - enabling strict security');
}

// Switch behavior based on environment
switch (currentEnvironment()) {
  case 'local':
    console.log('Using local database');
    break;
  case 'dev':
    console.log('Using dev database');
    break;
  case 'prod':
    console.log('Using production database');
    break;
}
```

### Detecting Execution Context

```typescript
import { isLocal, isRemote } from '@paradoxical-io/common-server/env';

// Check if running on a developer machine (macOS)
if (isLocal) {
  console.log('Running on developer machine');
  // Enable hot-reloading, verbose logging, etc.
}

// Check if running on a remote server
if (isRemote) {
  console.log('Running on remote server');
  // Enable production optimizations, monitoring, etc.
}
```

### Parsing and Validating Environment Strings

```typescript
import { tryParse, envNames } from '@paradoxical-io/common-server/env';

// Safely parse a string to an Env type
const userInput = 'dev';
const env = tryParse(userInput);

if (env) {
  console.log(`Valid environment: ${env}`);
} else {
  console.log(`Invalid environment. Valid options: ${envNames.join(', ')}`);
}
```

### Complete Example: Application Bootstrap

```typescript
import {
  setEnvironment,
  currentEnvironment,
  isLocal,
  isProd,
  tryParse
} from '@paradoxical-io/common-server/env';

// Parse environment from command line or environment variable
const envArg = process.env.PARADOX_ENV || process.argv[2] || 'local';
const env = tryParse(envArg);

if (!env) {
  console.error(`Invalid environment: ${envArg}`);
  process.exit(1);
}

// Set the environment
setEnvironment(env);

// Configure application based on environment
const config = {
  database: isProd() ? 'prod-db.example.com' : 'dev-db.example.com',
  logLevel: isLocal ? 'debug' : 'info',
  enableMetrics: currentEnvironment() !== 'local',
  corsOrigins: isProd() ? ['https://app.example.com'] : ['*']
};

console.log(`Starting application in ${currentEnvironment()} environment`);
console.log(`Execution context: ${isLocal ? 'local' : 'remote'}`);
```

## API Reference

### Functions

#### `currentEnvironment(): Env`
Returns the current environment from the `PARADOX_ENV` environment variable. Throws an error if the environment is not set or invalid.

**Returns:** `'local' | 'dev' | 'prod'`

**Throws:** Error if `PARADOX_ENV` is not set or contains an invalid value

#### `setEnvironment(env: Env): void`
Sets the current environment by updating the `PARADOX_ENV` environment variable.

**Parameters:**
- `env`: The environment to set (`'local'`, `'dev'`, or `'prod'`)

**Throws:** Error if an invalid environment is provided

#### `isProd(): boolean`
Convenience function that returns `true` if the current environment is production.

**Returns:** `boolean`

#### `tryParse(s: string): Env | undefined`
Attempts to parse a string as a valid environment name.

**Parameters:**
- `s`: The string to parse

**Returns:** `Env` if valid, `undefined` otherwise

### Constants

#### `isLocal: boolean`
Boolean constant that is `true` when running on a local developer machine (macOS), `false` otherwise. Based on OS platform detection, not environment configuration.

#### `isRemote: boolean`
Boolean constant that is `true` when running on a remote server (non-macOS), `false` otherwise. Inverse of `isLocal`.

#### `envNames: Env[]`
Array of all valid environment names: `['local', 'dev', 'prod']`

## Environment Variable

### `PARADOX_ENV`
The environment variable used to store the current environment. Must be set to one of:
- `local` - Local development environment
- `dev` - Development/staging environment
- `prod` - Production environment

## Error Handling

The module throws descriptive errors when:
1. The `PARADOX_ENV` variable is not set when calling `currentEnvironment()`
2. An invalid environment name is provided to `setEnvironment()` or found in `PARADOX_ENV`

Always ensure the environment is set before calling environment-dependent functions:

```typescript
import { setEnvironment, currentEnvironment } from '@paradoxical-io/common-server/env';

try {
  const env = currentEnvironment();
} catch (error) {
  console.error('Environment not set, defaulting to local');
  setEnvironment('local');
}
```

## Platform Detection

The module uses Node.js `os.platform()` to detect execution context:
- `darwin` (macOS) is considered a local developer machine
- All other platforms are considered remote servers

This assumption works well for teams using macOS for development and Linux for production deployments.
