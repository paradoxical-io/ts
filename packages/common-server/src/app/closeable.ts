export interface Closeable<T> {
  instance: T;

  close(): Promise<void>;
}
