import { log } from '../logger';

class Signals {
  private shutdownThunks: Array<() => Promise<void>> = [];

  /**
   * Enables shutdown handling for the process. If this is not called
   * the process will not handle SIGTERM or SIGINT signals.
   */
  public enable() {
    process.once('SIGTERM', async () => {
      log.warn('Termination requested');

      for (const thunk of this.shutdownThunks.reverse()) {
        await thunk();
      }
    });

    process.once('SIGINT', async () => {
      log.warn('SIGINT (cntrl+c) captured');

      // treat the thunks as a stack, so more recent things will get run first
      // and earlier things run last. this lets us unwind the registration in the order we registered
      // this is important because things like metrics we want to do _last_ so we register them _first_
      for (const thunk of this.shutdownThunks.reverse()) {
        await thunk();
      }
    });
  }

  /**
   * Registers a function to be called on shutdown (SIGTERM or SIGINT)
   * @param value
   */
  onShutdown(value: () => Promise<void>) {
    this.shutdownThunks.push(value);
  }
}

export const signals = new Signals();
