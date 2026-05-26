import { useCallback, useEffect, useState } from 'react';
import { initHealthKit, getLatestWeight, getLatestBodyFat, getLatestHeight } from '@/services/health';

interface HealthData {
  weightLbs: number | null;
  bodyFatPercent: number | null;
  heightM: number | null;
  isAuthorized: boolean;
  isLoading: boolean;
  // true once initHealthKit has completed at least once — distinguishes
  // "loading for the first time" from "tried and was denied"
  hasAttempted: boolean;
  refresh: () => void;
}

export function useHealthData(): HealthData {
  const [weightLbs, setWeightLbs] = useState<number | null>(null);
  const [bodyFatPercent, setBodyFatPercent] = useState<number | null>(null);
  const [heightM, setHeightM] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAttempted, setHasAttempted] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const ok = await initHealthKit();
      setIsAuthorized(ok);
      if (ok) {
        const [weight, bodyFat, height] = await Promise.all([
          getLatestWeight(),
          getLatestBodyFat(),
          getLatestHeight(),
        ]);
        setWeightLbs(weight);
        setBodyFatPercent(bodyFat);
        setHeightM(height);
      }
    } catch {
      // Native module unavailable or threw — treated as not authorized
    } finally {
      setHasAttempted(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { weightLbs, bodyFatPercent, heightM, isAuthorized, isLoading, hasAttempted, refresh: load };
}
