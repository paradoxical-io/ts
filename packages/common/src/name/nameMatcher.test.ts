import { nameMatchIntersect } from './nameMatcher';

test('matches based on token intersection', () => {
  expect(nameMatchIntersect('test abd', 'what is test')).toBeTruthy();
  expect(nameMatchIntersect('TEST 2', 'something test')).toBeTruthy();
  expect(nameMatchIntersect('Person Dog', 'Person Cat')).toBeTruthy();
  expect(nameMatchIntersect('twenty-three', 'three')).toBeTruthy();
  expect(nameMatchIntersect('\ttable', 'TAbLe')).toBeTruthy();
  expect(nameMatchIntersect('last, first', 'last')).toBeTruthy();
  expect(nameMatchIntersect('first last', 'last first')).toBeTruthy();

  expect(nameMatchIntersect('a', 'abc')).toBeFalsy();
  expect(nameMatchIntersect('a b c', 'a')).toBeFalsy();
  expect(nameMatchIntersect('', 'something')).toBeFalsy();
  expect(nameMatchIntersect('test', undefined)).toBeFalsy();
  expect(nameMatchIntersect(undefined, undefined)).toBeFalsy();
  expect(nameMatchIntersect('first last', 'no match')).toBeFalsy();
});
