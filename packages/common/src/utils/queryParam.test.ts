import { safeExpect } from '@paradoxical-io/common-test';

import { withQueryParams } from './queryParam';

test('params', () => {
  safeExpect(withQueryParams('http://localhost', {})).toEqual('http://localhost');
  safeExpect(withQueryParams('http://localhost', { exclude: undefined })).toEqual('http://localhost');
  safeExpect(withQueryParams('http://localhost', { name: 'name' })).toEqual('http://localhost?name=name');
  safeExpect(withQueryParams('http://localhost', { name: 'name', name2: 'name2' })).toEqual(
    'http://localhost?name=name&name2=name2'
  );

  safeExpect(withQueryParams('http://localhost', { name: 'test?' })).toEqual('http://localhost?name=test%3F');
});
