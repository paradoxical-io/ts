import { pruneUndefined } from '../extensions';

export interface QueryParams {
  [k: string]: string | number | undefined;
}

export function withQueryParams(url: string, params: QueryParams): string {
  const values = Object.entries(pruneUndefined(params)).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`);

  if (values.length === 0) {
    return url;
  }

  return `${url}?${values.join('&')}`;
}
