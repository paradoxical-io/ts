# Config Module

A type-safe, environment-aware configuration management system for Node.js applications. This module provides a robust framework for loading, validating, and resolving configuration values from multiple sources including static values, environment variables, and remote providers like AWS Parameter Store.

## Features

- **Type-Safe Configuration**: Strongly-typed configuration schemas with full TypeScript support
- **Environment-Aware**: Load different configurations per environment (local, dev, staging, prod)
- **Multiple Value Providers**: Support for static values, AWS Parameter Store, and reloadable configurations
- **Schema Validation**: Built on Convict for robust schema validation and defaults
- **Lazy Resolution**: Support for lazy-loaded configuration values with `autoResolve`
- **Sensitive Data Handling**: Built-in support for marking and handling sensitive configuration values
- **Database Config Utilities**: Pre-built helpers for common database configuration patterns

## Installation

This module is part of `@paradoxical-io/common-server`:

```bash
npm install @paradoxical-io/common-server
```

## Core Concepts

### Provided Configuration vs. Configuration Instance

The module distinguishes between two types of configuration:

1. **Provided Configuration**: Configuration with unresolved values (e.g., SSM parameter paths)
2. **Configuration Instance**: Fully resolved configuration with actual values

### Value Providers

Value providers fetch configuration values from different sources:

- **StaticConfigProvider**: Returns static string values directly
- **ParameterStore**: Fetches values from AWS Systems Manager Parameter Store
- **ReloadableParameterStore**: Like ParameterStore but allows runtime reloading

## Usage

### Basic Configuration Setup

```typescript
import { Env } from '@paradoxical-io/types';
import {
  ConfigBlock,
  ShapePair,
  Providable,
  ConfigInstance
} from '@paradoxical-io/common-server/config';

// Define your provided config (with unresolved values)
interface ProvidedAppConfig {
  server: {
    port: number;
    host: string;
  };
  features: {
    enableNewUI: boolean;
  };
}

// Define the config schema
function configShape(env: Env): ConfigBlock<ProvidedAppConfig> {
  return {
    server: {
      port: {
        doc: 'Server port',
        format: Number,
        default: 3000,
        env: 'PORT'
      },
      host: {
        doc: 'Server host',
        format: String,
        default: 'localhost',
        env: 'HOST'
      }
    },
    features: {
      enableNewUI: {
        doc: 'Enable new UI features',
        format: Boolean,
        default: false,
        env: 'ENABLE_NEW_UI'
      }
    }
  };
}

// Create a shape pair
const configPair = new ShapePair<ProvidedAppConfig, ProvidedAppConfig>(configShape);

// Load configuration
const config = configPair.load('production', 'config').using(async (conf) => {
  // Transform if needed, or return as-is
  return conf;
});
```

### Using Remote Configuration Providers

```typescript
import {
  ProvidedConfigValue,
  ValueProvider,
  StaticConfigProvider
} from '@paradoxical-io/common-server/config';

// Define config with remote values
interface ProvidedAppConfig {
  database: {
    host: string;
    password: ProvidedConfigValue;
  };
}

// Define schema with SSM parameter
function configShape(env: Env): ConfigBlock<ProvidedAppConfig> {
  return {
    database: {
      host: {
        doc: 'Database host',
        format: String,
        default: 'localhost'
      },
      password: {
        providerType: {
          doc: 'How to load the password',
          format: ['Static', 'ParameterStore'],
          default: 'ParameterStore'
        },
        value: {
          doc: 'SSM parameter path or static value',
          format: String,
          default: '/myapp/prod/db/password',
          sensitive: true
        }
      }
    }
  };
}

// Resolve configuration values
const providers = [new StaticConfigProvider()];
const valueProvider = new ValueProvider(providers);

const providedConfig = load<ProvidedAppConfig>({}, 'production', configShape);

// Resolve the password
const password = await valueProvider.getValue<string>(providedConfig.database.password);
```

### Using Database Configuration Helpers

```typescript
import {
  ProvidedDBConfig,
  DBConfig,
  getDbConfig,
  ValueProvider
} from '@paradoxical-io/common-server/config';

const providedDbConfig: ProvidedDBConfig = {
  type: 'mysql',
  database: 'myapp',
  useSsl: true,
  username: {
    providerType: 'ParameterStore',
    value: '/myapp/db/username'
  },
  password: {
    providerType: 'ParameterStore',
    value: '/myapp/db/password',
    sensitive: true
  },
  url: {
    providerType: 'Static',
    value: 'db.example.com'
  },
  port: {
    providerType: 'Static',
    value: '3306'
  }
};

// Resolve all DB config values at once
const valueProvider = new ValueProvider([/* providers */]);
const dbConfig: DBConfig = await getDbConfig(providedDbConfig, valueProvider);

console.log(dbConfig.username); // Resolved username
console.log(dbConfig.password); // Resolved password (branded type)
```

### Lazy Resolution with autoResolve

The `autoResolve` utility automatically resolves promise-returning functions in configuration objects:

