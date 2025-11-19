# S3 Module

A comprehensive TypeScript module for AWS S3 operations, providing secure storage with KMS encryption, object management, and testing utilities. This module offers high-level abstractions for common S3 tasks including envelope encryption, streaming downloads, pagination, and Docker-based testing.

## Features

- **Secure Storage**: S3SecureStore implements envelope encryption using KMS for storing sensitive data securely
- **Object Download**: Stream S3 objects directly to local files with automatic error handling
- **List Objects**: Async generator for efficiently iterating through large S3 buckets with automatic pagination
- **Testing Support**: S3Docker provides a local S3-compatible environment for integration testing
- **TypeScript Native**: Full type safety with AWS SDK v3

## Installation

This module is part of `@paradoxical-io/common-aws`. Install the package:

```bash
npm install @paradoxical-io/common-aws
# or
yarn add @paradoxical-io/common-aws
```

## Usage

### Secure Storage with Envelope Encryption

The `S3SecureStore` implements a secure storage pattern using envelope encryption. Each object is encrypted with a unique data encryption key (DEK), which is then encrypted by a KMS master key.

```typescript
import { S3SecureStore } from '@paradoxical-io/common-aws/dist/s3';
import { S3Client } from '@aws-sdk/client-s3';
import { KMSClient } from '@aws-sdk/client-kms';

// Initialize the secure store
const secureStore = new S3SecureStore({
  s3Bucket: 'my-secure-bucket',
  kmsKeyID: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
  s3: new S3Client({ region: 'us-east-1' }),
  kms: new KMSClient({ region: 'us-east-1' })
});

// Store encrypted data
const sensitiveData = Buffer.from('my secret data');
await secureStore.set('user/123/credentials', sensitiveData);

// Retrieve and decrypt data
const decrypted = await secureStore.get('user/123/credentials');
console.log(decrypted?.toString()); // 'my secret data'

// Check if key exists
const exists = await secureStore.exists('user/123/credentials');

// Get all versions of an object
const versions = await secureStore.versions('user/123/credentials');
for (const version of versions) {
  console.log(`Version: ${version.version}, Modified: ${version.lastModified}`);
}

// Remove an object
await secureStore.remove('user/123/credentials');
```

### Download S3 Objects to Local Files

Stream S3 objects directly to the filesystem with automatic error handling:

```typescript
import { downloadObject } from '@paradoxical-io/common-aws/dist/s3';
import { S3Client } from '@aws-sdk/client-s3';

const success = await downloadObject({
  bucket: 'my-bucket',
  objectKey: 'data/export.csv',
  filePath: '/tmp/export.csv',
  s3: new S3Client({ region: 'us-east-1' })
});

if (success) {
  console.log('File downloaded successfully');
}
```

### List All Objects with Pagination

Use the async generator to efficiently iterate through large buckets without loading all objects into memory:

```typescript
import { getAllObjects } from '@paradoxical-io/common-aws/dist/s3';
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Iterate through all objects in a bucket
for await (const key of getAllObjects({ Bucket: 'my-bucket' }, s3)) {
  console.log(`Found object: ${key}`);
}

// With prefix filtering
for await (const key of getAllObjects({
  Bucket: 'my-bucket',
  Prefix: 'uploads/2024/'
}, s3)) {
  console.log(`Found upload: ${key}`);
}
```

### Testing with S3Docker

Create a local S3-compatible environment for integration tests:

```typescript
import { newS3Docker } from '@paradoxical-io/common-aws/dist/s3/docker';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// Start local S3 service
const s3Docker = await newS3Docker();

// Create a test bucket
await s3Docker.newBucket('test-bucket');

// Use the S3 client for testing
await s3Docker.s3.send(new PutObjectCommand({
  Bucket: 'test-bucket',
  Key: 'test-file.txt',
  Body: 'test content'
}));

// Clean up when done
await s3Docker.container.stop();
```

## API Reference

### S3SecureStore

Implements the `SecureStore` interface with envelope encryption using S3 and KMS.

**Constructor Options:**
- `s3Bucket: string` - S3 bucket name for storing encrypted objects
- `kmsKeyID: string` - KMS key ID or ARN for encrypting data encryption keys
- `s3?: S3Client` - Optional S3 client instance (defaults to new client)
- `kms?: KMSClient` - Optional KMS client instance (defaults to new client)
- `crypto?: EncryptDecrypt` - Optional custom crypto implementation

**Methods:**
- `set(key: string, data: Buffer): Promise<void>` - Store encrypted data
- `get(key: string, version?: string): Promise<Buffer | undefined>` - Retrieve and decrypt data
- `exists(key: string, version?: string): Promise<boolean>` - Check if key exists
- `remove(key: string): Promise<void>` - Delete an object
- `versions(key: string): Promise<SecureVersion[]>` - List all versions of an object

### downloadObject

Downloads an S3 object to a local file path using streaming.

**Parameters:**
- `bucket: string` - S3 bucket name
- `objectKey: string` - S3 object key
- `filePath: string` - Local file path to write to
- `s3?: S3Client` - Optional S3 client instance

**Returns:** `Promise<boolean>` - True if download succeeded, false otherwise

### getAllObjects

Async generator that yields all object keys from an S3 bucket with automatic pagination.

**Parameters:**
- `params: ListObjectsCommandInput` - S3 list objects parameters (Bucket, Prefix, etc.)
- `s3?: S3Client` - Optional S3 client instance

**Yields:** `AsyncGenerator<string>` - Object keys one at a time

### S3Docker

Test utility for running a local S3-compatible service using Docker.

**Methods:**
- `newBucket(bucket?: string): Promise<void>` - Create a new bucket (default: 'default')
- `container: Docker` - The underlying Docker container
- `s3: S3Client` - Pre-configured S3 client pointing to the local instance

**Factory Function:**
- `newS3Docker(): Promise<S3Docker>` - Creates and starts a new S3Docker instance

## Security Considerations

The `S3SecureStore` uses envelope encryption for enhanced security:

1. Each object is encrypted with a unique Data Encryption Key (DEK)
2. The DEK is encrypted by a KMS master key (Key Encryption Key)
3. The encrypted DEK and encrypted payload are stored together in S3
4. Decryption requires both S3 access and KMS decrypt permissions

This approach provides:
- Key rotation capabilities without re-encrypting data
- Reduced KMS API calls (only for key operations, not data)
- Defense in depth - compromise of either S3 or KMS alone is insufficient

## Dependencies

- `@aws-sdk/client-s3` - AWS SDK v3 S3 client
- `@aws-sdk/client-kms` - AWS SDK v3 KMS client
- `@paradoxical-io/common-server` - Internal crypto and utilities
- `@paradoxical-io/types` - Internal type definitions
- `joi` - Schema validation for envelope structure

## Error Handling

All functions properly handle AWS SDK errors:
- `NoSuchKey` errors return `undefined` instead of throwing
- `NotFound` errors in `exists()` return `false`
- All other errors are logged and re-thrown for proper error handling
- Invalid envelope structures are validated with Joi and throw descriptive errors