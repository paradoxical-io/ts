# HTTP Module

A production-ready Axios wrapper providing pre-configured HTTP clients with proxy support, connection pooling, error handling utilities, and comprehensive logging interceptors for server-side TypeScript applications.

## Features

- Pre-configured Axios instances with sensible defaults (5-minute timeout, keep-alive connections)
- Automatic proxy configuration for local development environments
- Type-safe error checking utilities with HTTP status code helpers
- Logging interceptors with automatic metrics emission for error tracking
- Connection pooling with HTTPS keep-alive support
- Request/response payload logging with automatic truncation

## Installation

This module is part of `@paradoxical-io/common-server`. Install it via:

```bash
npm install @paradoxical-io/common-server
# or
yarn add @paradoxical-io/common-server
```

## Usage

### Basic HTTP Client

Use the default Axios instance for simple HTTP requests:

```typescript
import { getDefaultAxios } from '@paradoxical-io/common-server';

async function fetchUser(userId: string) {
  const axios = getDefaultAxios();
  const response = await axios.get(`https://api.example.com/users/${userId}`);
  return response.data;
}
```

### Creating Custom Axios Instances

Create custom instances with different timeout configurations:

```typescript
import { createNewAxios, asMilli } from '@paradoxical-io/common-server';

// Create an instance with a 30-second timeout
const shortTimeoutClient = createNewAxios(asMilli(30, 'seconds'));

// Create an instance with default 5-minute timeout
const defaultClient = createNewAxios();

async function uploadLargeFile(file: Buffer) {
  const response = await defaultClient.post(
    'https://api.example.com/upload',
    file,
    {
      headers: { 'Content-Type': 'application/octet-stream' }
    }
  );
  return response.data;
}
```

### Error Handling

Use the built-in error utilities to handle specific HTTP error scenarios:

```typescript
import { getDefaultAxios, isAxiosError, AxiosErrors } from '@paradoxical-io/common-server';

async function getResource(resourceId: string) {
  const axios = getDefaultAxios();

  try {
    const response = await axios.get(`https://api.example.com/resource/${resourceId}`);
    return response.data;
  } catch (error) {
    if (AxiosErrors.notFound(error)) {
      console.log('Resource does not exist');
      return null;
    }

    if (AxiosErrors.conflict(error)) {
      console.log('Resource conflict detected');
      throw new Error('Duplicate resource');
    }

    if (isAxiosError(error)) {
      console.error('HTTP error:', error.response?.status, error.response?.data);
      throw error;
    }

    // Non-HTTP error
    throw error;
  }
}
```

### Logging Interceptor

Register logging interceptors to automatically log errors and emit metrics:

```typescript
import { createNewAxios, registerAxiosLoggingInterceptor } from '@paradoxical-io/common-server';

// Create a client for a specific service
const githubClient = createNewAxios();

// Register interceptor with a descriptive name (no spaces/punctuation)
registerAxiosLoggingInterceptor(githubClient, 'GitHub');

async function fetchRepositories(username: string) {
  try {
    const response = await githubClient.get(
      `https://api.github.com/users/${username}/repos`
    );
    return response.data;
  } catch (error) {
    // Error is automatically logged with:
    // - HTTP method, path, and status code
    // - Request/response payloads (truncated to 1000 chars)
    // - Metric emitted: github.error with status code tag
    throw error;
  }
}
```

### Proxy Configuration

The module automatically configures proxy settings for local development when environment variables are set:

```bash
# Set these environment variables for local proxy support
export PROXY_HOST=localhost
export PROXY_PORT=8888
```

```typescript
import { configureProxySettings } from '@paradoxical-io/common-server';

// Manually check proxy configuration
const proxyConfig = configureProxySettings();

if (proxyConfig) {
  console.log(`Proxy configured: ${proxyConfig.host}:${proxyConfig.port}`);
}
```

## API Reference

### Functions

#### `getDefaultAxios(): AxiosInstance`

Returns a lazily-initialized default Axios instance with a 5-minute timeout, proxy configuration, and HTTPS keep-alive enabled.

#### `createNewAxios(timeout?: number): AxiosInstance`

Creates a new Axios instance with custom timeout configuration.

- **timeout**: Optional timeout in milliseconds (default: 5 minutes)
- **Returns**: Configured AxiosInstance

#### `configureProxySettings(): AxiosProxyConfig | false`

Configures proxy settings based on environment variables (`PROXY_HOST` and `PROXY_PORT`). Only active in local development environments.

- **Returns**: Proxy configuration object or `false` if not configured

#### `isAxiosError(e: Error | unknown): e is AxiosError`

Type guard to check if an error is an Axios error with HTTP response information.

- **e**: Error object to check
- **Returns**: `true` if the error is an AxiosError

#### `registerAxiosLoggingInterceptor(axios: AxiosInstance, name: string): void`

Registers a response interceptor that logs errors and emits metrics.

- **axios**: The Axios instance to register the interceptor on
- **name**: Service name used for logging and metrics (no spaces/punctuation)
- **Behavior**: Logs HTTP method, path, status, request/response payloads; emits `${name}.error` metric

### Classes

#### `AxiosErrors`

Utility class for checking specific HTTP error status codes.

**Static Methods:**

- `conflict(e: Error | unknown): boolean` - Returns `true` if error is a 409 Conflict
- `notFound(e: Error | unknown): boolean` - Returns `true` if error is a 404 Not Found

## Dependencies

This module requires:

- `axios` - HTTP client library
- `@paradoxical-io/common` - Common utilities (`lazy`, `asMilli`, `truncate`, `SafeJson`)
- Environment detection via `../env`
- Logging via `../logger`
- Metrics via `../metrics`

## Environment Variables

- `PROXY_HOST`: Proxy server hostname (local development only)
- `PROXY_PORT`: Proxy server port (local development only)
- `JEST_TEST`: When set, disables interceptor registration for testing

## Notes

- The default Axios instance uses lazy initialization for optimal performance
- All instances include HTTPS keep-alive for connection pooling
- Logging interceptors automatically truncate large payloads to 1000 characters
- Metrics follow the pattern `${serviceName}.error` with status code tags
- Proxy configuration only activates in local development environments
