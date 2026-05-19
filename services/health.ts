import { Platform } from 'react-native';
import AppleHealthKit, {
  type HealthKitPermissions,
  type HealthValue,
} from 'react-native-health';

export interface HealthSample {
  date: string; // YYYY-MM-DD
  value: number;
}

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
    ],
    write: [AppleHealthKit.Constants.Permissions.Workout],
  },
};

export async function initHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (error) => {
      resolve(!error);
    });
  });
}

export async function getLatestWeight(): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  return new Promise((resolve) => {
    AppleHealthKit.getLatestWeight(
      { unit: AppleHealthKit.Constants.Units.pound },
      (error: string, result: HealthValue) => {
        if (error || result == null) {
          resolve(null);
          return;
        }
        resolve(result.value);
      }
    );
  });
}

export async function getLatestBodyFat(): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  return new Promise((resolve) => {
    AppleHealthKit.getLatestBodyFatPercentage(
      {},
      (error: string, result: HealthValue) => {
        if (error || result == null) {
          resolve(null);
          return;
        }
        // HealthKit stores body fat as a decimal (0.20 = 20%)
        resolve(result.value * 100);
      }
    );
  });
}

export async function getWeightSamples(start: Date, end: Date): Promise<HealthSample[]> {
  if (Platform.OS !== 'ios') return [];
  return new Promise((resolve) => {
    AppleHealthKit.getWeightSamples(
      {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        unit: AppleHealthKit.Constants.Units.pound,
        ascending: true,
      },
      (err: string, results: HealthValue[]) => {
        resolve(err || !results ? [] : results.map((r) => ({ date: r.startDate.slice(0, 10), value: r.value })));
      }
    );
  });
}

export async function getBodyFatSamples(start: Date, end: Date): Promise<HealthSample[]> {
  if (Platform.OS !== 'ios') return [];
  return new Promise((resolve) => {
    AppleHealthKit.getBodyFatPercentageSamples(
      { startDate: start.toISOString(), endDate: end.toISOString(), ascending: true },
      (err: string, results: HealthValue[]) => {
        resolve(err || !results ? [] : results.map((r) => ({ date: r.startDate.slice(0, 10), value: r.value * 100 })));
      }
    );
  });
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
  durationSeconds: number,
  caloriesBurned: number | null
): Promise<void> {
  if (Platform.OS !== 'ios') return;
  return new Promise((resolve) => {
    // The TS types for react-native-health don't declare duration/energyBurned
    // but the native module accepts them per the Objective-C implementation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      type: AppleHealthKit.Constants.Activities.TraditionalStrengthTraining,
      startDate: new Date(startedAt).toISOString(),
      endDate: new Date(finishedAt).toISOString(),
      duration: durationSeconds,
      ...(caloriesBurned != null && {
        energyBurned: caloriesBurned,
        energyBurnedUnit: 'kilocalorie',
      }),
    };
    AppleHealthKit.saveWorkout(options, () => resolve());
  });
}
