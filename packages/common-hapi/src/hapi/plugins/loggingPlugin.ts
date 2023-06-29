import { Dependencies, LogEvent, RequestEvent, Server } from '@hapi/hapi';
import { caughtToError, safeStringify } from '@paradoxical-io/common';
import { isAxiosError, log, Logger } from '@paradoxical-io/common-server';
import { nullOrUndefined } from '@paradoxical-io/types';

import { SimplePlugin } from './simplePlugin';

export class HAPILogging implements SimplePlugin {
  constructor(public dependencies?: Dependencies) {}

  name = 'logging';

  register(server: Server) {
    server.events.on('log', (event, tag) => {
      try {
        const logger = log.withTrace(event.request);

        this.logHttp(tag, logger, event);
      } catch (e) {
        log.error('Unable to log on the server', e);
      }
    });

    server.events.on('request', (request, event, tag) => {
      try {
        const logger = log.withTrace(request.info.id);

        this.logHttp(tag, logger, event);
      } catch (e) {
        log.error('Unable to log request  on the server', e);
      }
    });
  }

  private logHttp(tag: { [key: string]: true }, logger: Logger, event: RequestEvent | LogEvent) {
    try {
      const tagKeys = Object.keys(tag).join(', ');
      if (event.channel === 'internal') {
        logger.debug(safeStringify(event));
        return;
      }
      if (event.error) {
        if (isAxiosError(event.error)) {
          // don't log the entire axios error since its crazy verbose
          logger.error(`${event.error.toString()} ${tagKeys}`, {
            stack: event.error.stack,
            message: event.error.message,
          });
        } else {
          logger.error(`${event.error.toString()} ${tagKeys}`, event.error);
        }
      } else if (typeof event.data === 'object') {
        if (nullOrUndefined(process.env.PARADOX_SKIP_HTTP_LOG)) {
          logger.with({ ...event.data }).info(tagKeys);
        }
      } else if (nullOrUndefined(process.env.PARADOX_SKIP_HTTP_LOG)) {
        logger.info(event.data);
      }
    } catch (e) {
      logger.error(`Unhandled error logging request`, caughtToError(e));
    }
  }
}
