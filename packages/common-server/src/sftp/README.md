# SFTP Module

A lightweight TypeScript wrapper around the `ssh2-sftp-client` library that provides a simplified, promise-based API for SFTP file operations. This module makes it easy to connect to SFTP servers and perform common operations like uploading, downloading, and listing files using Node.js streams.

## Features

- Simple connection management with username/password authentication
- Stream-based file uploads and downloads for memory-efficient handling of large files
- Directory listing functionality
- Promise-based API for easy async/await usage
- Type-safe TypeScript interfaces
- Support for live streaming uploads (write while uploading)

## Installation

This module is part of `@paradoxical-io/common-server`. Ensure you have the required dependency:

```bash
npm install ssh2-sftp-client
# or
yarn add ssh2-sftp-client
```

## Usage

### Basic Connection and File Upload

```typescript
import { Sftp } from '@paradoxical-io/common-server/sftp';
import { Readable } from 'stream';

// Create an SFTP instance
const sftp = new Sftp({
  host: 'sftp.example.com',
  port: 22 // Optional, defaults to 22
});

// Connect with credentials
const connection = await sftp.connect('username', 'password');

// Upload a file from a buffer
const fileData = Buffer.from('Hello, World!');
await connection.write('/remote/path/file.txt', Readable.from(fileData));
```

### List Files in a Directory

```typescript
const sftp = new Sftp({ host: 'sftp.example.com' });
const connection = await sftp.connect('username', 'password');

// List all files in a directory
const files = await connection.listFiles('/remote/directory');
console.log(files); // ['file1.txt', 'file2.csv', 'file3.json']
```

### Download a File

```typescript
import { Streams } from '@paradoxical-io/common-server';

const sftp = new Sftp({ host: 'sftp.example.com' });
const connection = await sftp.connect('username', 'password');

// Get file as a readable stream
const stream = await connection.getFile('/remote/path/file.txt');

// Convert stream to buffer
const buffer = await Streams.toBuffer(stream);
console.log(buffer.toString());
```

### Live Streaming Upload

Upload data while it's being generated, perfect for large datasets or CSV exports:

```typescript
import { CsvStreamWriter } from '@paradoxical-io/common-server';

const sftp = new Sftp({ host: 'sftp.example.com' });
const connection = await sftp.connect('username', 'password');

// Create a CSV stream writer
const csvWriter = new CsvStreamWriter<{ id: number; name: string }>();

// Start upload (non-blocking)
const uploadPromise = connection.write('/remote/path/data.csv', csvWriter.output());

// Write data as it becomes available
csvWriter.push({ id: 1, name: 'Alice' });
csvWriter.push({ id: 2, name: 'Bob' });
csvWriter.push({ id: 3, name: 'Charlie' });

// Close the stream and wait for upload to complete
csvWriter.close();
await uploadPromise;
```

### Complete Example with Error Handling

```typescript
import { Sftp } from '@paradoxical-io/common-server/sftp';
import { Readable } from 'stream';

async function uploadReport(data: Buffer) {
  const sftp = new Sftp({
    host: process.env.SFTP_HOST || 'sftp.example.com',
    port: 22
  });

  try {
    const connection = await sftp.connect(
      process.env.SFTP_USER || 'username',
      process.env.SFTP_PASS || 'password'
    );

    // Upload the file
    await connection.write('/reports/daily-report.csv', Readable.from(data));

    // Verify upload
    const files = await connection.listFiles('/reports');
    console.log(`Upload successful. Files in /reports:`, files);

    return true;
  } catch (error) {
    console.error('SFTP operation failed:', error);
    throw error;
  }
}
```

## API Reference

### `Sftp`

Main class for creating SFTP connections.

#### Constructor

```typescript
new Sftp(options: { host: string; port?: number })
```

- `host`: SFTP server hostname or IP address
- `port`: SFTP server port (optional, defaults to 22)

#### Methods

##### `connect(username: string, password: string): Promise<ConnectedSftp>`

Establishes a connection to the SFTP server with username/password authentication.

Returns a `ConnectedSftp` instance for performing file operations.

### `ConnectedSftp`

Represents an active SFTP connection. All methods return Promises.

#### Methods

##### `write(path: string, data: stream.Readable): Promise<void>`

Uploads a file to the SFTP server.

- `path`: Remote file path where data will be written
- `data`: Readable stream containing the file data

##### `listFiles(path: string): Promise<string[]>`

Lists all files in a remote directory.

- `path`: Remote directory path
- Returns: Array of file names (not full paths)

##### `getFile(path: string): Promise<stream.Readable>`

Downloads a file from the SFTP server as a stream.

- `path`: Remote file path
- Returns: Readable stream of the file contents

## Testing

The module includes Docker-based integration tests using the `atmoz/sftp` Docker image:

```typescript
import { newSftpDocker } from '@paradoxical-io/common-server/sftp/docker';

// Create a test SFTP server
const { container, host, port } = await newSftpDocker('testuser', 'testpass', 'upload');

try {
  const sftp = new Sftp({ host, port });
  const connection = await sftp.connect('testuser', 'testpass');

  // Run your tests...
} finally {
  await container.close();
}
```

## Dependencies

- `ssh2-sftp-client`: Core SFTP client library
- Node.js `stream` module: For stream-based operations

## Notes

- All file operations use Node.js streams for memory efficiency
- The module uses password-based authentication; key-based auth is not currently supported
- Connection instances are stateful; create a new connection for each session
- Remember to handle connection errors appropriately in production code
