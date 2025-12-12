import { EpochMS, Milliseconds } from '@paradoxical-io/types';
import { EpochSeconds } from '@paradoxical-io/types/dist/date';
import {
  addDays,
  addHours,
  addMilliseconds,
  addMinutes,
  addMonths,
  addSeconds,
  addYears,
  endOfDay,
  endOfHour,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';

import { asMilli, TimeUnit } from './conversions';

export interface TimeProvider {
  epochMS: () => EpochMS;
  epochSec: () => EpochSeconds;
}

export function defaultTimeProvider(): TimeProvider {
  return {
    epochMS: () => Date.now() as EpochMS,
    epochSec: () => Math.floor(Date.now() / 1000) as EpochSeconds,
  };
}

export function secondsToMilliSeconds(s: number): Milliseconds {
  return (s * 1e3) as Milliseconds;
}

export function nanoSecondsToMilliSeconds(ns: number): Milliseconds {
  return (ns / 1e6) as Milliseconds;
}

/**
 * Converts hrtime to milliseconds
 */
export function preciseTimeMilli() {
  const [seconds, nanoseconds] = process.hrtime();
  return secondsToMilliSeconds(seconds) + nanoSecondsToMilliSeconds(nanoseconds);
}

export interface TimeAdder {
  addHours(n: number): EpochMS;
  addDays(n: number): EpochMS;
  addMinutes(n: number): EpochMS;
  addSeconds(n: number): EpochMS;
  addMilli(n: number): EpochMS;
  addMonths(n: number): EpochMS;
  addYears(n: number): EpochMS;
}

/**
 * Utility function to add time to a provided time value. Use a negative number n to subtract time. Valid utilities are:
 * - addDays
 * - addHours
 * - addMinutes
 * - addMonths
 * - addSeconds
 * - addYears
 * @param now
 */
export function timeAdder(now: number): TimeAdder {
  return {
    addDays: (n: number) => addDays(new Date(now), n).getTime() as EpochMS,
    addHours: (n: number) => addHours(new Date(now), n).getTime() as EpochMS,
    addMilli: (n: number) => addMilliseconds(new Date(now), n).getTime() as EpochMS,
    addMinutes: (n: number) => addMinutes(new Date(now), n).getTime() as EpochMS,
    addSeconds: (n: number) => addSeconds(new Date(now), n).getTime() as EpochMS,
    addMonths: (n: number) => addMonths(new Date(now), n).getTime() as EpochMS,
    addYears: (n: number) => addYears(new Date(now), n).getTime() as EpochMS,
  };
}

export interface TimeEndOf {
  endOfDay: () => EpochMS;
  endOfHour: () => EpochMS;
  endOfMonth: () => EpochMS;
  endOfWeek: () => EpochMS;
  endOfYear: () => EpochMS;
}

export interface TimeStartOf {
  startOfDay: () => EpochMS;
  startOfHour: () => EpochMS;
  startOfMonth: () => EpochMS;
  startOfWeek: () => EpochMS;
  startOfYear: () => EpochMS;
}

/**
 * Utility function to get the end of a particular time interval from the provided time value. Valid utilities are:
 * - endOfDay
 * - endOfHour
 * - endOfMonth
 * - endOfWeek
 * - endOfYear
 * @param now
 */
export function timeEndOf(now: number): TimeEndOf {
  return {
    endOfDay: () => endOfDay(now).getTime() as EpochMS,
    endOfHour: () => endOfHour(now).getTime() as EpochMS,
    endOfMonth: () => endOfMonth(now).getTime() as EpochMS,
    endOfWeek: () => endOfWeek(now).getTime() as EpochMS,
    endOfYear: () => endOfYear(now).getTime() as EpochMS,
  };
}

/**
 * Utility function to get the start of a particular time interval from the provided time value. Valid utilities are:
 * - startOfDay
 * - startOfHour
 * - startOfMonth
 * - startOfWeek
 * - startOfYear
 * @param now
 */
export function timeStartOf(now: number): TimeStartOf {
  return {
    startOfDay: () => startOfDay(now).getTime() as EpochMS,
    startOfHour: () => startOfHour(now).getTime() as EpochMS,
    startOfMonth: () => startOfMonth(now).getTime() as EpochMS,
    startOfWeek: () => startOfWeek(now).getTime() as EpochMS,
    startOfYear: () => startOfYear(now).getTime() as EpochMS,
  };
}

export function isExpired(start: EpochMS, expirationDuration: number, unit: TimeUnit, time = defaultTimeProvider()) {
  const expiresAt = start + asMilli(expirationDuration, unit);

  // now is past the expiration
  return time.epochMS() >= expiresAt;
}
