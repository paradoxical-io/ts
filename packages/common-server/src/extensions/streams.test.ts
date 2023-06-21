import { safeExpect } from '@paradox/common-test';
import stream from 'stream';

import { Streams } from './streams';

test('take sync', () => {
  expect([...Streams.take(infinity(), 10)]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('to array', async () => {
  const s = new stream.Readable({
    objectMode: true,
    read() {},
  });

  const p = Streams.toArray(s);

  s.push(1);
  s.push(2);
  s.push(3);

  s.destroy();

  safeExpect(await p).toEqual([1, 2, 3]);
});

test('drop while', () => {
  expect([
    ...Streams.take(
      Streams.dropWhile(infinity(), i => i < 5),
      5
    ),
  ]).toEqual([5, 6, 7, 8, 9]);
});

test('take async', async () => {
  const data: number[] = [];

  for await (const i of Streams.takeAsync(infinityAsync(), 10)) {
    data.push(i);
  }

  expect(data).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('from async', async () => {
  const data: number[] = await Streams.from(Streams.takeAsync(infinityAsync(), 10));

  expect(data).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('grouped async', async () => {
  const data: number[][] = [];

  const grouped = Streams.grouped(infinityAsync(), 2);

  for await (const i of Streams.takeAsync(grouped, 2)) {
    data.push(i);
  }

  expect(data).toEqual([
    [0, 1],
    [2, 3],
  ]);
});

test('map async', async () => {
  const data: string[] = [];

  const mapped = Streams.map(infinityAsync(), i => i.toString());

  for await (const i of Streams.takeAsync(mapped, 2)) {
    data.push(i);
  }

  expect(data).toEqual(['0', '1']);
});

function* infinity(): Generator<number> {
  let start = 0;
  while (true) {
    yield start;
    start++;
  }
}

async function* infinityAsync(): AsyncGenerator<number> {
  let start = 0;
  while (true) {
    yield start;
    start++;
  }
}
