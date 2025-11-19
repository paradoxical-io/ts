# Hash Module

A collection of consistent hashing utilities for deterministic feature rollouts, A/B testing, and probabilistic experiments. The module provides MD5-based hashing functions that map values to a consistent numeric space, enabling stable user assignments across distributed systems.

## Features

- **Consistent Hashing**: Map any string value to a deterministic number between 0 and 1
- **Experiment Key Offsetting**: Distribute users across different experiments to avoid selection bias
- **Probabilistic Rollouts**: Deterministically enable features for a percentage of users
- **Content Hashing**: Generate consistent MD5 hashes for objects regardless of key order

## Core Concepts

This module uses MD5 hashing to create deterministic mappings from strings to numeric values. The primary use case is feature flag rollouts where you want the same user ID to always map to the same decision, but different experiments should have independent distributions.

## Installation

This module is part of `@paradoxical-io/common-server`:

```bash
npm install @paradoxical-io/common-server
```

## Usage

### Basic Consistent Hashing

Map a user ID or any string to a deterministic value between 0 and 1:

```typescript
import { consistentHash } from '@paradoxical-io/common-server/hash';

const userId = 'user-123';
const hashValue = consistentHash(userId);
// Always returns the same value for 'user-123', e.g., 0.742891

// Use for percentage-based rollouts
if (hashValue <= 0.25) {
  // This user is in the 25% group
  enableNewFeature();
}
```

### Experiment-Based Consistent Hashing

Offset the hash space per experiment to ensure users aren't always in the same percentile:

```typescript
import { consistentHashExperimentKey } from '@paradoxical-io/common-server/hash';

const userId = 'user-123';

// Different experiments map the same user to different values
const experimentA = consistentHashExperimentKey(userId, 'checkout-redesign');
const experimentB = consistentHashExperimentKey(userId, 'new-pricing');

// Same user, same experiment = always the same value
const sameExperiment = consistentHashExperimentKey(userId, 'checkout-redesign');
console.log(experimentA === sameExperiment); // true
```

### Probabilistic Feature Rollouts

Use `consistentChance` for simple percentage-based feature flags:

```typescript
import { consistentChance } from '@paradoxical-io/common-server/hash';

const userId = 'user-123';

// Roll out to 10% of users for 'new-dashboard' experiment
if (consistentChance(userId, 'new-dashboard', 10)) {
  showNewDashboard();
} else {
  showOldDashboard();
}

// The same user will always get the same result for the same variant
const isEnabled = consistentChance(userId, 'new-dashboard', 10);
const stillEnabled = consistentChance(userId, 'new-dashboard', 10);
console.log(isEnabled === stillEnabled); // true
```

### MD5 Hashing

Generate MD5 hashes for strings:

```typescript
import { md5 } from '@paradoxical-io/common-server/hash';

const hash = md5('hello world');
// Returns: "5eb63bbbe01eeed093cb22bb8f5acdc3"
```

### Consistent Object Hashing

Create stable hashes for objects regardless of key order:

```typescript
import { consistentMd5 } from '@paradoxical-io/common-server/hash';

const obj1 = { name: 'Alice', age: 30 };
const obj2 = { age: 30, name: 'Alice' }; // Different key order

const hash1 = consistentMd5(obj1);
const hash2 = consistentMd5(obj2);

console.log(hash1 === hash2); // true - same logical content
```

## API Reference

### `consistentHash(value: string, offset?: number): number`

Maps a string to a deterministic value between 0 and 1 using MD5 hashing.

- **value**: The string to hash
- **offset**: Optional numeric offset to shift the hash in the number space
- **Returns**: A number between 0 and 1

### `consistentHashExperimentKey(value: string, key: string): number`

Maps a string to a deterministic value between 0 and 1, offset by the hash of an experiment key.

- **value**: The string to hash (typically a user ID)
- **key**: The experiment identifier used to offset the hash space
- **Returns**: A number between 0 and 1

### `consistentChance(key: string, variant: string, percentage: number): boolean`

Deterministically returns true or false based on whether the key falls within the specified percentage.

- **key**: The identifier to hash (should be uniformly distributed, like a UUID)
- **variant**: A unique identifier for this experiment/variant
- **percentage**: The percentage threshold (0-100)
- **Returns**: `true` if the key falls within the percentage, `false` otherwise

### `md5(value: string): string`

Generates an MD5 hash of a string.

- **value**: The string to hash
- **Returns**: Hexadecimal MD5 hash string

### `consistentMd5(value: unknown): string`

Generates a consistent MD5 hash of any value by deep-sorting object keys before hashing.

- **value**: Any value to hash
- **Returns**: Hexadecimal MD5 hash string

## Use Cases

### Feature Flag Rollouts

```typescript
// Roll out a feature to 5% of users
const shouldShowFeature = consistentChance(userId, 'new-search-v2', 5);

// Gradually increase to 10%, same users stay enabled
const shouldShowFeature = consistentChance(userId, 'new-search-v2', 10);
```

### A/B Testing

```typescript
const variant = consistentHashExperimentKey(userId, 'pricing-test');

if (variant < 0.33) {
  showVariantA();
} else if (variant < 0.66) {
  showVariantB();
} else {
  showVariantC();
}
```

### Content Versioning

```typescript
// Generate stable cache keys for objects
const cacheKey = `config:${consistentMd5(configObject)}`;
```

## Important Notes

- **Use UUID/Uniform Keys**: The key should be uniformly distributed (like a UUID). Appending or prepending values can skew the distribution.
- **Variant Independence**: Different variant names ensure independent distributions, preventing the same users from always being in early rollout groups.
- **Determinism**: The same input always produces the same output, enabling consistent behavior across distributed systems.
- **MD5 Usage**: MD5 is used for speed and distribution properties, not cryptographic security.

## Testing

The module includes property-based tests to verify:
- Hash values always fall between 0 and 1
- The same input always produces the same output
- Hash values are well-distributed across the 0-1 spectrum
- Different experiment keys produce different offsets for the same user
