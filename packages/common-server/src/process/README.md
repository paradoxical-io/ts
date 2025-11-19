# Process Utilities

A comprehensive TypeScript toolkit for executing shell commands, managing child processes, Git operations, and handling process signals. This module provides type-safe wrappers around Node.js child process functionality with enhanced features like output redaction, signal handling, and Git-specific utilities.

## Features

- **Bash Execution**: Synchronous and asynchronous command execution with output capture
- **Process Spawning**: Advanced child process management with streaming output and signal forwarding
- **Git Operations**: Type-safe Git utilities for branches, commits, worktrees, and notes
- **Signal Handling**: Graceful shutdown management for SIGTERM and SIGINT
- **Input Prompting**: Simple stdin prompt utilities
- **Output Redaction**: Built-in support for hiding sensitive data in command logs

## Installation

This module is part of `@paradoxical-io/common-server`:

```bash
npm install @paradoxical-io/common-server
```

## Usage

### Bash Commands

Execute shell commands synchronously or asynchronously with various output options.

```typescript
import { run, get, getAsync, runStream } from '@paradoxical-io/common-server/process';

// Execute a command and get the exit code
const exitCode = run('npm install', { cwd: '/path/to/project' });

// Execute a command and capture output
const output = get('git rev-parse HEAD');
console.log(`Current SHA: ${output}`);

// Execute a command asynchronously
const result = await getAsync('ls -la', { cwd: '/tmp' });

// Execute with streaming output (pipes to stdout while capturing)
const { output, code } = await runStream({
  cmd: 'npm',
  args: ['test'],
  options: { cwd: '/path/to/project' }
});

// Redact sensitive information from logs
run('curl -H "Authorization: Bearer secret-token" api.example.com', {
  redactKeys: ['secret-token']
});
// Output: > curl -H "Authorization: Bearer *****" api.example.com
```

#### BashOptions

```typescript
interface BashOptions {
  silent?: boolean;              // Suppress console output
  env?: Record<string, string>;  // Environment variables
  cwd?: string;                  // Working directory
  shell?: string;                // Shell to use
  redactKeys?: string[];         // Values to redact from logs
}
```

### Process Spawning

Advanced process spawning with signal handling and output prefixing.

```typescript
import { spawnPromise, runShell } from '@paradoxical-io/common-server/process';

// Run a shell command with verbose output
await runShell('docker build -t myapp .', {
  verbose: true,
  cwd: '/path/to/dockerfile',
  acceptableErrorCodes: [0, 1]  // Treat exit codes 0 and 1 as success
});

// Spawn with custom options and output prefix
const { code, result } = await spawnPromise('npm', ['run', 'build'], {
  verbose: true,
  cwd: '/path/to/project',
  outputPrefix: '[BUILD]',
  shell: true
});
```

The spawn utilities automatically:
- Forward SIGTERM and SIGINT signals to child processes
- Kill the entire process tree on termination
- Capture output for non-verbose mode (shown only on failure)
- Pipe stdin to child process

### Git Operations

Type-safe Git utilities with branded types for branches and SHAs.

```typescript
import {
  gitRoot,
  gitBranch,
  gitSha,
  verifyGitSha,
  createWorkTreeSync,
  forcePushUsingGitWorktree,
  getGitNotes,
  setGitNote,
  changesExistSync
} from '@paradoxical-io/common-server/process';

// Get repository information
const root = await gitRoot();
const branch = await gitBranch();  // Type: Brand<string, 'Branch'>
const sha = await gitSha();        // Type: Brand<string, 'Sha'>

// Verify a SHA exists and get its short form
const validSha = await verifyGitSha('abc123');
if (validSha) {
  console.log(`Valid SHA: ${validSha}`);
}

// Work with Git notes (metadata attached to commits)
await setGitNote(sha, {
  services: ['api', 'worker'],
  banned: false
});

const notes = await getGitNotes(sha);
notes.forEach(note => {
  console.log(`${note.sha}: ${note.services.join(', ')}`);
});

// Create a worktree for parallel Git operations
const worktreePath = createWorkTreeSync('feature-branch', 'abc1234');
// Do work in worktree...
// Cleanup is automatic

// Force push using worktree (safer than direct force push)
forcePushUsingGitWorktree('deploy-branch', 'def5678', true);

// Check if changes exist compared to a branch
if (changesExistSync('main', file => file.endsWith('.ts'))) {
  console.log('TypeScript files have changed');
}
```

