import { toBase64ImageUri } from './images';

test('converts to base64 uri', () => {
  expect(toBase64ImageUri({ base64: 'base64Image', mime: 'image/gif' })).toEqual('data:image/gif;base64,base64Image');
});
