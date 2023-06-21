import { CodeGenerator } from './codeGenerator';

test('code generator', () => {
  const gen = new CodeGenerator();

  expect(gen.alpha(6)).toHaveLength(6);
});
