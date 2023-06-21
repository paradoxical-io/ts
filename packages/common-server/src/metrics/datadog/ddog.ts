import {
  ApiKey,
  asMilli,
  BasicHttpDatadog,
  defaultTimeProvider,
  emptyToUndefined,
  timeout,
  TimeProvider,
} from '@paradox/common';
import axiosDefault, { AxiosInstance } from 'axios';

import { currentEnvironment } from '../../env';
import { log } from '../../logger';
import { MetricEmitter, Tags } from '../contracts';

/**
 * Makes a web call to datadog
 */
export class DDogApi extends BasicHttpDatadog {
  constructor(
    apiKey: ApiKey,
    defaultTags: { [key: string]: string } = {},
    axios: AxiosInstance = axiosDefault.create(),
    timeProvider: TimeProvider = defaultTimeProvider()
  ) {
    super({
      apiKeyProvider: async () => apiKey,
      adapter: axios,
      currentEnvironment: currentEnvironment(),
      logger: log,
      defaultTags,
      timeProvider,
    });
  }

  static default(axios = axiosDefault.create(), timeProvider = defaultTimeProvider()): DDogApi {
    return new DDogApi(process.env.DD_API_KEY! as ApiKey, DDogApi.parseEnvTags(), axios, timeProvider);
  }

  private static parseEnvTags(): { [key: string]: string } {
    const envTagString = process.env.DD_TAGS;
    const tags: { [key: string]: string } = {};

    if (envTagString === undefined || emptyToUndefined(envTagString) === undefined) {
      return tags;
    }

    const envTags = envTagString.split(',');

    envTags.forEach(envTag => {
      const [key, value] = envTag.split(':');
      if (emptyToUndefined(key) !== undefined && emptyToUndefined(value) !== undefined) {
        tags[key.trim()] = value.trim();
      }
    });

    return tags;
  }
}

/**
 * A metric emitter that uses the http ddog class
 */
export class HttpDDogMetrics implements MetricEmitter {
  constructor(private readonly ddogApi = DDogApi.default(), private readonly flushTimeMs = asMilli(1, 'seconds')) {}

  private promises: Set<Promise<void>> = new Set();

  asyncTimer<T>(func: (...args: any[]) => Promise<T>, stat: string, tags?: Tags): (...args: any[]) => Promise<T> {
    const now = new Date();

    return async (...args: any[]) => {
      const result = await func(...args);

      this.timing(stat, new Date().getTime() - now.getTime(), tags);

      return result;
    };
  }

  close(callback: (error?: Error) => void): void {
    timeout(this.flushTimeMs, Promise.all([...this.promises]))
      .then(() => callback())
      .catch(e => callback(e))
      // to prevent any memory leaks make sure we clear the set regardless of what happens
      // in case the memory space of a lambda is re-used
      .then(() => this.promises.clear())
      .catch(() => {});
  }

  gauge() {}

  increment(stat: string, value: number, tags?: { [key: string]: string }): void;

  increment(stat: string, tags?: { [key: string]: string }): void;

  increment(stat: string, value?: number | { [key: string]: string }, tags?: { [key: string]: string }): void {
    const t: { [key: string]: string } | undefined = tags ?? (typeof value === 'object' ? value : undefined);

    const val = typeof value === 'number' ? value : 1;

    // Errors are already handled by the API so just catch and no-op to be safe
    this.addToCache(this.ddogApi.increment(stat, val, t));
  }

  timing(stat: string, value: number, tags?: Tags): void {
    // Errors are already handled by the API so just catch and no-op to be safe
    this.addToCache(this.ddogApi.latency(stat, value, tags));
  }

  private addToCache(p: Promise<void>) {
    // cache the promise so we can flush it later
    this.promises.add(p);

    p.catch(() => {})
      // if the promise resolved remove it from the cache
      .then(() => this.promises.delete(p))
      .catch(() => {});
  }
}
