import { safeExpect } from '@paradoxical-io/common-test';
import { CalendarDayType, Day, EpochMS, ISODateString, Month, Year, YearMonthDayString } from '@paradoxical-io/types';

import {
  asMilli,
  asMinutes,
  asSeconds,
  calendarDateToYYYYMMDD,
  calendarDayToDate,
  calendarDayToISO,
  dateToCalendarDay,
  epoch,
  fromIsoDateString,
  isoDateStringToEpoch,
  isoToCalendarDay,
  toIsoDateString,
  toYearMonthDayString,
  yearMonthDayToEpoch,
} from './conversions';
import { nanoSecondsToMilliSeconds, secondsToMilliSeconds } from './timeProvider';

const tz = 'America/Los_Angeles';

test('ISO date string is converted to an epoch correctly', () => {
  const str = '2020-01-01' as ISODateString;
  expect(isoDateStringToEpoch(str, tz)).toEqual(1577865600000);
});

test('ISO date string in wrong format throws', () => {
  const str = '1/1/2020' as ISODateString;
  expect(() => isoDateStringToEpoch(str, tz)).toThrow();
});

test('seconds to ms', () => {
  expect(secondsToMilliSeconds(1)).toEqual(1000);
  expect(secondsToMilliSeconds(0.5)).toEqual(500);
});

test('ns to ms', () => {
  expect(nanoSecondsToMilliSeconds(1000000)).toEqual(1);
});

test.each([
  [1, 'ms' as const, 1],
  [1, 'seconds' as const, 1e3],
  [1, 'minutes' as const, 6e4],
  [1, 'hours' as const, 3.6e6],
  [1, 'days' as const, 86400000],
])('converts  %j %j into %j ms', (time, unit, ms) => {
  expect(asMilli(time, unit)).toEqual(ms);
});

test.each([
  [1, 'ms' as const, 1 / 1000],
  [1, 'seconds' as const, 1],
  [1, 'minutes' as const, 60],
  [1, 'hours' as const, 60 * 60],
  [1, 'days' as const, 86400],
])('converts %j %j into %j seconds', (time, unit, seconds) => {
  expect(asSeconds(time, unit)).toEqual(seconds);
});

test.each([
  [1, 'ms' as const, 1 / 60 / 1000],
  [1, 'seconds' as const, 1 / 60],
  [1, 'minutes' as const, 1],
  [1, 'hours' as const, 60],
  [1, 'days' as const, 60 * 24],
])('converts  %j %j into %j minutes', (time, unit, minutes) => {
  expect(asMinutes(time, unit)).toEqual(minutes);
});

test('CalendarDayType convert to and from JS Date', () => {
  const day: CalendarDayType = {
    year: 2000 as Year,
    day: 1 as Day,
    month: 1 as Month,
  };

  const asDate = calendarDayToDate(day);

  expect(asDate).toEqual(new Date(Date.parse('2000-01-01')));

  const revert = dateToCalendarDay(asDate);
  expect(revert).toEqual(day);
});

test('CalendarDayType convert to and from ISODateString', () => {
  const zeroPaddedDay: CalendarDayType = {
    year: 2000 as Year,
    day: 1 as Day,
    month: 10 as Month,
  };
  const zeroPaddedMonth: CalendarDayType = {
    year: 2000 as Year,
    day: 10 as Day,
    month: 1 as Month,
  };
  const zeroPaddedDayAndMonth: CalendarDayType = {
    year: 2000 as Year,
    day: 2 as Day,
    month: 2 as Month,
  };
  const noZeroPadding: CalendarDayType = {
    year: 2000 as Year,
    day: 20 as Day,
    month: 12 as Month,
  };

  const zeroPaddedDayString = calendarDayToISO(zeroPaddedDay);
  const zeroPaddedMonthString = calendarDayToISO(zeroPaddedMonth);
  const zeroPaddedDayAndMonthString = calendarDayToISO(zeroPaddedDayAndMonth);
  const noZeroPaddingString = calendarDayToISO(noZeroPadding);

  expect(zeroPaddedDayString).toEqual('2000-10-01');
  expect(zeroPaddedMonthString).toEqual('2000-01-10');
  expect(zeroPaddedDayAndMonthString).toEqual('2000-02-02');
  expect(noZeroPaddingString).toEqual('2000-12-20');

  expect(isoToCalendarDay(zeroPaddedDayString)).toEqual(zeroPaddedDay);
  expect(isoToCalendarDay(zeroPaddedMonthString)).toEqual(zeroPaddedMonth);
  expect(isoToCalendarDay(zeroPaddedDayAndMonthString)).toEqual(zeroPaddedDayAndMonth);
  expect(isoToCalendarDay(noZeroPaddingString)).toEqual(noZeroPadding);
});

test('epoch', () => {
  const e = 1628715218770;
  expect(epoch(new Date(e))).toEqual(e);
});

test('yyyy-mm-dd to epoch', () => {
  expect(yearMonthDayToEpoch('2021-08-01' as YearMonthDayString)).toEqual(1627776000000);
});

test('epoch to yyyy-mm-dd', () => {
  expect(toYearMonthDayString(1627776000000 as EpochMS)).toEqual('2021-08-01');
});

test('to iso date string', () => {
  expect(toIsoDateString(new Date(1628715323190))).toEqual('2021-08-11T20:55:23.190Z');
});

test('from iso date string', () => {
  expect(fromIsoDateString('2021-08-11T20:55:23.190Z' as ISODateString)).toEqual(1628715323190);
});

test('yyyy-mm-dd', () => {
  safeExpect(calendarDateToYYYYMMDD({ day: 1 as Day, month: 1 as Month, year: 1 as Year })).toEqual(
    '0001-01-01' as YearMonthDayString
  );
  safeExpect(calendarDateToYYYYMMDD({ day: 12 as Day, month: 12 as Month, year: 1998 as Year })).toEqual(
    '1998-12-12' as YearMonthDayString
  );
});
