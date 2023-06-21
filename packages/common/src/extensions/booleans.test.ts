import { Booleans } from './booleans';

test('parses true', () => {
  const trueValues = ['true', 'True', 'tRUe'];
  trueValues.forEach(value => expect(Booleans.parse(value)).toEqual(true));
});

test('parses false', () => {
  const falseValues = ['false', 'False', 'fALsE'];
  falseValues.forEach(value => expect(Booleans.parse(value)).toEqual(false));
});

// These all will current parse to false
test('parses other', () => {
  const otherValues = ['notTrue', 'anton', 'something else'];
  otherValues.forEach(value => expect(Booleans.parse(value)).toEqual(false));
});
