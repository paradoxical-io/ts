import { Brand } from './brands';
import { EpochMS } from './date';

export type DoOnceResponse<T> =
  | {
      didAction: true;
      at?: EpochMS;
      actionResponse: T;
    }
  | {
      didAction: false;
    };

export type DoOnceActionKey = Brand<string, 'DoOnceActionKey'>;
