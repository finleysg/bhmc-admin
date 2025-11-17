import {
	getAge,
	getFullName,
} from "../functions/player"
import { PlayerDto } from "../types"

describe('getFullName', () => {
  it('returns full name when both names present', () => {
    const player = { firstName: 'John', lastName: 'Doe' } as PlayerDto;
    expect(getFullName(player)).toBe('John Doe');
  });

  it('returns last name only when first is missing', () => {
    const player = { lastName: 'Doe' } as PlayerDto;
    expect(getFullName(player)).toBe('Doe');
  });

  it('returns first name only when last is missing', () => {
    const player = { firstName: 'John' } as PlayerDto;
    expect(getFullName(player)).toBe('John');
  });

  it('returns empty string when both names missing', () => {
    const player = {} as PlayerDto;
    expect(getFullName(player)).toBe('');
  });

  it('trims whitespace from names', () => {
    const player = { firstName: ' John ', lastName: ' Doe ' } as PlayerDto;
    expect(getFullName(player)).toBe('John Doe');
  });
});

describe('getAge', () => {
  const today = new Date('2023-06-15');

  it('calculates age correctly', () => {
    const player = { birthDate: '1990-06-15' } as PlayerDto;
    const result = getAge(player, today);
    expect(result.age).toBe(33);
    expect(result.eventAge).toBe(33);
    expect(result.calendarAge).toBe(33);
  });

  it('calculates event age with reference date', () => {
    const player: any = { birthDate: '1990-01-01' };
    const referenceDate = new Date('2022-12-31');
    const result = getAge(player, today, referenceDate);
    expect(result.age).toBe(33);
    expect(result.eventAge).toBe(32);
    expect(result.calendarAge).toBe(33);
  });

  it('returns n/a for invalid birth date', () => {
    const player = { birthDate: 'invalid' } as PlayerDto;
    const result = getAge(player, today);
    expect(result).toEqual({ age: 'n/a', eventAge: 'n/a', calendarAge: 'n/a' });
  });

  it('returns n/a for null birth date', () => {
    const player = { birthDate: null } as PlayerDto;
    const result = getAge(player, today);
    expect(result).toEqual({ age: 'n/a', eventAge: 'n/a', calendarAge: 'n/a' });
  });

  it('returns n/a for future birth date', () => {
    const player = { birthDate: '2024-01-01' } as PlayerDto;
    const result = getAge(player, today);
    expect(result).toEqual({ age: 'n/a', eventAge: 'n/a', calendarAge: 'n/a' });
  });

  it('calculates calendar age at end of year', () => {
    const player = { birthDate: '1990-07-01' } as PlayerDto;
    const referenceDate = new Date('2023-01-15');
    const result = getAge(player, today, referenceDate);
    expect(result.calendarAge).toBe(33); // End of 2023 is 33rd year
  });
});
