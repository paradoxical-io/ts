import { IPAddress } from '@paradoxical-io/types';

import {
  getAuditActionUser,
  getRequestIPAddress,
  setAuditActionUser,
  setRequestIPAddress,
  Trace,
  traceID,
  withNewTrace,
} from './trace';

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

test('auditable user id trace sets', async () => {
  expect(getAuditActionUser()).toEqual(undefined);

  // run another promise in parallel
  const [id1, id2, id3, system] = await Promise.all([
    withNewTrace(async () => {
      setAuditActionUser('id1');
      return new Promise<string | undefined>(r => {
        r(getAuditActionUser());
      });
    }),
    withNewTrace(async () => {
      setAuditActionUser('id2');
      return new Promise<string | undefined>(r => {
        setTimeout(() => r(getAuditActionUser()), 500);
      });
    }),
    withNewTrace(
      async () =>
        new Promise<string | undefined>(r => {
          setAuditActionUser('id3');
          setTimeout(() => r(getAuditActionUser()!), 250);
        })
    ),
    withNewTrace(
      async () =>
        new Promise<string | undefined>(r => {
          setTimeout(() => r(getAuditActionUser()), 250);
        })
    ),
  ]);

  expect(getAuditActionUser()).toEqual(undefined);
  expect(id1).toEqual('id1');
  expect(id2).toEqual('id2');
  expect(id3).toEqual('id3');
  expect(system).toEqual(undefined);
});

test('request ip address sets', async () => {
  expect(getRequestIPAddress()).toEqual(undefined);

  // run another promise in parallel
  const [id1, id2, id3, system] = await Promise.all([
    withNewTrace(async () => {
      setRequestIPAddress('id1' as IPAddress);
      return new Promise<string | undefined>(r => {
        r(getRequestIPAddress());
      });
    }),
    withNewTrace(async () => {
      setRequestIPAddress('id2' as IPAddress);
      return new Promise<string | undefined>(r => {
        setTimeout(() => r(getRequestIPAddress()), 500);
      });
    }),
    withNewTrace(
      async () =>
        new Promise<string | undefined>(r => {
          setRequestIPAddress('id3' as IPAddress);
          setTimeout(() => r(getRequestIPAddress()), 250);
        })
    ),
    withNewTrace(
      async () =>
        new Promise<string | undefined>(r => {
          setTimeout(() => r(getRequestIPAddress()), 250);
        })
    ),
  ]);

  expect(getRequestIPAddress()).toEqual(undefined);
  expect(id1).toEqual('id1');
  expect(id2).toEqual('id2');
  expect(id3).toEqual('id3');
  expect(system).toEqual(undefined);
});
