import { JsonTransformer } from './jsonTransformer';

interface SimpleType {
  numValue: number;
  strValue: string;
  boolValue: boolean;
  nullVal: null;
  optVal?: number;
}

test('JsonTransformer transforms simple objects', () => {
  const transformer = new JsonTransformer<SimpleType>();
  const valueWithOpt: SimpleType = {
    numValue: 10,
    strValue: 'test',
    boolValue: true,
    nullVal: null,
    optVal: 10,
  };

  const valueWithoutOpt: SimpleType = {
    numValue: 10,
    strValue: 'test',
    boolValue: true,
    nullVal: null,
  };

  const valueExplicitNoOpt: SimpleType = {
    numValue: 10,
    strValue: 'test',
    boolValue: true,
    nullVal: null,
    optVal: undefined,
  };

  expect(transformer.to(valueWithOpt)).toEqual(
    '{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null,"optVal":10}'
  );
  expect(transformer.to(valueWithoutOpt)).toEqual('{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null}');
  expect(transformer.to(valueExplicitNoOpt)).toEqual(
    '{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null}'
  );

  expect(transformer.from('{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null}')).toEqual(
    valueExplicitNoOpt
  );
  expect(transformer.from('{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null}')).toEqual(
    valueWithoutOpt
  );
  expect(transformer.from('{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null,"optVal":10}')).toEqual(
    valueWithOpt
  );
});

interface ComplexType {
  nested?: SimpleType;
  array: SimpleType[];
}

test('JsonTransformer transforms complex objects', () => {
  const transformer = new JsonTransformer<ComplexType>();

  const valueWithOpt: ComplexType = {
    nested: {
      numValue: 10,
      strValue: 'test',
      boolValue: true,
      nullVal: null,
      optVal: 10,
    },
    array: [
      {
        numValue: 10,
        strValue: 'test',
        boolValue: true,
        nullVal: null,
      },
    ],
  };

  const valueWithoutOpt: ComplexType = {
    array: [
      {
        numValue: 10,
        strValue: 'test',
        boolValue: true,
        nullVal: null,
      },
      {
        numValue: 10,
        strValue: 'test',
        boolValue: true,
        nullVal: null,
        optVal: 10,
      },
    ],
  };

  const emptyValue: ComplexType = {
    array: [],
  };

  expect(transformer.to(valueWithOpt)).toEqual(
    '{"nested":{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null,"optVal":10},"array":[{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null}]}'
  );
  expect(transformer.to(valueWithoutOpt)).toEqual(
    '{"array":[{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null},{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null,"optVal":10}]}'
  );
  expect(transformer.to(emptyValue)).toEqual('{"array":[]}');

  expect(
    transformer.from(
      '{"nested":{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null,"optVal":10},"array":[{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null}]}'
    )
  ).toEqual(valueWithOpt);
  expect(
    transformer.from(
      '{"array":[{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null},{"numValue":10,"strValue":"test","boolValue":true,"nullVal":null,"optVal":10}]}'
    )
  ).toEqual(valueWithoutOpt);
  expect(transformer.from('{"array":[]}')).toEqual(emptyValue);
});
