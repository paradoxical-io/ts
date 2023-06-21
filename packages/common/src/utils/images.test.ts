import { Base64Image } from '@paradox/types';

import { toBase64ImageUri } from './images';

test('converts to base64 uri', () => {
  expect(toBase64ImageUri({ base64: 'base64Image' as Base64Image, mime: 'image/gif' })).toEqual(
    'data:image/gif;base64,base64Image'
  );
});
