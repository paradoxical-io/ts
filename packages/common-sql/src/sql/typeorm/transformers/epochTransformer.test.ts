import { EpochMS } from '@paradoxical-io/types';

import { EpochTransformer } from './epochTransformer';

test('epoch transforms dates', () => {
  const date = new EpochTransformer('date');
  expect(date.from(new Date(100))).toEqual(100 as EpochMS);
  expect(date.to(100 as EpochMS)).toEqual(new Date(100));

  const bigint = new EpochTransformer('bigint');
  expect(bigint.from(100)).toEqual(100 as EpochMS);
  expect(bigint.to(100 as EpochMS)).toEqual(100);

  const str = new EpochTransformer('string');
  expect(str.from('100')).toEqual(100 as EpochMS);
  expect(str.to(100 as EpochMS)).toEqual('100');
});
