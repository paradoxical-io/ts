# Encryption Module

A TypeScript encryption library providing secure implementations of AES-256-GCM symmetric encryption and RSA asymmetric encryption using Node.js built-in crypto module. This module offers type-safe encryption primitives for server-side applications with support for secure data storage interfaces.

## Features

- **AES-256-GCM Encryption**: Parallelizable authenticated encryption with tamper detection
- **RSA Public/Private Key Encryption**: Asymmetric encryption using RSA-OAEP padding
- **Type Safety**: Branded types for encrypted data, keys, and secrets to prevent misuse
- **Secure Store Interface**: Abstraction for implementing secure storage backends
- **Zero Dependencies**: Uses only Node.js native crypto module

## Installation

This module is part of `@paradoxical-io/common-server`:

```bash
npm install @paradoxical-io/common-server
```

Or with yarn:

```bash
yarn add @paradoxical-io/common-server
```

## Usage

### AES-256-GCM Symmetric Encryption

The `EncryptDecrypt` class provides authenticated symmetric encryption using AES-256-GCM. GCM mode is preferred over CBC because it's parallelizable and provides authentication (similar to HMAC), which allows detection of data tampering.

```typescript
import { EncryptDecrypt } from '@paradoxical-io/common-server/encryption';

const encryptor = new EncryptDecrypt();

// Encrypt data
const data = Buffer.from('sensitive information');
const encrypted = await encryptor.encrypt(data);

// The encrypted result contains both the encrypted data and encryption parameters
console.log(encrypted.data);     // EncryptedData (hex-encoded string)
console.log(encrypted.params.iv);   // Initialization vector
console.log(encrypted.params.key);  // Encryption key (keep this secret!)
console.log(encrypted.params.auth); // Authentication tag

// Decrypt data
const decrypted = await encryptor.decrypt(encrypted.data, encrypted.params);
console.log(decrypted.toString()); // 'sensitive information'
```

### RSA Asymmetric Encryption

The `Encryption` class provides RSA encryption with OAEP padding for secure public/private key operations.

```typescript
import { Encryption } from '@paradoxical-io/common-server/encryption';
import { generateKeyPairSync } from 'crypto';
import { PrivateKeyPassphrase, PublicKey, PrivateKey } from '@paradoxical-io/types';

// Generate RSA key pair
const passphrase = 'my-secure-passphrase' as PrivateKeyPassphrase;
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: 'pkcs1',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase,
  },
});

// Encrypt with public key
const sensitiveData = 'credit-card-number';
const encrypted = Encryption.encryptWithPublicKey(
  sensitiveData,
  publicKey as PublicKey
);

// Decrypt with private key
const decrypted = Encryption.decryptWithPrivateKey(
  encrypted,
  privateKey as PrivateKey,
  passphrase
);

console.log(decrypted); // 'credit-card-number'
```

### Implementing Secure Storage

The `SecureStore` interface provides a contract for implementing secure storage backends:

```typescript
import { SecureStore, SecureVersion } from '@paradoxical-io/common-server/encryption';
import { EncryptDecrypt } from '@paradoxical-io/common-server/encryption';

class MySecureStore implements SecureStore {
  private storage = new Map<string, Buffer>();
  private encryptor = new EncryptDecrypt();

  async set(key: string, data: Buffer): Promise<void> {
    const encrypted = await this.encryptor.encrypt(data);
    // Store encrypted.data and encrypted.params securely
    this.storage.set(key, Buffer.from(JSON.stringify(encrypted)));
  }

  async get(key: string, version?: string): Promise<Buffer | undefined> {
    const stored = this.storage.get(key);
    if (!stored) return undefined;

    const encrypted = JSON.parse(stored.toString());
    return await this.encryptor.decrypt(encrypted.data, encrypted.params);
  }

  async exists(key: string, version?: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async versions(key: string): Promise<SecureVersion[]> {
    // Implement versioning logic
    return [];
  }
}
```

## API

### EncryptDecrypt

**Methods:**
- `encrypt(data: Buffer): Promise<Encrypted>` - Encrypts data using AES-256-GCM with randomly generated IV and key
- `decrypt(data: EncryptedData, params: EncryptionParams): Promise<Buffer>` - Decrypts data using provided encryption parameters

**Types:**
- `Encrypted` - Contains encrypted data and encryption parameters (IV, key, auth tag)
- `EncryptionParams` - Parameters needed for decryption (IV, key, auth tag)
- `EncryptedData` - Branded type for encrypted hex-encoded string
- `Secret` - Branded type for encryption keys

### Encryption

**Static Methods:**
- `encryptWithPublicKey<T>(value: T, publicKey: PublicKey): Encrypted<T>` - Encrypts string data with RSA public key
- `decryptWithPrivateKey<T>(value: Encrypted<T>, privateKey: PrivateKey, passphrase: PrivateKeyPassphrase): T` - Decrypts data with RSA private key

### SecureStore Interface

**Methods:**
- `set(key: string, data: Buffer): Promise<void>` - Store encrypted data
- `get(key: string, version?: string): Promise<Buffer | undefined>` - Retrieve and decrypt data
- `exists(key: string, version?: string): Promise<boolean>` - Check if key exists
- `remove(key: string): Promise<void>` - Remove stored data
- `versions(key: string): Promise<SecureVersion[]>` - List available versions

## Security Considerations

- **AES-256-GCM**: Provides both confidentiality and authenticity. The authentication tag ensures data hasn't been tampered with
- **RSA-OAEP**: Uses OAEP padding (RSA_PKCS1_OAEP_PADDING) which is more secure than PKCS#1 v1.5 padding
- **Key Management**: Encryption keys and parameters must be stored securely. Loss of keys means permanent data loss
- **Initialization Vectors**: Each encryption operation generates a unique random IV for security
- **Key Size**: Uses 32-byte (256-bit) keys for AES and supports up to 4096-bit RSA keys

## Implementation Details

- **Algorithm**: AES-256-GCM for symmetric, RSA with OAEP padding for asymmetric
- **IV Size**: 16 bytes (128 bits)
- **Key Size**: 32 bytes (256 bits) for AES
- **Encoding**: UTF-8 for input, hex for encrypted output
- **Authentication**: GCM mode provides built-in authentication tags

## License

MIT
