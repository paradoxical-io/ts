import { RequestApplicationState } from '@hapi/hapi';

/**
 * Application state used to log request information
 */
export interface ServerApplicationState extends RequestApplicationState {
  userId?: string;
}
