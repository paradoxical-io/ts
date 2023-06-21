export interface Tags {
  [key: string]: string;
}

export interface MetricEmitter {
  increment(stat: string, value: number, tags?: Tags): void;

  increment(stat: string, tags?: Tags): void;

  asyncTimer<T>(func: (...args: any[]) => Promise<T>, stat: string, tags?: Tags): (...args: any[]) => Promise<T>;

  close(callback: (error?: Error) => void): void;

  gauge(stat: string, value: number, tags?: Tags): void;

  mockBuffer?: string[];

  timing(stat: string, value: number, tags?: Tags): void;
}
