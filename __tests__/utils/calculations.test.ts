import {
  getElapsedSeconds,
  formatDuration,
  calculateVolume,
  calculateEpley1RM,
} from '../../utils/calculations';

describe('getElapsedSeconds', () => {
  it('returns correct elapsed seconds', () => {
    const startedAt = Date.now() - 5000;
    expect(getElapsedSeconds(startedAt)).toBe(5);
  });

  it('returns 0 for future timestamps', () => {
    expect(getElapsedSeconds(Date.now() + 1000)).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats 0 seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats 90 seconds as 1:30', () => {
    expect(formatDuration(90)).toBe('1:30');
  });

  it('formats 3661 seconds as 1:01:01', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('formats 59 seconds', () => {
    expect(formatDuration(59)).toBe('0:59');
  });

  it('formats 3600 seconds as 1:00:00', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });
});

describe('calculateVolume', () => {
  it('calculates standard volume', () => {
    expect(calculateVolume(225, 5)).toBe(1125);
  });

  it('handles 0 weight (bodyweight)', () => {
    expect(calculateVolume(0, 10)).toBe(0);
  });
});

describe('calculateEpley1RM', () => {
  it('calculates 1RM for valid rep range', () => {
    expect(calculateEpley1RM(100, 10)).toBeCloseTo(133.33);
  });

  it('returns null for more than 15 reps', () => {
    expect(calculateEpley1RM(100, 16)).toBeNull();
  });

  it('returns null for 0 reps', () => {
    expect(calculateEpley1RM(100, 0)).toBeNull();
  });

  it('calculates for exactly 15 reps', () => {
    expect(calculateEpley1RM(100, 15)).toBeCloseTo(150);
  });

  it('calculates for 1 rep', () => {
    expect(calculateEpley1RM(100, 1)).toBeCloseTo(103.33);
  });
});
