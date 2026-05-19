import { useCallback, useEffect, useState } from 'react';
import { getWeightSamples, getBodyFatSamples, type HealthSample } from '@/services/health';

export type BodyCompTimeRange = '1m' | '3m' | '6m' | '1y';

export interface BodyCompPoint {
  date: string;
  weight: number;
  leanMass: number | null;
}

interface HealthHistoryState {
  points: BodyCompPoint[];
  isLoading: boolean;
  timeRange: BodyCompTimeRange;
  setTimeRange: (r: BodyCompTimeRange) => void;
}

const RANGE_DAYS: Record<BodyCompTimeRange, number> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

export function useHealthHistory(isAuthorized: boolean): HealthHistoryState {
  const [timeRange, setTimeRange] = useState<BodyCompTimeRange>('3m');
  const [points, setPoints] = useState<BodyCompPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    try {
      const end = new Date();
      const start = new Date(Date.now() - RANGE_DAYS[timeRange] * 86_400_000);
      const [weights, bodyFats] = await Promise.all([
        getWeightSamples(start, end),
        getBodyFatSamples(start, end),
      ]);
      setPoints(buildPoints(weights, bodyFats));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, timeRange]);

  useEffect(() => {
    void load();
  }, [load]);

  return { points, isLoading, timeRange, setTimeRange };
}

function buildPoints(weights: HealthSample[], bodyFats: HealthSample[]): BodyCompPoint[] {
  return weights.map((w) => {
    const bf = nearestBodyFat(w.date, bodyFats);
    return {
      date: w.date,
      weight: w.value,
      leanMass: bf != null ? w.value * (1 - bf / 100) : null,
    };
  });
}

function nearestBodyFat(date: string, samples: HealthSample[]): number | null {
  if (samples.length === 0) return null;
  const target = new Date(date).getTime();
  const WEEK_MS = 7 * 86_400_000;
  let best: HealthSample | null = null;
  let bestDiff = Infinity;
  for (const s of samples) {
    const diff = Math.abs(new Date(s.date).getTime() - target);
    if (diff < bestDiff && diff <= WEEK_MS) {
      best = s;
      bestDiff = diff;
    }
  }
  return best?.value ?? null;
}
