import { Trace, traceID, withNewTrace } from './trace';

test('trace sets', async () => {
  expect(traceID().trace).toBeFalsy();

  // run another promise in parallel
  const [result1, result2] = await Promise.all([
    withNewTrace(
      async () =>
        new Promise<Trace>(r => {
          r(traceID());
        }),
      '123'
    ),
    withNewTrace(
      async () =>
        new Promise<Trace>(r => {
          setTimeout(() => r(traceID()), 500);
        }),
      '456'
    ),
  ]);

  expect(traceID().trace).toBeFalsy();
  expect(result1.trace).toEqual('123');
  expect(result2.trace).toEqual('456');

  expect(result1.subTrace).toBeTruthy();
  expect(result2.subTrace).toBeTruthy();
  expect(result1.subTrace).not.toEqual(result2.subTrace);
});
