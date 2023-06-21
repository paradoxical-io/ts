import { safeExpect } from '@paradoxical-io/common-test';
import { Brand } from '@paradoxical-io/types';

import { newTestId } from '../utils';
import { Maps } from './maps';

type UserId = Brand<string, 'UserId'>;

test('groups', () => {
  const data = [
    { key: 1, d: 1 },
    { key: 2, d: 1 },
    { key: 2, d: 2 },
  ];

  const map = new Map();
  map.set(1, [data[0]]);
  map.set(2, [data[1], data[2]]);

  expect(Maps.groupBy(data, i => i.key)).toMatchObject(map);
});

test('to obj', () => {
  const data = new Map<UserId, string>([
    [newTestId('test'), 'test'],
    [newTestId('test2'), 'test2'],
  ]);

  const result = Maps.toObj(data);

  safeExpect(result).toEqual({
    ['test' as UserId]: 'test',
    ['test2' as UserId]: 'test2',
  });
});
