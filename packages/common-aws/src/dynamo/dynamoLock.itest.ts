import { settableTimeProvider } from '@paradoxical-io/common';

import { newDynamoDocker } from './docker';
import { DynamoLock, DynamoLockEntryDao } from './dynamoLock';
import { DynamoTableName } from './util';

test('creates and manages locks', async () => {
  const table = 'locks';
  const docker = await newDynamoDocker();
  try {
    const timeProvider = settableTimeProvider();

    await docker.createTable(DynamoLockEntryDao, table);

    const locker = new DynamoLock({ dynamo: docker.dynamo, tableName: table as DynamoTableName, timeProvider });

    const keyName = 'foo';

    const lock = await locker.tryAcquire(keyName, 3);
    expect(lock).toBeTruthy();

    const locked = await locker.tryAcquire(keyName, 3);
    expect(locked).toBeFalsy();

    timeProvider.addSeconds(5);

    const newBecauseOfTimeout = await locker.tryAcquire(keyName, 3);
    expect(newBecauseOfTimeout).toBeTruthy();

    if (!newBecauseOfTimeout) {
      fail();
    }

    await newBecauseOfTimeout.release();

    const newBecauseOldWasReleased = await locker.tryAcquire(keyName, 3);
    expect(newBecauseOldWasReleased).toBeTruthy();
  } finally {
    await docker.container.close();
  }
});
