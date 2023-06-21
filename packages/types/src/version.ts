export interface AppVersion {
  /**
   * semver major
   */
  major?: number;

  /**
   * semver minor
   */
  minor?: number;

  /**
   * semver patch
   */
  revision?: number;

  /**
   * build number injected by xcode/appcenter
   */
  build?: number;

  /**
   * custom note for this version, used for metadata in storage
   */
  note?: string;

  /**
   * git sha for the build
   */
  sha?: string;

  /**
   * git commit timestamp for the build
   */
  commitTime?: number;

  /**
   * The channel the version came from
   */
  channel?: VersionChannels;
}

export type VersionChannels = 'web' | 'native';
