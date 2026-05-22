import { useCallback, useEffect, useState } from 'react';
import { initHealthKit, getLatestWeight, getLatestBodyFat } from '@/services/health';

interface HealthData {
  weightLbs: number | null;
  bodyFatPercent: number | null;
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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAttempted, setHasAttempted] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const ok = await initHealthKit();
      setIsAuthorized(ok);
      if (ok) {
        const [weight, bodyFat] = await Promise.all([getLatestWeight(), getLatestBodyFat()]);
        setWeightLbs(weight);
        setBodyFatPercent(bodyFat);
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

  return { weightLbs, bodyFatPercent, isAuthorized, isLoading, hasAttempted, refresh: load };
}
