/**
 * Push onto a stack keeping only the last N most recent items
 */
export class MaxStack<T> {
  constructor(private maxSize: number) {}

  private data: T[] = [];

  push(items: T[]): T[] {
    this.data.push(...items);

    if (this.data.length >= this.maxSize) {
      // pop the oldest log off up to the max
      this.data = this.data.slice(this.data.length - this.maxSize);
    }

    return this.data;
  }

  clear() {
    this.data = [];
  }

  clearN(n: number) {
    this.data = this.data.slice(n);
  }

  items(): T[] {
    return this.data;
  }
}
