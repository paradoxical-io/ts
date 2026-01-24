import asyncRetry = require('async-retry');
import { asMilli, retry } from '@paradoxical-io/common';
import { notNullOrUndefined } from '@paradoxical-io/types';

import { isAxiosError } from '../http';

/**
 * Retries axios but ignores certain error codes
 * @param skipCodes http codes to ignore if they occur
 * @param opts Options or defaults will be used
 */
export const axiosRetry = (skipCodes = [400], opts?: asyncRetry.Options) =>
  retry({
    retries: 3,
    maxTimeout: asMilli(5, 'seconds'),
    ...opts,
    bailOn: e => isAxiosError(e) && notNullOrUndefined(e.response?.status) && skipCodes.includes(e.response!.status),
  });
