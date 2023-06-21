import * as fs from 'fs';

import { createZip } from './zip';

test('large', async () => {
  const zipStream = fs.createWriteStream('temp.zip');

  await createZip(
    [
      {
        path: `interchange_report_1659312000000_1661990400000_summary.csv`,
        data: fs.createReadStream(
          `/Users/akropp/src/paradox/data/interchange_report_1659312000000_1661990400000_summary.csv`
        ),
      },
      {
        path: `interchange_report_1659312000000_1661990400000.csv`,
        data: fs.createReadStream(`/Users/akropp/src/paradox/data/interchange_report_1659312000000_1661990400000.csv`),
      },
    ],
    zipStream
  );
});
