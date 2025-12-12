import {
  CalendarDayType,
  Day,
  Milliseconds,
  Minutes,
  Month,
  Seconds,
  Year,
  YearMonthDayString,
} from '@paradoxical-io/types';
import { EpochMS, EpochSeconds, ISODateString } from '@paradoxical-io/types/dist/date';
import { bottom } from '@paradoxical-io/types/dist/exhaustiveness';

import { leftPad } from '../extensions';
import { secondsToMilliSeconds } from './timeProvider';

export function toEpochSeconds(time: EpochMS): EpochSeconds {
  return Math.floor(time / 1000) as EpochSeconds;
}

export type TimeUnit = 'hours' | 'minutes' | 'seconds' | 'ms' | 'days';

export function asMilli(n: number, unit: TimeUnit): Milliseconds {
  switch (unit) {
    case 'days':
      return secondsToMilliSeconds(n * 60 * 60 * 24);
    case 'hours':
      return secondsToMilliSeconds(n * 60 * 60);
    case 'minutes':
      return secondsToMilliSeconds(n * 60);
    case 'seconds':
      return secondsToMilliSeconds(n);
    case 'ms':
      return n as Milliseconds;
    default:
      return bottom(unit);
  }
}

export function asSeconds(n: number, unit: TimeUnit): Seconds {
  switch (unit) {
    case 'days':
      return (n * 60 * 60 * 24) as Seconds;
    case 'hours':
      return (n * 60 * 60) as Seconds;
    case 'minutes':
      return (n * 60) as Seconds;
    case 'seconds':
      return n as Seconds;
    case 'ms':
      return (n / 1000) as Seconds;
    default:
      return bottom(unit);
  }
}

export function asMinutes(n: number, unit: TimeUnit): Minutes {
  switch (unit) {
    case 'days':
      return (n * 60 * 24) as Minutes;
    case 'hours':
      return (n * 60) as Minutes;
    case 'minutes':
      return n as Minutes;
    case 'seconds':
      return (n / 60) as Minutes;
    case 'ms':
      return (n / 60 / 1000) as Minutes;
    default:
      return bottom(unit);
  }
}

export function calendarDayToISO(day: CalendarDayType): ISODateString {
  return `${day.year}-${day.month < 10 ? `0${day.month}` : day.month}-${
    day.day < 10 ? `0${day.day}` : day.day
  }` as ISODateString;
}

export function isoToCalendarDay(iso: ISODateString): CalendarDayType {
  const date = new Date(Date.parse(iso));

  return {
    year: date.getFullYear() as Year,
    month: (date.getMonth() + 1) as Month,
    day: date.getDate() as Day,
  };
}

export function calendarDayToDate(day: CalendarDayType): Date {
  return new Date(day.year, day.month - 1, day.day);
}

export function dateToCalendarDay(date: Date): CalendarDayType {
  return {
    year: date.getFullYear() as Year,
    month: (date.getMonth() + 1) as Month,
    day: date.getDate() as Day,
  };
}

export function toIsoDateString(d: Date | EpochMS): ISODateString {
  return new Date(d).toISOString() as ISODateString;
}

export function fromIsoDateString(d: ISODateString): EpochMS {
  return Date.parse(d) as EpochMS;
}

export function yearMonthDayToEpoch(birthdate: YearMonthDayString): EpochMS {
  return epoch(new Date(birthdate));
}

export function toYearMonthDayString(d: Date | EpochMS): YearMonthDayString {
  const time = new Date(d);

  return calendarDateToYYYYMMDD({
    day: time.getDate() as Day,
    month: (time.getMonth() + 1) as Month,
    year: time.getFullYear() as Year,
  });
}

export function calendarDateToYYYYMMDD(d: CalendarDayType): YearMonthDayString {
  return `${leftPad(d.year, 4, '0')}-${leftPad(d.month, 2, '0')}-${leftPad(d.day, 2, '0')}` as YearMonthDayString;
}

export function epoch(d: Date): EpochMS {
  return d.getTime() as EpochMS;
}

export function epochNow(): EpochMS {
  return epoch(new Date());
}
