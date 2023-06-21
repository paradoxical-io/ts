export interface AwsErrorWithCode {
  code: string;
}

export interface AwsErrorWithStatusCode {
  statusCode: number;
}

/**
 * Utility method to help capture aws promise stack traces by capturing a local error instance at the call site
 * and then rejecting the source error appending the captured error stack. The reason is that aws resolves the promise
 * not via async/await but through an event emitter event. Because of that there is no information about the originating call
 * of the stack
 *
 * TLDR; a jank way of getting stack traces from aws. Please use this on every aws call like this:
 *
 * awsmethod.promise().catch(awsRethrow())
 *
 * @param ctx custom context to provide in the error
 * @param e closed over error. DO NOT SET
 */
export const awsRethrow =
  (ctx = '', e = new Error('captured_stack')) =>
  (error: Error) => {
    // @ts-ignore
    error['stack'] = `${error.stack}\n${e.stack}`;
    error['message'] = `${error.message}
${JSON.stringify(error)}
${ctx}`;
    return Promise.reject(error);
  };

export function hasAWSErrorCode<T>(e: T): e is AwsErrorWithCode & T {
  return (e as unknown as AwsErrorWithCode).code !== undefined;
}

export function hasAWSStatusCode<T>(e: T): e is AwsErrorWithStatusCode & T {
  return (e as unknown as AwsErrorWithStatusCode).statusCode !== undefined;
}
