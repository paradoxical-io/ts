import { Brand } from './brands';
import { notNullOrUndefined } from './nullish';

export type YearString = Brand<string, 'YearString'>;
export type DayString = Brand<string, 'DayString'>;
export type MonthString = Brand<string, 'MonthString'>;

export type Year = Brand<number, 'Year'>;
export type Day = Brand<number, 'Day'>;
export type Month = Brand<number, 'Month'>;

export type EpochMS = Brand<number, 'EpochMS'>;
export type EpochSeconds = Brand<number, 'EpochSeconds'>;
export type ISODateString = Brand<string, 'ISODateString'>;

// YYYY-MM-DD
export type YearMonthDayString = Brand<string, 'YearMonthDayString'>;

export interface TimeRange {
  start: EpochMS;
  end: EpochMS;
}

export function epochSecondsToEpochMS(seconds: EpochSeconds | number): EpochMS {
  return (seconds * 1000) as EpochMS;
}

export function parseTimeRange(cmd: { from?: string; to?: string }): TimeRange | undefined {
  return notNullOrUndefined(cmd.from) && notNullOrUndefined(cmd.to)
    ? { start: new Date(cmd.from).getTime() as EpochMS, end: new Date(cmd.to).getTime() as EpochMS }
    : undefined;
}

export interface CalendarDayType {
  year: Year;
  month: Month;
  day: Day;
}

export enum DayOfWeek {
  Sunday = 'Sunday',
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
  Saturday = 'Saturday',
}

export enum Timezone {
  UTC = 'UTC',
  PST = 'America/Los_Angeles',
}
