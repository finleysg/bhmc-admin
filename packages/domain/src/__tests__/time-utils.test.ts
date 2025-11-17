import {
	formatTime,
	parseTeeTimeSplits,
	parseTime,
} from "../functions/time-utils"

describe('parseTime', () => {
  it('parses 12-hour AM time correctly', () => {
    expect(parseTime('12:00 AM')).toBe(0);
    expect(parseTime('1:30 AM')).toBe(90);
    expect(parseTime('11:59 AM')).toBe(719);
  });

  it('parses 12-hour PM time correctly', () => {
    expect(parseTime('12:00 PM')).toBe(720);
    expect(parseTime('1:30 PM')).toBe(810);
    expect(parseTime('11:59 PM')).toBe(1439);
  });

  it('throws on invalid hour', () => {
    expect(() => parseTime('13:00 PM')).toThrow('Hour out of range');
    expect(() => parseTime('0:00 AM')).toThrow('Hour out of range');
  });

  it('throws on invalid minute', () => {
    expect(() => parseTime('12:60 AM')).toThrow('Minute out of range');
    expect(() => parseTime('1:-1 PM')).toThrow('Invalid time format');
  });

  it('throws on invalid format', () => {
    expect(() => parseTime('12:00')).toThrow('Invalid time format');
    expect(() => parseTime('12:00 XM')).toThrow('Invalid time format');
    expect(() => parseTime('abc')).toThrow('Invalid time format');
  });

  it('handles lowercase am/pm', () => {
    expect(parseTime('12:00 am')).toBe(0);
    expect(parseTime('12:00 pm')).toBe(720);
  });

  it('trims whitespace', () => {
    expect(parseTime(' 12:00 AM ')).toBe(0);
  });
});

describe('formatTime', () => {
  it('formats minutes to 12-hour time', () => {
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(90)).toBe('1:30 AM');
    expect(formatTime(719)).toBe('11:59 AM');
    expect(formatTime(720)).toBe('12:00 PM');
    expect(formatTime(810)).toBe('1:30 PM');
    expect(formatTime(1439)).toBe('11:59 PM');
  });

  it('wraps around midnight', () => {
    expect(formatTime(1440)).toBe('12:00 AM');
    expect(formatTime(1500)).toBe('1:00 AM');
  });

  it('handles negative minutes by wrapping', () => {
    expect(formatTime(-60)).toBe('11:00 PM');
  });

  it('pads minutes with zero', () => {
    expect(formatTime(60)).toBe('1:00 AM');
    expect(formatTime(61)).toBe('1:01 AM');
  });
});

describe('parseTeeTimeSplits', () => {
  it('parses single split', () => {
    expect(parseTeeTimeSplits('9')).toEqual([9]);
  });

  it('parses multiple splits', () => {
    expect(parseTeeTimeSplits('8,9')).toEqual([8, 9]);
    expect(parseTeeTimeSplits('10,15,20')).toEqual([10, 15, 20]);
  });

  it('trims whitespace and filters empty', () => {
    expect(parseTeeTimeSplits(' 8 , 9 ')).toEqual([8, 9]);
    expect(parseTeeTimeSplits('8,,9')).toEqual([8, 9]);
  });

  it('throws on missing splits', () => {
    expect(() => parseTeeTimeSplits(null)).toThrow('Missing tee time splits');
    expect(() => parseTeeTimeSplits(undefined)).toThrow('Missing tee time splits');
    expect(() => parseTeeTimeSplits('')).toThrow('Missing tee time splits');
  });

  it('throws on invalid values', () => {
    expect(() => parseTeeTimeSplits('0')).toThrow('Invalid tee time split value');
    expect(() => parseTeeTimeSplits('-1')).toThrow('Invalid tee time split value');
    expect(() => parseTeeTimeSplits('abc')).toThrow('Invalid tee time split value');
  });

  it('floors decimal values', () => {
    expect(parseTeeTimeSplits('9.5')).toEqual([9]);
  });
});
