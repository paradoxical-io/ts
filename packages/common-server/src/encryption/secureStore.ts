/**
 * Interface for secure interactions
 */
export interface SecureStore {
  set(key: string, data: Buffer): Promise<void>;

  exists(key: string, version?: string): Promise<boolean>;

  remove(key: string): Promise<void>;

  get(key: string, version?: string): Promise<Buffer | undefined>;

  versions(key: string): Promise<SecureVersion[]>;
}

export interface SecureVersion {
  version: string;
  lastModified: Date | undefined;
}
