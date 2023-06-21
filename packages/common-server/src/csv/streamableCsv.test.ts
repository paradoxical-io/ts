import { safeExpect } from '@paradox/common-test';
import { Readable } from 'stream';

import { CsvReader } from './csv';
import { CsvStreamWriter, toCsv } from './streamableCsv';

describe('stringify', () => {
  test('creates csv', async () => {
    safeExpect(
      await toCsv([
        { key: 'value', key2: 'value' },
        { key: 'value2', key2: 'value2' },
      ])
    ).toEqual(`key,key2
value,value
value2,value2
`);
  });

  test('csv with date and custom headers', async () => {
    safeExpect(await toCsv([{ name: 'name', date: new Date(1) }], { date: 'Date', name: 'Name' })).toEqual(
      `Date,Name
1970-01-01T00:00:00.001Z,name
`
    );
  });
});

interface SampleCsv {
  foo: number;
  bar: string;
}

describe('writer', () => {
  test('streams', async () => {
    let data: string = '';

    const writer = new CsvStreamWriter<SampleCsv>();

    const p = new Promise(resolve => {
      const stream = writer.output();
      stream
        .on('data', chunk => {
          data += chunk.toString();
        })
        .on('end', resolve);
    });

    writer.push({ foo: 1, bar: 'bar' });
    writer.push({ foo: 2, bar: 'bar' });
    writer.push({ foo: 3, bar: 'bar' });

    writer.close();

    await p;

    safeExpect(data).toEqual(`foo,bar
1,bar
2,bar
3,bar
`);

    const rawRead = await new CsvReader<SampleCsv>().read(Readable.from(data));

    safeExpect(rawRead).toEqual([
      { foo: '1', bar: 'bar' },
      { foo: '2', bar: 'bar' },
      { foo: '3', bar: 'bar' },
    ]);

    const mappedRead = await new CsvReader<SampleCsv>().read<SampleCsv>(Readable.from(data), {
      mapper: x => ({
        ...x,
        foo: Number(x.foo),
      }),
    });

    safeExpect(mappedRead).toEqual([
      { foo: 1, bar: 'bar' },
      { foo: 2, bar: 'bar' },
      { foo: 3, bar: 'bar' },
    ]);
  });
});
