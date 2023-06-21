import { safeExpect } from '@paradox/common-test';
import { Readable } from 'stream';

import { CsvStreamWriter } from '../csv';
import { Streams } from '../extensions';
import { newSftpDocker } from './docker';
import { Sftp } from './sftp';

test('uploads file', async () => {
  const host = await newSftpDocker();
  try {
    const sftp = await new Sftp(host).connect('username', 'pass');

    await sftp.write('/upload/test', Readable.from(Buffer.from('test')));

    const files = await sftp.listFiles('/upload');

    safeExpect(files).toEqual(['test']);
  } finally {
    await host.container.close();
  }
});

test('uploads file live stream', async () => {
  const host = await newSftpDocker();
  try {
    const sftp = await new Sftp(host).connect('username', 'pass');

    const data = new CsvStreamWriter<{ sample: string }>();

    const write = sftp.write('/upload/test', data.output());

    data.push({ sample: 'test' });

    data.close();

    await write;

    const stream = await sftp.getFile('/upload/test');

    const result = await Streams.toBuffer(stream);

    safeExpect(result.toString()).toEqual(`sample\ntest\n`);
  } finally {
    await host.container.close();
  }
});
