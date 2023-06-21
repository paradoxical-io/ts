import { AppVersion, notNullOrUndefined, VersionChannels } from '@paradox/types';

import { asBrandSafe } from './brands';

const Channels: VersionChannels[] = ['native', 'web'];
export class AppVersionParser {
  constructor(private rawVersion: string) {}

  version(): AppVersion {
    const [version, build, sha, commitTime, channel] = this.rawVersion.split(':');
    const [major, minor, revision] = version?.split('.');

    return {
      major: this.toNumber(major?.replace('v', '')),
      minor: this.toNumber(minor),
      revision: this.toNumber(revision),
      build: this.toNumber(build),
      sha: sha?.length > 0 ? asBrandSafe(sha) : undefined,
      commitTime: asBrandSafe(this.toNumber(commitTime)),
      channel: Channels.includes(channel as VersionChannels) ? (channel as VersionChannels) : undefined,
    };
  }

  private toNumber(s?: string): number | undefined {
    if (!notNullOrUndefined(s)) {
      return undefined;
    }

    if (s?.length === 0) {
      return undefined;
    }

    const result = Number.parseInt(s, 10);
    if (Number.isNaN(result)) {
      return undefined;
    }

    return result;
  }

  static toString(version: Omit<AppVersion, 'note'>) {
    return [
      `v${version.major ?? 0}.${version.minor ?? 0}.${version.revision ?? 0}`,
      version.build,
      version.sha ?? '',
      version.commitTime ?? '',
      version.channel,
    ].join(':');
  }
}
