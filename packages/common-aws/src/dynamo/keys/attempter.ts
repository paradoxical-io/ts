import { defaultTimeProvider } from '@paradoxical-io/common';
import { CompoundKey, EpochMS, Milliseconds } from '@paradoxical-io/types';

import { PartitionedKeyValueTable } from './partitionedKeyTable';

export interface ResetState<T extends string = string> {
  created: EpochMS;
  data: T | undefined;
  attempts: number;
}

export class AttemptsError extends Error {
  constructor(readonly reason: 'attempts') {
    super();
  }
}

export interface SuccessfulAttempt<T extends string = string> {
  clear(): Promise<void>;
  context?: T;
}

interface AttemptsConfig {
  attemptsMax: number;
  validityTime: Milliseconds;
}
/**
 * A way to handle time/value based attempts
 */
export class LimitedAttempt {
  constructor(
    private reader: PartitionedKeyValueTable = new PartitionedKeyValueTable(),
    private timeProvider = defaultTimeProvider()
  ) {}

  /**
   * Attempts a time expire-able, amount limited action. If the attempt is expired
   * resets the attempts and allows you to start over. If its not expired and not at the attempt max
   * then returns the context of the attempt.
   *
   * If it is expired or reached the attempt max, then throws an error.
   * @param key The key to store things by
   * @param attemptsConfig
   * @param contextToStore
   */
  async attempt<T extends string = string>(
    key: CompoundKey<string, ResetState<T>>,
    attemptsConfig: AttemptsConfig,
    contextToStore?: T
  ): Promise<SuccessfulAttempt<T> | undefined> {
    const existingState = await this.reader.get(key);

    if (existingState) {
      const validity = this.checkValidity(existingState, attemptsConfig);

      // if it's not expired, see if we've
      // hit the max number of attempts
      if (!validity.expired) {
        if (validity.tooManyAttempts) {
          throw new AttemptsError('attempts');
        }

        // mark that we did an attempt
        await this.reader.set(key, { ...existingState, attempts: existingState.attempts + 1 });

        return {
          clear: async () => {
            await this.reader.delete(key);
          },
          context: existingState.data,
        };
      }
    }

    const state: ResetState<T> = {
      created: this.timeProvider.epochMS(),
      data: contextToStore,
      attempts: 1,
    };

    await this.reader.set(key, state);

    return {
      clear: async () => {
        await this.reader.delete(key);
      },
      context: contextToStore,
    };
  }

  private checkValidity(
    state: ResetState,
    attemptsConfig: AttemptsConfig
  ): { expired: boolean; tooManyAttempts: boolean } {
    const expirationTime = state.created + attemptsConfig.validityTime;
    const expired = this.timeProvider.epochMS() > expirationTime;
    const tooManyAttempts = state.attempts >= attemptsConfig.attemptsMax;

    return { expired, tooManyAttempts };
  }
}
