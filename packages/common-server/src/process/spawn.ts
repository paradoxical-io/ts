/* eslint-disable no-console */

import { spawn } from 'child_process';
import readline from 'readline';
import treeKill from 'tree-kill';

export interface Options {
  verbose: boolean;
  cwd: string;
  shell?: boolean;
  acceptableErrorCodes?: number[];

  // if set prefixes all output with this
  outputPrefix?: string;
}

/**
 * Runs in a shell async
 * @param cmd
 * @param opt
 */
export async function runShell(cmd: string, opt: Options): Promise<number> {
  const [head, ...rest] = cmd.split(' ');

  const { code } = await spawnPromise(head, rest, opt);

  return code;
}

/**
 * Runs spawn to spawn a subshell for the command and arguments.  If
 * options verbose is set to true will send stdio/stderr to the console by default
 * otherwise will be silent and only show stdio/stderr IF the command fails
 *
 * @param cmd
 * @param args
 * @param opts
 */
export async function spawnPromise(
  cmd: string,
  args: string[],
  opts: Options
): Promise<{ code: number; result: string }> {
  return new Promise<{ code: number; result: string }>((result, reject) => {
    const s = spawn(cmd, args, {
      cwd: opts.cwd,
      shell: opts.shell === undefined ? true : opts.shell,
      // if we want an output prefix and its verbose, we have to pipe to capture
      // the output. otherwise if we just want regular verbose we can inherit the handles
      // and proxy all data.  otherwise, default
      stdio: ['pipe'],
      env: process.env,
    });

    if (s.pid === undefined) {
      throw new Error('Failed to spawn');
    }

    const sigTerm = () => {
      treeKill(s.pid!, 'SIGTERM');
    };
    const sigInt = () => {
      treeKill(s.pid!, 'SIGTERM');
    };

    process.on('SIGINT', sigInt);
    process.on('SIGTERM', sigTerm);

    // capture outputs in case commands fail
    const results: string[] = [];

    process.stdin.pipe(s.stdin);
    const stdoutLines = readline.createInterface(s.stdout);
    const stderrLines = readline.createInterface(s.stderr);

    if (opts.verbose && !opts.outputPrefix) {
      s.stdout.pipe(process.stdout);
      s.stderr.pipe(process.stderr);
    }

    stdoutLines.on('line', line => {
      if (opts.verbose && opts.outputPrefix) {
        process.stdout.write(`${opts.outputPrefix}: ${line}\n`);
      }

      results.push(line.toString());
    });

    stderrLines.on('line', line => {
      if (opts.verbose && opts.outputPrefix) {
        process.stderr.write(`${opts.outputPrefix}: ${line}\n`);
      }

      results.push(line.toString());
    });

    const close = () => {
      stderrLines.close();
      stdoutLines.close();

      process.removeListener('SIGINT', sigInt);
      process.removeListener('SIGTERM', sigTerm);
    };

    s.on('close', code => {
      close();

      const isOkCode = opts.acceptableErrorCodes
        ? code !== null && opts.acceptableErrorCodes.indexOf(code) >= 0
        : code === 0;

      if (!isOkCode) {
        // log captured output if we weren't in verbose mode beacuse something failed
        if (!opts.verbose) {
          console.log(results.join('\n'));
        }
        reject(code);
      } else {
        result({ code: code ?? -1, result: results.join('\n') });
      }
    });
    s.on('error', () => {
      close();

      reject();
    });
  });
}
