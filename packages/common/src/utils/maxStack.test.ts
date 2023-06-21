import { safeExpect } from '@paradox/common-test';

import { newTestId } from './brands';
import { MaxStack } from './maxStack';

test.each([5, 10, 15, 20])('max stack should only allow up to %j items', (maxSize: number) => {
  const stack = new MaxStack<string>(maxSize);

  for (let i = 0; i < maxSize; i += 1) {
    stack.push([newTestId<string>()]);
  }

  safeExpect(stack.items().length).toEqual(maxSize);

  stack.push([newTestId<string>()]);

  safeExpect(stack.items().length).toEqual(maxSize);
});
