import { safeExpect } from '@paradox/common-test';

import { PubSub } from './index';

interface A {
  type: 'a';
  data: number;
}

interface B {
  type: 'b';
  other: number;
}

type E = A | B;

test('subscribes', async () => {
  const pubsub = new PubSub<E>();

  let invokeA = 0;
  let invokeB = 0;

  pubsub.subscribe('a', a => {
    invokeA += a.data;
  });

  pubsub.subscribe('b', a => {
    invokeB += a.other;
  });

  await pubsub.publish({ type: 'a', data: 1 });

  await pubsub.publish({ type: 'b', other: 5 });

  safeExpect(invokeA).toEqual(1);
  safeExpect(invokeB).toEqual(5);
});

test('multiple subscribers', async () => {
  const pubsub = new PubSub<E>();

  let invokeA = 0;
  let invokeA2 = 0;

  pubsub.subscribe('a', a => {
    invokeA += a.data;
  });

  pubsub.subscribe('a', a => {
    invokeA2 += a.data;
  });

  await pubsub.publish({ type: 'a', data: 1 });

  safeExpect(invokeA).toEqual(1);
  safeExpect(invokeA2).toEqual(1);
});

test('errors bubble out', async () => {
  const pubsub = new PubSub<E>();

  pubsub.subscribe('a', () => {
    throw new Error('a failed');
  });

  await safeExpect(pubsub.publish({ type: 'a', data: 1 })).rejects.toThrow();
});

test('errors proxy to handler', async () => {
  const pubsub = new PubSub<E>();

  pubsub.subscribe('a', () => {
    throw new Error('a failed');
  });

  let e: Error | undefined;
  await pubsub.publish({ type: 'a', data: 1 }, err => {
    e = err as Error;
  });

  safeExpect(e).toBeDefined();
});
