import { useCallback, useEffect, useState } from 'react';
import { getWeightSamples, getBodyFatSamples, type HealthSample } from '@/services/health';

export type BodyCompTimeRange = '1m' | '3m' | '6m' | '1y';

export interface BodyCompPoint {
  date: string;
  weight: number;
  leanMass: number | null;
}

export interface Delta30d {
  weightDelta: number | null;
  bfDelta: number | null;
  leanMassDelta: number | null;
}

interface HealthHistoryState {
  points: BodyCompPoint[];
  weightSamples30d: HealthSample[];
  bfSamples: HealthSample[];
  delta30d: Delta30d;
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
  const [weightSamples30d, setWeightSamples30d] = useState<HealthSample[]>([]);
  const [bfSamples, setBfSamples] = useState<HealthSample[]>([]);
  const [delta30d, setDelta30d] = useState<Delta30d>({
    weightDelta: null,
    bfDelta: null,
    leanMassDelta: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    try {
      const now = new Date();
      const rangeDays = RANGE_DAYS[timeRange];
      // Fetch at least 31 days so we always have a 30d comparison point,
      // even when the user is on the 1m view.
      const fetchDays = Math.max(rangeDays, 31);
      const rangeStart = new Date(Date.now() - rangeDays * 86_400_000);
      const fetchStart = new Date(Date.now() - fetchDays * 86_400_000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

      const [allWeights, allBf] = await Promise.all([
        getWeightSamples(fetchStart, now),
        getBodyFatSamples(fetchStart, now),
      ]);

      // Points for the body composition chart (time-range filtered)
      const rangeWeights = allWeights.filter((s) => new Date(s.date) >= rangeStart);
      const rangeBf = allBf.filter((s) => new Date(s.date) >= rangeStart);
      setPoints(buildPoints(rangeWeights, rangeBf));

      // Raw weight samples for the last 30 days (sparkline)
      const cutoff30d = new Date(Date.now() - 30 * 86_400_000);
      setWeightSamples30d(allWeights.filter((s) => new Date(s.date) >= cutoff30d));

      // BF samples for the selected time range (body fat chart)
      setBfSamples(rangeBf);

      // 30d deltas — find the value closest to exactly 30 days ago
      const weightAt30d = nearestSampleToDate(thirtyDaysAgo, allWeights);
      const bfAt30d = nearestSampleToDate(thirtyDaysAgo, allBf);
      const latestWeight = allWeights.at(-1)?.value ?? null;
      const latestBf = allBf.at(-1)?.value ?? null;

      const currentLeanMass =
        latestWeight != null && latestBf != null
          ? latestWeight * (1 - latestBf / 100)
          : null;
      const leanMassAt30d =
        weightAt30d != null && bfAt30d != null
          ? weightAt30d * (1 - bfAt30d / 100)
          : null;

      setDelta30d({
        weightDelta: latestWeight != null && weightAt30d != null ? latestWeight - weightAt30d : null,
        bfDelta: latestBf != null && bfAt30d != null ? latestBf - bfAt30d : null,
        leanMassDelta:
          currentLeanMass != null && leanMassAt30d != null
            ? currentLeanMass - leanMassAt30d
            : null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, timeRange]);

  useEffect(() => {
    void load();
  }, [load]);

  return { points, weightSamples30d, bfSamples, delta30d, isLoading, timeRange, setTimeRange };
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

function nearestSampleToDate(target: Date, samples: HealthSample[]): number | null {
  if (samples.length === 0) return null;
  const targetMs = target.getTime();
  const WEEK_MS = 7 * 86_400_000;
  let best: HealthSample | null = null;
  let bestDiff = Infinity;
  for (const s of samples) {
    const diff = Math.abs(new Date(s.date).getTime() - targetMs);
    if (diff < bestDiff && diff <= WEEK_MS) {
      best = s;
      bestDiff = diff;
    }
  }
  return best?.value ?? null;
}
