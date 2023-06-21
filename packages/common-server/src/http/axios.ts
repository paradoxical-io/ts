import { asMilli, lazy } from '@paradox/common';
import axios, { AxiosError, AxiosInstance, AxiosProxyConfig } from 'axios';
import https from 'https';

import { isLocal } from '../env';
import { log } from '../logger';

const defaultAxios = lazy(() => createNewAxios());

export function createNewAxios(timeout = asMilli(5, 'minutes')): AxiosInstance {
  return axios.create({
    proxy: configureProxySettings(),
    timeout,
    httpsAgent: new https.Agent({ keepAlive: true }),
  });
}

export function getDefaultAxios(): AxiosInstance {
  return defaultAxios();
}

export function configureProxySettings(): AxiosProxyConfig | false {
  if (isLocal && process.env.PROXY_HOST && process.env.PROXY_PORT) {
    log.warn('Configuring proxy settings!');

    return {
      host: process.env.PROXY_HOST,
      port: parseInt(process.env.PROXY_PORT, 10),
    };
  }

  return false;
}

export function isAxiosError(e: Error | unknown): e is AxiosError {
  const err = e as AxiosError;
  return err.isAxiosError || (err.response !== undefined && err.response.status >= 400);
}

export class AxiosErrors {
  static conflict(e: Error | unknown) {
    return isAxiosError(e) && e.response?.status === 409;
  }

  static notFound(e: Error | unknown) {
    return isAxiosError(e) && e.response?.status === 404;
  }
}
