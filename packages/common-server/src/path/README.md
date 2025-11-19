# Path Utilities

A collection of utilities for working with file system paths in Node.js applications. This module provides functions for resolving absolute paths, working with git repositories, and querying directory contents.

## Features

- Convert relative and user-home paths to absolute paths
- Resolve paths relative to git repository root
- List directories and files separately
- Check for path existence asynchronously

## Installation

This module is part of `@paradoxical-io/common-server`. Install it via:

```bash
npm install @paradoxical-io/common-server
# or
yarn add @paradoxical-io/common-server
```

## Usage

### Resolving Absolute Paths

The `getAbsPath` function converts relative or user-home paths to absolute paths based on the current working directory.

```typescript
import { getAbsPath } from '@paradoxical-io/common-server/path';

// Resolve user home directory paths
const homePath = getAbsPath('~/projects/myapp');
// Returns: /Users/username/projects/myapp

// Resolve relative paths
const relativePath = getAbsPath('./config/settings.json');
// Returns: /current/working/directory/config/settings.json

// Absolute paths are returned as-is
const absolutePath = getAbsPath('/etc/config');
// Returns: /etc/config
```

### Working with Git Repositories

The `getAbsPathWithRepoBase` function resolves paths relative to the git repository root, useful for monorepos or when working with git-based tooling.

```typescript
import { getAbsPathWithRepoBase } from '@paradoxical-io/common-server/path';

// Get path relative to git root
const configPath = getAbsPathWithRepoBase('config/app.json');
// Returns: /path/to/git/repo/root/config/app.json

// Useful for monorepo package references
const packagePath = getAbsPathWithRepoBase('packages/common');
// Returns: /path/to/git/repo/root/packages/common
```

### Listing Directory Contents

Separate functions for listing only directories or only files make it easy to filter directory contents.

```typescript
import { getDirectories, getFiles } from '@paradoxical-io/common-server/path';

// Get only subdirectories
const directories = await getDirectories('/path/to/folder');
// Returns: ['subdir1', 'subdir2', 'subdir3']

// Get only files
const files = await getFiles('/path/to/folder');
// Returns: ['file1.txt', 'file2.json', 'readme.md']

// Example: Process all JSON files in a directory
const jsonFiles = (await getFiles('./data'))
  .filter(file => file.endsWith('.json'));
```

### Checking Path Existence

The `existsPath` function provides a Promise-based way to check if a file or directory exists.

```typescript
import { existsPath } from '@paradoxical-io/common-server/path';

// Check if a file exists
const configExists = await existsPath('./config/settings.json');
if (configExists) {
  console.log('Config file found');
}

// Check if a directory exists
const dataExists = await existsPath('./data');
if (!dataExists) {
  console.log('Data directory not found');
}

// Gracefully handle non-existent paths (returns false instead of throwing)
const result = await existsPath('/nonexistent/path');
// Returns: false
```

## API Reference

### `getAbsPath(absOrRelativePath: string): string`

Converts a relative or user-home path to an absolute path.

- **Parameters:**
  - `absOrRelativePath`: A relative path, absolute path, or path starting with `~`
- **Returns:** An absolute file system path
- **Note:** Handles `~` expansion for user home directory (Node.js doesn't do this by default)

### `getAbsPathWithRepoBase(pathRelativeToBase: string): string`

Resolves a path relative to the git repository root.

- **Parameters:**
  - `pathRelativeToBase`: A path relative to the git repository root
- **Returns:** An absolute path from the repository root
- **Note:** Requires the code to be run within a git repository

### `getDirectories(source: string): Promise<string[]>`

Returns only the subdirectories within a given directory.

- **Parameters:**
  - `source`: The directory path to scan
- **Returns:** Array of directory names (not full paths, just names)

### `getFiles(source: string): Promise<string[]>`

Returns only the files within a given directory.

- **Parameters:**
  - `source`: The directory path to scan
- **Returns:** Array of file names (not full paths, just names)

### `existsPath(location: string): Promise<boolean>`

Checks if a file or directory exists at the given path.

- **Parameters:**
  - `location`: The file or directory path to check
- **Returns:** `true` if the path exists, `false` otherwise
- **Note:** Does not throw on non-existent paths (returns `false` instead)

## Common Use Cases

### Processing Files in a Directory

```typescript
import { getFiles, getAbsPath } from '@paradoxical-io/common-server/path';
import path from 'path';

async function processDataFiles(dirPath: string) {
  const absPath = getAbsPath(dirPath);
  const files = await getFiles(absPath);

  for (const file of files) {
    const fullPath = path.join(absPath, file);
    // Process each file...
  }
}
```

### Finding Package Directories in a Monorepo

```typescript
import { getDirectories, getAbsPathWithRepoBase } from '@paradoxical-io/common-server/path';

async function listPackages() {
  const packagesDir = getAbsPathWithRepoBase('packages');
  const packages = await getDirectories(packagesDir);
  return packages;
}
```

### Safe File Operations

```typescript
import { existsPath, getAbsPath } from '@paradoxical-io/common-server/path';
import fs from 'fs/promises';

async function safeReadConfig(configPath: string) {
  const absPath = getAbsPath(configPath);

  if (await existsPath(absPath)) {
    return await fs.readFile(absPath, 'utf-8');
  }

  return null; // Config doesn't exist
}
```

## Notes

- All path resolution functions handle both Windows and Unix-style paths
- The `~` character is automatically expanded to the user's home directory
- Directory and file listing functions return names only, not full paths
- The `existsPath` function is safe and won't throw errors for non-existent paths
