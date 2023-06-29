import { getHeader } from './util';

test('headers safely extract', () => {
  expect(getHeader({}, 'foo')).toEqual(undefined);
  expect(getHeader({ foo: 'bar' }, 'Foo')).toEqual('bar');
});
