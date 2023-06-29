import { Server } from '@hapi/hapi';
import { safeStringify, truncate } from '@paradoxical-io/common';
import { Cls, log } from '@paradoxical-io/common-server';

import { isBoom } from '../../util';
import { SimplePlugin } from '../simplePlugin';
import { ErrorHandler } from './errorHandler';

export class HAPIErrorHandler implements SimplePlugin {
  name = 'error-handler';

  constructor(private handler: ErrorHandler = new ErrorHandler()) {}

  register(server: Server) {
    server.ext('onPreResponse', (r, h) => {
      if (isBoom(r.response)) {
        const response = this.handler.mapToBoom(r.response);

        const ctx: Cls = {};

        // use the request id as the context trace
        ctx.trace = r.info.id;

        // we weren't able to map our own error, allow regular boom to process and log the raw unmapped boom payload
        if (!response) {
          log
            .with({ ...ctx, response: truncate(safeStringify(r.response?.output?.payload), 1000) })
            .warn(`Non Paradox error handled on path ${r?.route?.path}`);

          return h.continue;
        }

        const context = { ...ctx, response: truncate(safeStringify(response?.output?.payload), 1000) };

        const errorMessage = `Error handled by HAPI on ${r?.route?.path}. ${r.response.message}`;

        // log stacks as errors for 500's
        if (response.output.statusCode >= 500) {
          if (r.response.stack !== undefined) {
            // log stack traces as errors only if they are >= code 500
            log.with(context).error(errorMessage, { stack: r.response.stack, message: r.response.message } as Error);
          } else {
            // log debug stack traces for all errors that have a stack
            log.with(context).debug(errorMessage, r.response);
          }
        } else {
          // log other errors as warns
          log.with(context).warn(errorMessage);
        }

        return h.response(response.output.payload).code(response.output.statusCode);
      }

      return h.continue;
    });
  }
}