### Signal Handling

Register cleanup handlers for graceful shutdown.

```typescript
import { signals } from '@paradoxical-io/common-server/process';

// Enable signal handling (call once at startup)
signals.enable();

// Register cleanup handlers (LIFO order - last registered runs first)
signals.onShutdown(async () => {
  await database.disconnect();
  console.log('Database disconnected');
});

signals.onShutdown(async () => {
  await server.close();
  console.log('Server closed');
});

// On SIGTERM or SIGINT, handlers run in reverse order:
// 1. Server closes
// 2. Database disconnects
```

### Stdin Prompting

Simple utilities for interactive command-line input.

```typescript
import { prompt } from '@paradoxical-io/common-server/process';

const name = await prompt('What is your name? ');
console.log(`Hello, ${name}!`);

const confirm = await prompt('Continue? (y/n) ');
if (confirm.toLowerCase() === 'y') {
  // Proceed...
}
```

## API Reference

### Bash Module

- `run(cmd: string, options?: BashOptions): number` - Execute command synchronously, return exit code
- `get(cmd: string, options?: BashOptions): string` - Execute command synchronously, return output
- `getAsync(cmd: string, options?: BashOptions): Promise<string>` - Execute command asynchronously, return stdout
- `getAsyncStderr(cmd: string, options?: BashOptions): Promise<string>` - Execute command asynchronously, return stderr
- `runStream(params): Promise<{output: string, code: number}>` - Execute with streaming output
- `isExecError(e: Error): boolean` - Type guard for execution errors

### Spawn Module

- `runShell(cmd: string, options: Options): Promise<number>` - Run shell command with automatic argument parsing
- `spawnPromise(cmd: string, args: string[], options: Options): Promise<{code: number, result: string}>` - Spawn process with advanced options

### Git Module

- `gitRoot(): Promise<string>` - Get repository root path
- `gitRootSync(): string` - Get repository root path synchronously
- `gitBranch(): Promise<Branch>` - Get current branch name
- `gitSha(): Promise<Sha>` - Get current commit SHA (8 characters)
- `verifyGitSha(sha: string): Promise<Sha | undefined>` - Validate and normalize SHA
- `verifyGitBranch(branch: string): Promise<Branch | undefined>` - Validate branch exists
- `gitFetch(): Promise<void>` - Fetch commits and notes from remote
- `getGitNotes(startSha: Sha, endSha?: Sha): Promise<GitNotes[]>` - Retrieve Git notes for commit range
- `setGitNote(sha: Sha, note: Omit<GitNotes, 'sha'>): Promise<void>` - Add or update Git note
- `createWorkTreeSync(branch: string, sha: string, verbose?: boolean): string` - Create Git worktree
- `clearWorkTreeSync(path: string, verbose?: boolean): void` - Remove Git worktree
- `forcePushUsingGitWorktree(branch: string, sha: string, verbose?: boolean): void` - Force push using temporary worktree
- `changesExistSync(targetBranch?: string, filter?: (file: string) => boolean): boolean` - Check for changes

### Signals Module

- `signals.enable(): void` - Enable signal handling for SIGTERM and SIGINT
- `signals.onShutdown(handler: () => Promise<void>): void` - Register shutdown handler

### Stdin Module

- `prompt(prompt: string): Promise<string>` - Prompt user for input and return response

## Dependencies

This module requires:
- `tree-kill` - For killing process trees
- `@paradoxical-io/common` - For SafeJson utilities
- `@paradoxical-io/types` - For Brand types

## Notes

- All Git functions use short SHAs (8 characters) by default
- Signal handlers execute in LIFO order (last registered, first executed)
- Spawn utilities automatically handle signal forwarding to child processes
- The bash module includes automatic output redaction for security-sensitive commands
- Git worktrees are automatically cleaned up to prevent stale references
