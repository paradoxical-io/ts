import { AppVersion, nullOrUndefined } from '@paradox/types';

export class Features {
  static syncPIIFallback(version?: AppVersion): boolean {
    if (version === undefined) {
      return false;
    }

    return this.lteMajorMinor(version, { major: 3, minor: 7 });
  }

  /**
   * We started collecting the IDFV only in app version 3.4. Versions prior are still collecting and sending
   * IDFA for the device identifier.
   * @param version
   */
  static useAppleIDFV(version?: AppVersion): boolean {
    if (version === undefined) {
      return true;
    }

    return this.gteMajorMinor(version, { major: 3, minor: 4 });
  }

  /**
   * Is the supplied version greater than or equal to the target
   * @param version Supplied version
   * @param target Target version
   */
  static gteMajorMinor(
    version: AppVersion,
    target: {
      major: number;
      minor: number;
      revision?: number;
      commitTime?: number;
    }
  ) {
    // if the major is greater than, can ignore minor
    if (gt(version.major, target.major)) {
      return true;
    }

    // else if its gte both major and minor
    if (gte(version.major, target.major) && gt(version.minor, target.minor)) {
      return true;
    }

    return (
      gte(version.major, target.major) &&
      gte(version.minor, target.minor) &&
      gte(version.revision ?? 0, target.revision ?? 0) &&
      (nullOrUndefined(target.commitTime) || gte(version.commitTime, target.commitTime))
    );
  }

  /**
   * Is the supplied version less than or equal to the target
   * @param version Supplied version
   * @param target Target version
   */
  static lteMajorMinor(
    version: AppVersion,
    target: {
      major: number;
      minor: number;
      revision?: number;
      commitTime?: number;
    }
  ): boolean {
    // if the major is less than, can ignore minor
    if (lt(version.major, target.major)) {
      return true;
    }

    // else if its lte both major and minor
    if (lte(version.major, target.major) && lt(version.minor, target.minor)) {
      return true;
    }

    return (
      lte(version.major, target.major) &&
      lte(version.minor, target.minor) &&
      lte(version.revision ?? 0, target.revision ?? 0) &&
      (nullOrUndefined(target.commitTime) || lte(version.commitTime, target.commitTime))
    );
  }

  static exactMajorMinor(version: AppVersion, major: number, minor: number) {
    return version.major === major && version.minor === minor;
  }
}

function lte(a: number | undefined, b: number) {
  return a !== undefined && a <= b;
}

function lt(a: number | undefined, b: number) {
  return a !== undefined && a < b;
}

function gte(a: number | undefined, b: number) {
  return a !== undefined && a >= b;
}

function gt(a: number | undefined, b: number) {
  return a !== undefined && a > b;
}
