import { SafeJson } from '@paradoxical-io/common';
import { Brand, Sha } from '@paradoxical-io/types';
import * as child_process from 'child_process';
import { exec } from 'child_process';
import * as os from 'os';
import * as util from 'util';

import { BashOptions, get, run, runInternal } from './bash';

export type Branch = Brand<string, 'Branch'>;

/**
 * Detects the current root of the project based on the location of the top level git folder
 * allows us to write relative path commands based on the top level
 */
export async function gitRoot(): Promise<string> {
  const result = await util.promisify(exec)('git rev-parse --show-toplevel');

  return result.stdout.trim();
}

/**
 * Returns the top level git root sync
 */
export function gitRootSync(): string {
  const result = child_process.execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' });

  return result.trim();
}

/**
 * Fetches git commits and notes
 */
export async function gitFetch(): Promise<void> {
  // make sure we pull the latest shas and any tagged notes
  await Promise.all([
    run(`git fetch`, { silent: true }),
    run(`git fetch origin refs/notes/commits:refs/notes/origin/commits && git notes merge -v origin/commits`, {
      silent: true,
    }),
  ]);
}

export interface GitNotes {
  sha: Sha;
  services: string[];
  banned?: boolean;
}

/**
 * Overwrites or sets the git note at the commit
 * @param sha
 * @param note
 */
export async function setGitNote(sha: Sha, note: Omit<GitNotes, 'sha'>): Promise<void> {
  await util.promisify(exec)(`git notes add -f -m '${SafeJson.stringify(note)}' ${sha}`);
  await util.promisify(exec)(`git push origin refs/notes/*`);
}

/**
 * Get the git notes for the range of commits. If no end commit is specified only the first commit will return
 * @param startSha
 * @param endSha
 */
export async function getGitNotes(startSha: Sha, endSha?: Sha): Promise<GitNotes[]> {
  const notes = (await util.promisify(exec)(`git log ${startSha}^..${endSha ?? startSha} --format="%H;%N"`)).stdout;

  return notes
    .split('\n')
    .filter(i => i.includes('{'))
    .map(line => {
      const [sha, note] = line.split(';');

      const parsed = JSON.parse(note) as { services: string[]; banned?: boolean };

      const formatted: GitNotes = {
        sha: sha as Sha,
        ...parsed,
      };

      return formatted;
    });
}

/**
 * Adds a worktree of the target branch and hard resets to the sha. Returns the worktree path
 * @param branch
 * @param sha
 * @param verbose
 */
export function createWorkTreeSync(branch: string, sha: string, verbose = false): string {
  const options: BashOptions = {
    silent: !verbose,
  };

  const gitRoot = gitRootSync();

  const worktreePath = `${gitRoot}/temp/paradox-${branch}`;

  clearWorkTreeSync(worktreePath);

  // create a temporary worktree
  if (run(`git worktree add -f ${worktreePath} ${branch}`, { ...options }) !== 0) {
    throw new Error('Creating worktree failed');
  }

  // force the worktree branch to be the sha
  if (run(`git reset --hard ${sha}`, { cwd: worktreePath, ...options }) !== 0) {
    throw new Error('Git reset failed');
  }

  const targetWorkTreeSha = get(`git rev-parse HEAD`, { cwd: worktreePath, ...options });

  if (!targetWorkTreeSha.startsWith(sha)) {
    throw new Error(
      `Worktree at path ${worktreePath} is at the wrong sha. Expected ${sha} but got ${targetWorkTreeSha}`
    );
  }

  return worktreePath;
}

/**
 * Force push to the target branch the sha
 * @param branch
 * @param sha
 * @param verbose
 */
export function forcePushUsingGitWorktree(branch: string, sha: string, verbose = false): void {
  const worktreePath = createWorkTreeSync(branch, sha, verbose);

  const options: BashOptions = {
    silent: !verbose,
  };

  // push the local worktree branch to the remote branch overwriting
  // the remote origins branch
  if (run(`git push --force origin ${branch}:${branch}`, { ...options, cwd: worktreePath }) !== 0) {
    throw new Error('Git push force failed"');
  }

  clearWorkTreeSync(worktreePath, verbose);
}
/**
 * Compares the current branch to the targret and applies the filter to changed files. If anything returns true
 * determines that changes exist. Filter is exposed to allow for customized "dirty" marking
 * @param targetBranch
 * @param filter
 */
export function changesExistSync(targetBranch = 'master', filter: (s: string) => boolean = () => true): boolean {
  const options: BashOptions = {
    silent: true,
  };

  const filesChanged = get(`git diff --name-only ${targetBranch}`, options).split(os.EOL);

  return filesChanged.find(filter) !== undefined;
}

/**
 * Deletes the worktree path
 * @param path
 * @param verbose
 */
export function clearWorkTreeSync(path: string, verbose = false): void {
  const options: BashOptions = {
    silent: !verbose,
  };

  run(`git worktree remove -f ${path}`, { ...options });

  // cleanup
  run(`rm -rf ${path}`, { ...options });
}

/**
 * Returns the current git sha
 */
export async function gitSha(): Promise<Sha> {
  const result = await util.promisify(exec)('git rev-parse --short=8 HEAD');

  return result.stdout.trim() as Sha;
}

/**
 * Returns the current git branch
 */
export async function gitBranch(): Promise<Branch> {
  const result = await util.promisify(exec)('git symbolic-ref --short HEAD');

  return result.stdout.trim() as Branch;
}

/**
 * Returns a short form of the sha if its valid, otherwise undefined
 * @param sha
 */
export async function verifyGitSha(sha: string): Promise<Sha | undefined> {
  // make sure we pull the latest shas and stuff first
  run(`git fetch`, { silent: true });

  const result = runInternal(`git rev-parse --short=8 ${sha}`, true, { silent: true });

  if (result.code === 0) {
    return result.output.trim() as Sha;
  }

  return undefined;
}

export async function verifyGitBranch(branch: string): Promise<Branch | undefined> {
  // make sure we pull the latest shas and stuff first
  run(`git fetch`, { silent: true });

  const result = runInternal(`git show-ref --quiet refs/heads/$branch`, true, { silent: true });

  if (result.code === 0) {
    return branch as Branch;
  }

  return undefined;
}
