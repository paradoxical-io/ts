import { AppVersions } from './version';
import { AppVersionParser } from './versionParser';

test.each([
  ['3.0.0', '2.12.0', false, true, false],
  ['3.0.0', '3.1.0', true, false, false],
  ['3.0.0', '3.0.0', false, false, true],
  ['3.0.0', '3.0.2', true, false, false],
  ['3.0.2', '3.0.1', false, true, false],
  ['2.11.0', '2.12.0', true, false, false],
  ['2.12.5', '2.11.16', false, true, false],
])(
  'version comparisons',
  (versionString: string, otherVersionString: string, lessThan: boolean, greaterThan: boolean, equals: boolean) => {
    const version = new AppVersionParser(versionString).version();
    const otherVersion = new AppVersionParser(otherVersionString).version();

    expect(AppVersions.lessThan(version, otherVersion)).toEqual(lessThan);
    expect(AppVersions.greaterThan(version, otherVersion)).toEqual(greaterThan);
    expect(AppVersions.equals(version, otherVersion)).toEqual(equals);
  }
);
