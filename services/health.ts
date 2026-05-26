import { Platform } from 'react-native';
import {
  requestAuthorization,
  getMostRecentQuantitySample,
  queryQuantitySamples,
  saveWorkoutSample,
  isHealthDataAvailable,
  WorkoutActivityType,
} from '@kingstinct/react-native-healthkit';

export interface HealthSample {
  date: string; // YYYY-MM-DD
  value: number;
}

export async function initHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!isHealthDataAvailable()) return false;
  try {
    return await requestAuthorization({
      toShare: ['HKWorkoutTypeIdentifier'],
      toRead: [
        'HKQuantityTypeIdentifierBodyMass',
        'HKQuantityTypeIdentifierBodyFatPercentage',
        'HKQuantityTypeIdentifierHeight',
      ],
    });
  } catch (e) {
    console.warn('[HealthKit] requestAuthorization error:', e);
    return false;
  }
}

export async function getLatestWeight(): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const sample = await getMostRecentQuantitySample(
      'HKQuantityTypeIdentifierBodyMass',
      'lb'
    );
    return sample?.quantity ?? null;
  } catch {
    return null;
  }
}

export async function getLatestBodyFat(): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const sample = await getMostRecentQuantitySample(
      'HKQuantityTypeIdentifierBodyFatPercentage'
    );
    if (sample == null) return null;
    // HealthKit's % unit is a ratio (0.20 = 20%) — convert to display percentage
    return sample.quantity * 100;
  } catch {
    return null;
  }
}

export async function getWeightSamples(start: Date, end: Date): Promise<HealthSample[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
      limit: 0,
      unit: 'lb',
      ascending: true,
      filter: { date: { startDate: start, endDate: end } },
    });
    return samples.map((s) => ({
      date: s.startDate.toISOString().slice(0, 10),
      value: s.quantity,
    }));
  } catch {
    return [];
  }
}

export async function getLatestHeight(): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const sample = await getMostRecentQuantitySample(
      'HKQuantityTypeIdentifierHeight',
      'm'
    );
    return sample?.quantity ?? null;
  } catch {
    return null;
  }
}

export async function getBodyFatSamples(start: Date, end: Date): Promise<HealthSample[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const samples = await queryQuantitySamples(
      'HKQuantityTypeIdentifierBodyFatPercentage',
      {
        limit: 0,
        ascending: true,
        filter: { date: { startDate: start, endDate: end } },
      }
    );
    return samples.map((s) => ({
      date: s.startDate.toISOString().slice(0, 10),
      value: s.quantity * 100,
    }));
  } catch {
    return [];
  }
}

// MET 3.5 is the standard value for Traditional Strength Training
export function estimateCalories(durationSeconds: number, weightLbs: number): number {
  const MET = 3.5;
  const weightKg = weightLbs * 0.453592;
  const durationHours = durationSeconds / 3600;
  return Math.round(MET * weightKg * durationHours);
}

export async function writeStrengthWorkout(
  startedAt: number,
  finishedAt: number,
  _durationSeconds: number,
  caloriesBurned: number | null
): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await saveWorkoutSample(
    WorkoutActivityType.traditionalStrengthTraining,
    [],
    new Date(startedAt),
    new Date(finishedAt),
    caloriesBurned != null ? { energyBurned: caloriesBurned } : undefined
  );
}