```typescript
import { autoResolve } from '@paradoxical-io/common-server/config';
import { Limiter } from '@paradoxical-io/common/dist/promise/limiter';

// Define config with lazy-loaded values
const lazyConfig = {
  staticValue: 'immediate',
  lazyValue: async () => {
    // Expensive operation or remote fetch
    return await fetchFromRemote();
  },
  nested: {
    anotherLazy: async () => {
      return await computeExpensiveValue();
    }
  }
};

// Resolve all lazy values in parallel (with concurrency control)
const limiter = new Limiter({ maxConcurrent: 5 });
const resolvedConfig = await autoResolve(lazyConfig, limiter);

console.log(resolvedConfig.staticValue);  // 'immediate'
console.log(resolvedConfig.lazyValue);    // Resolved value
console.log(resolvedConfig.nested.anotherLazy); // Resolved value
```

### Loading from Configuration Files

```typescript
import { load } from '@paradoxical-io/common-server/config';

// Load from config/production.json file
const config = load<MyConfig>('config', 'production', configShape);

// Load from object (no file)
const config = load<MyConfig>({
  server: { port: 8080 }
}, 'local', configShape);
```

### Handling Reloadable Configuration

```typescript
import { ReloadableProvidedValue } from '@paradoxical-io/common-server/config';

// Assume this came from a ReloadableParameterStore provider
const reloadableToken: ReloadableProvidedValue = {
  type: 'ReloadableProvidedValue',
  get: () => {
    // Returns current cached value
    return currentToken;
  },
  reload: async (autoJitter: boolean) => {
    // Fetches fresh value from source
    const newToken = await fetchNewToken();
    if (autoJitter) {
      await sleep(Math.random() * 1000);
    }
    return newToken;
  }
};

// Get current value
const token = reloadableToken.get();

// Refresh the value
const freshToken = await reloadableToken.reload(true);
```

## API Reference

### Core Classes and Types

#### `ShapePair<ProvidedConfig, Config>`

Pairs a provided configuration schema with its resolved instance type.

- `shape: (env: Env) => ConfigBlock<ProvidedConfig>` - The configuration schema generator
- `load(env?, sourceConfig?)` - Loads configuration and returns a chainable loader

#### `load<Config>(sourceConfig, env, shape)`

Loads configuration from a file or object using Convict for validation.

- `sourceConfig` - Path to config directory or config object
- `env` - Environment name (local, dev, staging, prod)
- `shape` - Configuration schema function

#### `ValueProvider`

Manages multiple configuration providers and resolves configuration values.

- `getValue<T>(config: ProvidedConfigValue): Promise<T>` - Resolves a provided value
- `registerAll(config: object): void` - Registers all provided values with their providers

#### `autoResolve<T>(data: T, limiter?): Promise<MappedResolved<T>>`

Recursively resolves all promise-returning functions in an object.

- `data` - Object containing mix of values and async functions
- `limiter` - Optional Limiter for concurrency control

#### `getDbConfig(config, valueProvider): Promise<DBConfig>`

Helper to resolve all database configuration values in parallel.

### Configuration Interfaces

#### `ProvidedConfigValue`

```typescript
interface ProvidedConfigValue {
  providerType: string;      // 'Static' | 'ParameterStore' | etc.
  value: string;             // Path or actual value
  sensitive?: boolean;       // Mark as sensitive data
}
```

#### `ConfigProvider`

```typescript
interface ConfigProvider {
  type: string;
  get(providedConfig: ProvidedConfigValue): Promise<string | ReloadableProvidedValue | undefined>;
  register(value: ProvidedConfigValue): void;
}
```

### Error Handling

The module throws `ProvidedConfigError` when unable to resolve a configuration value:

```typescript
import { ProvidedConfigError } from '@paradoxical-io/common-server/config';

try {
  const value = await valueProvider.getValue(config.someValue);
} catch (error) {
  if (error instanceof ProvidedConfigError) {
    console.error(`Failed to load config from ${error.providerType}`);
  }
}
```

## Type Safety

The module uses advanced TypeScript types to ensure type safety:

- `ConfigBlock<T>` - Recursively builds schema types from configuration types
- `LazyProvided<T>` - Allows properties to be values or async functions
- `Providable<T>` - Marks configuration as having value providers
- Branded types for sensitive values (e.g., `DbPassword`, `DbUserName`)

## Best Practices

1. **Separate Concerns**: Define provided config and resolved config as separate interfaces
2. **Use ShapePair**: Leverage `ShapePair` to maintain type relationships
3. **Mark Sensitive Data**: Always set `sensitive: true` for passwords, tokens, etc.
4. **Environment Defaults**: Provide sensible defaults in your schema for development
5. **Validate Early**: Configuration is validated on load - fail fast if invalid
6. **Use autoResolve**: For complex configs with many async values, use `autoResolve` with a limiter

## Examples

See the test files for more examples:
- `/Users/anton.kropp/src/personal/ts/packages/common-server/src/config/loader.test.ts`
- `/Users/anton.kropp/src/personal/ts/packages/common-server/src/config/resolver.test.ts`
