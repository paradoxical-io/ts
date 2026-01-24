/**
 * Jest has decent support for fake timers if the test actually wants to verify that the wait happens,
 * and can manually control the individual time moving aspects.
 *
 * Where it becomes more limited is when testing functions that have built in waits (retryDecorator loops, waiting for something to finish, etc). Wrapping the test
 * logic with this function will cause all timers to automatically and immediately resolve.
 *
 * @note See App P2P.test.ts for example usages (the p2p control functions internally use waitForTransactionToSettle which has built in waits and retries)
 * @note This must be used in tandem with jest.useFakeTimers()
 * @param callback
 */
export const autoAdvanceTimers =
  <Result>(callback: () => Promise<Result>) =>
  async () => {
    let resolved = false;
    const p = callback().then(() => {
      resolved = true;
    });
    while (!resolved) {
      await new Promise(setImmediate);
      if (jest.getTimerCount() === 0) {
        break;
      }
      jest.advanceTimersToNextTimer();
    }
    await p;
  };

/**
 * Allows for retrying jest tests
 * @param times
 */
export function retry(times: number) {
  return (runner: () => Promise<void>) => async () => {
    for (let i = 0; i < times; i++) {
      try {
        await runner();
      } catch (e) {
        if (i === times - 1) {
          throw e;
        }
      }
    }
  };
}
