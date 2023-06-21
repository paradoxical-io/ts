/* eslint-disable @typescript-eslint/no-explicit-any */
import { caughtToError } from './errors';

test('caught to throwable respects errors', () => {
  expect(caughtToError(new Error('test'))).toEqual(new Error('test'));
});

test('caught to throwable maps unknowns', () => {
  expect(() => {
    throw caughtToError('test');
  }).toThrow(/Unknown thrown type: "test"/);
});
