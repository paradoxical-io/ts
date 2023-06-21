/* eslint-disable no-console */

import * as child_process from 'child_process';
import { exec } from 'child_process';
import { WriteStream } from 'tty';
import * as util from 'util';

export interface BashOptions {
  silent?: boolean;
  env?: { [key: string]: string | undefined };
  cwd?: string;
  shell?: string;
  redactKeys?: string[];
}

interface ExecError extends Error {
  status: number;
}

export function isExecError(e: Error | unknown): e is ExecError {
  return (e as ExecError).status !== undefined;
}

export function run(cmd: string, options?: BashOptions): number {
  return runInternal(cmd, false, options).code;
}

export function get(cmd: string, options?: BashOptions): string {
  return runInternal(cmd, true, options).output;
}

export async function getAsync(cmd: string, options?: Pick<BashOptions, 'cwd' | 'env' | 'shell'>): Promise<string> {
  const result = await util.promisify(exec)(cmd, {
    cwd: options?.cwd,
    env: options?.env,
    shell: options?.shell,
  });

  return result.stdout.trim();
}

export async function getAsyncStderr(
  cmd: string,
  options?: Pick<BashOptions, 'cwd' | 'env' | 'shell'>
): Promise<string> {
  const result = await util.promisify(exec)(cmd, {
    cwd: options?.cwd,
    env: options?.env,
    shell: options?.shell,
  });

  return result.stderr.trim();
}

/**
 * Given the set of arguments redacts arguments that match the redaction set
 * @param args
 * @param redact
 */
function asRedacted(args: string[], redact: string[]) {
  return args.map(a => {
    if (redact?.includes(a)) {
      return '*****';
    }
    return a;
  });
}

/**
 * Runs the command and optionally pipes the results to stdout while also capturing the result
 * @param cmd
 * @param args
 * @param returnOutput
 * @param pipeTo
 * @param options
 * @param redact Keys to redact when spitting out the invoked arguments
 */
export async function runStream({
  cmd,
  args,
  pipeTo = process.stdout,
  options,
}: {
  cmd: string;
  args: string[];
  pipeTo?: WriteStream;
  options?: BashOptions;
}): Promise<{ output: string; code: number }> {
  return new Promise((resolve, reject) => {
    const defaults: BashOptions = {
      silent: false,
      env: process.env,
    };

    const opts = { ...defaults, ...options };

    if (!opts.silent) {
      console.log(`> ${cmd} ${asRedacted(args, opts.redactKeys ?? []).join(' ')}`);
    }

    try {
      const result = child_process.spawn(cmd, args, { stdio: 'pipe', env: opts.env, cwd: opts.cwd });

      let output = '';
      result.stdout.on('data', d => {
        output += d.toString();
      });

      if (pipeTo) {
        result.stdout.pipe(pipeTo);
        result.stderr.pipe(pipeTo);
      }

      result.on('close', () => {
        resolve({
          output,
          code: 0,
        });
      });

      result.on('disconnect', () => {
        resolve({
          output,
          code: -1,
        });
      });

      result.on('exit', code => {
        resolve({
          output,
          code: code ?? -1,
        });
      });

      result.on('error', e => {
        reject(e);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Runs the command and captures the output. If output is requested will NOT proxy it to stdout
 *
 * To proxy output to pipe and collect it as a result use {@link runStream}
 * @param cmd
 * @param returnOutput
 * @param options
 */
export function runInternal(
  cmd: string,
  returnOutput: boolean,
  options?: BashOptions
): { output: string; code: number } {
  const defaults: BashOptions = {
    silent: false,
    env: process.env,
  };

  const opts = { ...defaults, ...options };

  if (!opts.silent) {
    let printableCmd = cmd;

    opts.redactKeys?.forEach(redaction => {
      printableCmd = printableCmd.replace(redaction, '*****');
    });

    console.log('>', printableCmd);
  }

  const stdio = returnOutput || opts.silent ? 'pipe' : 'inherit';

  try {
    const result = child_process.execSync(cmd, {
      encoding: 'utf-8',
      env: opts.env,
      stdio,
      cwd: opts.cwd,
    });

    return {
      output: result,
      code: 0,
    };
  } catch (err) {
    if (isExecError(err)) {
      const { status } = err;

      return { output: '', code: status };
    }

    return { output: '', code: -1 };
  }
}
