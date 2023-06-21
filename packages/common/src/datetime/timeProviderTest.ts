/* eslint-disable no-return-assign */

import { EpochMS } from '@paradoxical-io/types';
import { EpochSeconds } from '@paradoxical-io/types/dist/date';
import { addMilliseconds } from 'date-fns';
import addDays from 'date-fns/addDays';
import addHours from 'date-fns/addHours';
import addMinutes from 'date-fns/addMinutes';
import addMonths from 'date-fns/addMonths';
import addSeconds from 'date-fns/addSeconds';
import addYears from 'date-fns/addYears';

import { TimeAdder, TimeProvider } from './timeProvider';

export interface TimeSetter {
  setNow(n: number | Date): void;
  reset(): void;
  date(): Date;
}

export function settableTimeProvider(now: number = new Date().getTime()): TimeProvider & TimeSetter & TimeAdder {
  const orig = now;
  let current = orig;
  return {
    addDays: (n: number) => (current = addDays(new Date(current), n).getTime()) as EpochMS,
    addHours: (n: number) => (current = addHours(new Date(current), n).getTime()) as EpochMS,
    addMilli: (n: number) => (current = addMilliseconds(new Date(current), n).getTime()) as EpochMS,
    addMinutes: (n: number) => (current = addMinutes(new Date(current), n).getTime()) as EpochMS,
    addMonths: (n: number) => (current = addMonths(new Date(current), n).getTime()) as EpochMS,
    addSeconds: (n: number) => (current = addSeconds(new Date(current), n).getTime()) as EpochMS,
    addYears: (n: number) => (current = addYears(new Date(current), n).getTime()) as EpochMS,
    date: () => new Date(current),
    epochMS: () => current as EpochMS,
    epochSec: () => Math.floor(current / 1000) as EpochSeconds,
    reset: () => (current = orig),
    setNow: (n: number | Date) => (current = new Date(n).getTime()),
  };
}
