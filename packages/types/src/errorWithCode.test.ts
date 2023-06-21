import { ErrorCode } from './errorTypes';
import { ErrorWithCode, isErrorWithCode } from './errorWithCode';

class ExampleError extends ErrorWithCode {
  type = 'example';
}

test('error with code', () => {
  expect(isErrorWithCode(new ExampleError(ErrorCode.Invalid, { errorMessage: 'test' }))).toBeTruthy();
});
