import { Brand, EpochSeconds } from '@paradox/types';

export type ApiKey = Brand<string, 'ApiKey'>;

import { defaultTimeProvider, TimeProvider } from '../../datetime';

export interface HTTPAdapter {
  post<T>(url: string, body: T): Promise<{ status: number; statusText?: string }>;
}

export interface BasicMetrics {
  /**
   * Measure a method
   * @param metric
   * @param method
   * @param tags
   */
  asyncLatency<T>(metric: string, method: () => Promise<T>, tags?: { [key: string]: string }): Promise<T>;

  /**
   * increment a counter
   * @param metric
   * @param value
   * @param tags
   */
  increment(metric: string, value?: number, tags?: { [key: string]: string }): Promise<void>;

  incrementBatch(metric: string, values: TimeValue<number>, tags?: { [key: string]: string }): Promise<void>;

  /**
   * Measure a distribution/latency
   * @param metric
   * @param value
   * @param tags
   */
  latency(metric: string, value: number, tags?: { [key: string]: string }): Promise<void>;

  latencyBatch(metric: string, values: TimeValue<number[]>, tags: { [key: string]: string }): Promise<void>;
}

/**
 * Makes a web call to datadog
 */
export class BasicHttpDatadog implements BasicMetrics {
  private readonly url: string;

  private readonly adapter: HTTPAdapter;

  private readonly currentEnvironment: 'prod' | 'dev' | 'local';

  private readonly logger: Pick<Console, 'warn'>;

  private readonly defaultTags: { [p: string]: string };

  private readonly timeProvider: TimeProvider;

  private readonly apiKeyProvider: () => Promise<string | undefined>;

  private readonly metricPrefix: string | undefined;

  constructor({
    apiKeyProvider,
    adapter,
    currentEnvironment,
    logger = console,
    defaultTags = {},
    metricPrefix,
    timeProvider = defaultTimeProvider(),
  }: {
    apiKeyProvider: () => Promise<ApiKey | undefined>;
    adapter: HTTPAdapter;
    currentEnvironment: 'prod' | 'dev' | 'local';
    logger?: Pick<typeof console, 'warn'>;
    defaultTags?: { [p: string]: string };
    metricPrefix?: string;
    timeProvider?: TimeProvider;
  }) {
    this.apiKeyProvider = apiKeyProvider;
    this.adapter = adapter;
    this.currentEnvironment = currentEnvironment;
    this.logger = logger;
    this.defaultTags = defaultTags;
    this.metricPrefix = metricPrefix;
    this.timeProvider = timeProvider;
    this.url = `https://api.datadoghq.com/api/v1`;
  }

  async asyncLatency<T>(metric: string, method: () => Promise<T>, tags: { [key: string]: string } = {}): Promise<T> {
    const start = Date.now();

    const result = await method();

    this.latency(metric, Date.now() - start, tags).catch(e => this.logger.warn(`Unable to post metric ${metric}`, e));

    return result;
  }

  /**
   * Issues a count metric
   * @param metric
   * @param tags
   * @param value
   */
  async increment(metric: string, value: number = 1, tags: { [key: string]: string } = {}): Promise<void> {
    return this.incrementBatch(metric, [[this.nowEpochSeconds(), value]], tags);
  }

  async incrementBatch(metric: string, values: TimeValue<number>, tags: { [key: string]: string } = {}): Promise<void> {
    try {
      const apiKey = await this.apiKeyProvider();

      if (!apiKey) {
        return;
      }

      const payload: BatchMetric<number> = {
        metric: `paradox.${this.metricPrefix ? `${this.metricPrefix}.` : ''}${metric}`,
        points: values,
        tags: Object.entries({ ...this.defaultTags, ...tags, env: this.currentEnvironment }).map(
          ([k, v]) => `${k}:${v}`
        ),
      };

      const body = {
        series: [payload],
      };

      const result = await this.adapter.post(`${this.url}/series?api_key=${apiKey}`, body);

      if (result.status !== 202) {
        this.logger.warn(`unable to post metric ${metric}: ${result.statusText} ${result.status} `);
      }
    } catch (e) {
      this.logger.warn(`unable to post metric ${metric}`, e);
    }
  }

  /**
   * Issues a distribution metric of the latency
   * @param metric
   * @param tags
   * @param value
   */
  async latency(metric: string, value: number, tags: { [key: string]: string } = {}): Promise<void> {
    return this.latencyBatch(metric, [[this.nowEpochSeconds(), [value]]], tags);
  }

  async latencyBatch(metric: string, values: TimeValue<number[]>, tags: { [key: string]: string } = {}): Promise<void> {
    try {
      const apiKey = await this.apiKeyProvider();

      if (!apiKey) {
        return;
      }

      const payload: BatchMetric<number[]> = {
        metric: `paradox.${this.metricPrefix ? `${this.metricPrefix}.` : ''}${metric}`,
        points: values,
        tags: Object.entries({ ...this.defaultTags, ...tags, env: this.currentEnvironment }).map(
          ([k, v]) => `${k}:${v}`
        ),
      };

      const body = {
        series: [payload],
      };

      const result = await this.adapter.post(`${this.url}/distribution_points?api_key=${apiKey}`, body);

      if (result.status !== 202) {
        this.logger.warn(`unable to post distribution metric ${metric}: ${result.statusText} ${result.status} `);
      }
    } catch (e) {
      this.logger.warn(`unable to post distribution metric ${metric}`, e);
    }
  }

  private nowEpochSeconds(): EpochSeconds {
    return this.timeProvider.epochSec();
  }
}

interface BatchMetric<T extends number[] | number> {
  metric: string;
  tags: string[];
  points: TimeValue<T>;
}

export type TimeValue<T extends number[] | number> = Array<[EpochSeconds, T]>;
