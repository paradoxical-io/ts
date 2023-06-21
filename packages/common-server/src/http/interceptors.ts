import { SafeJson, truncate } from '@paradox/common';
import { AxiosError, AxiosInstance } from 'axios';

import { log } from '../logger';
import { Metrics } from '../metrics';

/**
 * An error interceptor that logs payload and responses along with incrementing an error metric
 * The name will be used in both logging and emit a metric like ${name}.error. Name should contain no
 * punctuation and no spaces.
 * @param axios The instance to register the interceptor on
 * @param name The logging/metric name
 */
export function registerAxiosLoggingInterceptor(axios: AxiosInstance, name: string) {
  if (!axios.interceptors || process.env.JEST_TEST) {
    // mocked axios won't have this set
    return;
  }

  axios.interceptors.response.use(
    ok => ok,
    (err: AxiosError) => {
      try {
        const response = err.response;
        const config = response?.config;

        const reqString = SafeJson.stringify(err?.config?.data) ?? '';
        const responseString = SafeJson.stringify(response?.data) ?? '';

        const trimmedRequest = truncate(reqString, 1000);
        const trimmedResponse = truncate(responseString, 1000);

        log
          .with({
            http_method: config?.method,
            [name.toLowerCase()]: true,
            http_path: config?.url,
            statusText: response?.statusText,
            request: trimmedRequest,
            response: trimmedResponse,
            http_code: response?.status,
            code: err.code,
          })
          .warn(`${name} returned non success ${response?.status || 'unknown'}. Payload logged`);

        Metrics.instance.increment(`${name.replace(' ', '.').toLowerCase()}.error`, {
          code: response?.status?.toString() ?? 'unknown',
        });
      } catch (e) {
        log.warn(`Unable to log ${name} axios failure`, e);
      }

      return Promise.reject(err);
    }
  );
}
