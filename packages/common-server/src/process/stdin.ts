const readline = require('readline');

/**
 * Prompts for a stdin line and returns the result
 * @param prompt
 */
export async function prompt(prompt: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(prompt, (line: string) => {
      rl.close();
      resolve(line);
    });
  });
}
