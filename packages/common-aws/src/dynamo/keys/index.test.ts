import { usingEnv } from '@paradoxical-io/common-test';

import { dynamoTableName } from '../util';

test('dynamo names', () =>
  usingEnv('dev', () => {
    expect(dynamoTableName('foo')).toEqual('paradox.dev.foo');
  }));
