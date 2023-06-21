import { CompoundKey } from '@paradox/types';

export interface PartitionedKeyReaderWriter {
  getValue<T, P extends string>(key: CompoundKey<P, T>): Promise<T | undefined>;

  setValue<T, P extends string>(key: CompoundKey<P, T>, data: T): Promise<void>;
}

export interface PartitionedKeyCounter {
  /**
   * Atomically get a numeric value
   * @param id
   * @param by
   */
  getCounter<P extends string>(id: CompoundKey<P, number>): Promise<number | undefined>;

  /**
   * Atomically increment a value
   * @param id
   * @param by
   */
  incrCounter<P extends string>(id: CompoundKey<P, number>, by?: number): Promise<number | undefined>;

  /**
   * Atomically decrement a value
   * @param id
   * @param by
   */
  decrCounter<P extends string>(id: CompoundKey<P, number>): Promise<number | undefined>;
}
