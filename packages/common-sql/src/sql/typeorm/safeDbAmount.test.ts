import { Amount } from '@paradoxical-io/common';
import { safeExpect } from '@paradoxical-io/common-test';

import { safeDbAmount } from './safeDbAmount';

test('should safe format unknown db amounts', () => {
  // handles valid amounts
  safeExpect(safeDbAmount(10, -1 as Amount)).toEqual(10 as Amount);
  safeExpect(safeDbAmount(10, undefined as Amount | undefined)).toEqual(10 as Amount);

  // falls back on null values
  safeExpect(safeDbAmount(null, 10 as Amount)).toEqual(10 as Amount);
  safeExpect(safeDbAmount(null, 10 as Amount)).toEqual(10 as Amount);
  safeExpect(safeDbAmount(null, undefined as Amount | undefined)).toBeUndefined();

  // handles other types
  safeExpect(safeDbAmount('test', 10 as Amount)).toEqual(10 as Amount);
  safeExpect(safeDbAmount({}, 10 as Amount)).toEqual(10 as Amount);
});
