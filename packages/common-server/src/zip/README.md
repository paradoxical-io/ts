# Zip Module

A lightweight TypeScript utility module for creating and extracting zip archives using Node.js streams. This module provides a simple, promise-based API for working with zip files, supporting both file system paths and readable streams.

## Features

- Create zip archives from multiple files or streams
- Extract zip archives to a target directory
- Stream-based processing for memory efficiency
- Configurable compression levels (0-9)
- Promise-based API for async/await usage
- Support for both file paths and readable streams

## Dependencies

This module requires the following peer dependencies:

- `archiver` - For creating zip archives
- `unzipper` - For extracting zip archives

## API

### `createZip(entries, output, zlibOptions?)`

Creates a zip archive from multiple entries and writes it to an output stream.

**Parameters:**
- `entries: ZipEntry[]` - Array of entries to include in the zip
- `output: stream.Writable` - Writable stream where the zip will be written
- `zlibOptions?: ZlibOptions` - Optional compression options (default: `{ level: 6 }`)

**Returns:** `Promise<void>` - Resolves when the zip creation is complete

**Compression Levels:**
- `0` - No compression (fastest)
- `1-8` - Increasing compression levels
- `9` - Maximum compression (slowest)

### `unzip(file, target)`

Extracts a zip archive to a target directory.

**Parameters:**
- `file: string | stream.Readable` - Path to zip file or readable stream
- `target: string` - Target directory path for extraction

**Returns:** `Promise<void>` - Resolves when extraction is complete

### `ZipEntry`

Interface for defining entries to be added to a zip archive.

**Properties:**
- `path: string` - Path within the zip archive
- `data: stream.Readable` - Readable stream of the file content

## Usage Examples

### Creating a Zip Archive

```typescript
import { createZip } from './zip';
import * as fs from 'fs';

// Create a zip from multiple files
async function createBackupZip() {
  const zipStream = fs.createWriteStream('backup.zip');

  await createZip(
    [
      {
        path: 'documents/report.pdf',
        data: fs.createReadStream('./reports/quarterly.pdf')
      },
      {
        path: 'documents/summary.txt',
        data: fs.createReadStream('./summaries/q4.txt')
      },
      {
        path: 'data/export.csv',
        data: fs.createReadStream('./exports/data.csv')
      }
    ],
    zipStream
  );

  console.log('Backup created successfully!');
}
```

### Creating a Zip with Custom Compression

```typescript
import { createZip } from './zip';
import * as fs from 'fs';

// Use maximum compression for archival
async function createCompressedArchive() {
  const zipStream = fs.createWriteStream('archive.zip');

  await createZip(
    [
      {
        path: 'large-file.txt',
        data: fs.createReadStream('./data/large-file.txt')
      }
    ],
    zipStream,
    { level: 9 } // Maximum compression
  );
}

// Use no compression for speed
async function createFastZip() {
  const zipStream = fs.createWriteStream('fast.zip');

  await createZip(
    [
      {
        path: 'quick-file.txt',
        data: fs.createReadStream('./data/quick-file.txt')
      }
    ],
    zipStream,
    { level: 0 } // No compression
  );
}
```

### Creating a Zip from In-Memory Data

```typescript
import { createZip } from './zip';
import { Readable } from 'stream';
import * as fs from 'fs';

async function createZipFromMemory() {
  const zipStream = fs.createWriteStream('output.zip');

  // Create a readable stream from a string
  const textData = Readable.from(['Hello, World!', 'This is a test.']);
  const jsonData = Readable.from([JSON.stringify({ key: 'value' })]);

  await createZip(
    [
      {
        path: 'greeting.txt',
        data: textData
      },
      {
        path: 'config.json',
        data: jsonData
      }
    ],
    zipStream
  );
}
```

### Extracting a Zip Archive

```typescript
import { unzip } from './zip';

// Extract from a file path
async function extractZipFile() {
  await unzip('./archives/backup.zip', './extracted/backup');
  console.log('Files extracted successfully!');
}

// Extract from a stream
async function extractFromStream() {
  const zipStream = getZipStreamFromSomewhere(); // e.g., HTTP response
  await unzip(zipStream, './extracted/from-stream');
  console.log('Stream extracted successfully!');
}
```

### Complete Example: Backup and Restore

```typescript
import { createZip, unzip } from './zip';
import * as fs from 'fs';
import * as path from 'path';

// Backup multiple files into a single zip
async function backup(files: string[], zipPath: string) {
  const entries = files.map(filePath => ({
    path: path.basename(filePath),
    data: fs.createReadStream(filePath)
  }));

  const zipStream = fs.createWriteStream(zipPath);
  await createZip(entries, zipStream);
}

// Restore files from a zip
async function restore(zipPath: string, targetDir: string) {
  await unzip(zipPath, targetDir);
}

// Usage
async function main() {
  const filesToBackup = [
    '/path/to/file1.txt',
    '/path/to/file2.json',
    '/path/to/file3.csv'
  ];

  // Create backup
  await backup(filesToBackup, './backup.zip');

  // Restore to a different location
  await restore('./backup.zip', './restored');
}
```

### Error Handling

```typescript
import { createZip, unzip } from './zip';
import * as fs from 'fs';

async function safeZipOperation() {
  try {
    const zipStream = fs.createWriteStream('output.zip');

    await createZip(
      [
        {
          path: 'data.txt',
          data: fs.createReadStream('./input/data.txt')
        }
      ],
      zipStream
    );

    console.log('Zip created successfully');
  } catch (error) {
    console.error('Failed to create zip:', error);
  }
}

async function safeUnzipOperation() {
  try {
    await unzip('./archive.zip', './output');
    console.log('Unzip completed successfully');
  } catch (error) {
    console.error('Failed to extract zip:', error);
  }
}
```

## Implementation Notes

- The `createZip` function uses the `archiver` library and listens for both 'close' and 'finish' events to ensure proper completion
- All operations are stream-based, making them memory-efficient for large files
- The default compression level (6) provides a good balance between speed and compression ratio
- Both functions return promises, making them compatible with async/await syntax
- When unzipping, the target directory will be created if it doesn't exist

## Performance Considerations

- **Compression Level**: Higher compression levels (7-9) significantly increase processing time with diminishing returns on file size reduction
- **Stream Processing**: Using streams allows processing large files without loading them entirely into memory
- **Parallel Operations**: Multiple zip operations can run concurrently as they are promise-based
- **Default Level**: The default compression level of 6 is recommended for most use cases

## Common Use Cases

1. **Data Export**: Package multiple CSV or JSON files for download
2. **Backup Systems**: Create compressed archives of important files
3. **File Transmission**: Reduce bandwidth when transferring multiple files
4. **Archive Management**: Extract and process uploaded zip files
5. **Batch Processing**: Compress multiple generated reports or logs
