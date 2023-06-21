import { notNullOrUndefined, nullishToUndefined, nullOrUndefined } from './nullish';

interface Test {
  a:
    | {
        b: string;
      }
    | null
    | undefined;
}

const a = (v: string | null | undefined): Test => {
  if (v === null || v === undefined) {
    return {
      a: v,
    };
  }

  return {
    a: {
      b: v,
    },
  };
};

test('nullOrUndefined', () => {
  expect(nullOrUndefined('a')).toBeFalsy();
  expect(nullOrUndefined(null)).toBeTruthy();
  expect(nullOrUndefined(undefined)).toBeTruthy();

  const testValue = a('test');
  let result: string | undefined;

  // the below line doesn't compile
  // result = testValue.a.b;

  if (!nullOrUndefined(testValue.a)) {
    // but this should compile
    result = testValue.a.b;
  }

  expect(result).not.toBeUndefined();
});

test('notNullOrUndefined', () => {
  expect(notNullOrUndefined('a')).toBeTruthy();
  expect(notNullOrUndefined(null)).toBeFalsy();
  expect(notNullOrUndefined(undefined)).toBeFalsy();

  const testValue = a('test');
  let result: string | undefined;

  // the below line doesn't compile
  // result = testValue.a.b;

  if (notNullOrUndefined(testValue.a)) {
    // but this should compile
    result = testValue.a.b;
  }

  expect(result).not.toBeUndefined();
});

test('nullishToUndefined', () => {
  expect(nullishToUndefined(null)).toEqual(undefined);
  expect(nullishToUndefined(undefined)).toEqual(undefined);
  expect(nullishToUndefined(1)).toEqual(1);
});
