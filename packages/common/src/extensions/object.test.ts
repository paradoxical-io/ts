import { safeExpect } from '@paradox/common-test';

import { deepToSnake, mapKeys, preferSetField, pruneUndefined } from './object';

test('prunes undefined', () => {
  const data = {
    a: 1,
    b: undefined,
    c: 2,
  };

  expect(pruneUndefined(data)).toMatchObject({ a: 1, c: 2 });
});

test('returns object if nothing is undefined', () => {
  const data = {
    a: 1,
  };

  expect(pruneUndefined(data)).toMatchObject({ a: 1 });
});

test('doesnt break on empty object', () => {
  expect(pruneUndefined({})).toMatchObject({});
});

test('maps keys', () => {
  const data = {
    one: 'one',
    two: 'two',
  };

  safeExpect(new Set(mapKeys(data, k => data[k]))).toEqual(new Set(['one', 'two']));
});

test('prefer set field', () => {
  safeExpect(preferSetField('test', s => s, undefined, 'previous')).toEqual('previous');
  safeExpect(preferSetField('test', s => s, 'current', 'previous')).toEqual('current');
  safeExpect(preferSetField('test', s => s, 'current', undefined)).toEqual('current');
  safeExpect(preferSetField('test', s => s, undefined, undefined)).toEqual(undefined);
});

describe('deep snakes', () => {
  test('modifies basic objects', () => {
    expect(
      deepToSnake(
        {
          'Event Name': 'Error Displayed',
          properties: {
            error: {
              message: 'message',
              'First Name': 'name',
            },
            requestId: 'request',
          },
        },
        false
      )
    ).toEqual({
      event_name: 'Error Displayed',
      properties: {
        error: {
          message: 'message',
          first_name: 'name',
        },
        request_id: 'request',
      },
    });
  });

  test('ignores array values', () => {
    expect(
      deepToSnake(
        {
          'Event Name': 'Error Displayed',
          properties: [
            {
              error: {
                message: 'message',
                'First Name': 'name',
              },
              requestId: 'request',
            },
          ],
        },
        false
      )
    ).toEqual({
      event_name: 'Error Displayed',
      properties: [
        {
          error: {
            message: 'message',
            'First Name': 'name',
          },
          requestId: 'request',
        },
      ],
    });
  });

  test('includes original fields', () => {
    expect(
      deepToSnake(
        {
          'Event Name': 'Error Displayed',
          properties: {
            error: {
              message: 'message',
              'First Name': 'name',
            },
            requestId: 'request',
          },
        },
        true
      )
    ).toEqual({
      event_name: 'Error Displayed',
      original_event_name_property: 'Event Name',
      properties: {
        error: {
          message: 'message',
          first_name: 'name',
          original_first_name_property: 'First Name',
        },
        request_id: 'request',
        original_request_id_property: 'requestId',
      },
    });
  });
});
