import { safeExpect } from '@paradoxical-io/common-test';
import { Sha, VersionChannels } from '@paradoxical-io/types';

import { AppVersionParser } from './versionParser';

test('app version parsing', () => {
  safeExpect(new AppVersionParser('v2.0.0:1234').version()).toMatchObject({
    major: 2,
    minor: 0,
    revision: 0,
    build: 1234,
  });
});

test('app version parsing with invalid numbers', () => {
  safeExpect(new AppVersionParser('va.0.0:1234').version()).toMatchObject({
    major: undefined,
    minor: 0,
    revision: 0,
    build: 1234,
  });
});

test('app version parsing with no leading version', () => {
  safeExpect(new AppVersionParser('10.1.2:1234').version()).toMatchObject({
    major: 10,
    minor: 1,
    revision: 2,
    build: 1234,
  });
});

test('app version parsing with sha', () => {
  safeExpect(new AppVersionParser('10.1.2:1234:abcde').version()).toMatchObject({
    major: 10,
    minor: 1,
    revision: 2,
    build: 1234,
    sha: 'abcde' as Sha,
  });
});

test('app version parsing with commit time', () => {
  safeExpect(new AppVersionParser('10.1.2:1234:abcde:123').version()).toMatchObject({
    major: 10,
    minor: 1,
    revision: 2,
    build: 1234,
    commitTime: 123,
    sha: 'abcde' as Sha,
  });
});

test.each(['web', 'native'] as VersionChannels[])('version parsing with channel %j', channel => {
  safeExpect(new AppVersionParser(`10.1.2:1234:abcde:123:${channel}`).version()).toMatchObject({
    major: 10,
    minor: 1,
    revision: 2,
    build: 1234,
    commitTime: 123,
    channel,
    sha: 'abcde' as Sha,
  });
});

test('app version parsing with missing values', () => {
  safeExpect(new AppVersionParser('1.0::::web').version()).toMatchObject({
    major: 1,
    minor: 0,
    channel: 'web',
  });
});

test('creates versions', () => {
  safeExpect(AppVersionParser.toString({ major: 1 })).toEqual('v1.0.0::::');
  safeExpect(AppVersionParser.toString({ major: 1, minor: 2 })).toEqual('v1.2.0::::');
  safeExpect(AppVersionParser.toString({ major: 1, minor: 2, revision: 3 })).toEqual('v1.2.3::::');
  safeExpect(AppVersionParser.toString({ major: 1, minor: 2, revision: 3, build: 4 })).toEqual('v1.2.3:4:::');
  safeExpect(AppVersionParser.toString({ major: 1, minor: 2, revision: 3, build: 4, sha: 'sha' })).toEqual(
    'v1.2.3:4:sha::'
  );
  safeExpect(
    AppVersionParser.toString({ major: 1, minor: 2, revision: 3, build: 4, sha: 'sha', commitTime: 5 })
  ).toEqual('v1.2.3:4:sha:5:');
  safeExpect(
    AppVersionParser.toString({ major: 1, minor: 2, revision: 3, build: 4, sha: 'sha', commitTime: 5, channel: 'web' })
  ).toEqual('v1.2.3:4:sha:5:web');
});
