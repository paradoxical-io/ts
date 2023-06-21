import { PropType } from '@paradox/types';

import { propertiesOf, propertyOf } from './properties';

interface TestProps {
  testName: string;
  testNumber: number;
}

// It's not really feasible in Typescript to test the "failure" cases of these, because a failure of any of these
// leads to a compilation failure. That said, all of these positive cases should compile.

test('propertyOf', () => {
  const p = propertyOf<TestProps>('testName');

  expect(p).toEqual('testName');
});

test('propertiesOf', () => {
  const properties = propertiesOf<TestProps>();

  expect(properties('testName')).toEqual('testName');
});

test('propType', () => {
  const n: PropType<TestProps, 'testNumber'> = 2;
  const s: PropType<TestProps, 'testName'> = 'needs to be a string';

  expect(n).toBeTruthy();
  expect(s).toBeTruthy();
});
