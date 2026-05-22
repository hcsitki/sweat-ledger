export interface ParsedSet {
  setNumber: number;
  weightLbs: number;
  reps: number;
}

export interface ParsedExercise {
  name: string;
  sets: ParsedSet[];
}

export interface ParsedWorkout {
  name: string;
  startedAt: number;
  durationSeconds: number;
  exercises: ParsedExercise[];
}

function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i <= line.length) {
    if (i === line.length) break;

    if (line[i] === '"') {
      let j = i + 1;
      let value = '';
      while (j < line.length) {
        if (line[j] === '"' && line[j + 1] === '"') {
          value += '"';
          j += 2;
        } else if (line[j] === '"') {
          j++;
          break;
        } else {
          value += line[j];
          j++;
        }
      }
      fields.push(value);
      i = j;
      if (i < line.length && line[i] === ',') i++;
    } else {
      let j = i;
      while (j < line.length && line[j] !== ',') j++;
      fields.push(line.slice(i, j));
      i = j;
      if (i < line.length && line[i] === ',') i++;
    }
  }

  return fields;
}

function parseDurationSeconds(str: string): number {
  const hourMatch = str.match(/(\d+)\s*h/);
  const minMatch = str.match(/(\d+)\s*m(?!s)/);
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  return hours * 3600 + mins * 60;
}

export function parseStrongCSV(csvText: string): ParsedWorkout[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // header: Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,RPE
  const rows = lines.slice(1).map(parseCSVRow);

  const workoutMap = new Map<
    string,
    {
      name: string;
      startedAt: number;
      durationSeconds: number;
      exerciseMap: Map<string, ParsedSet[]>;
    }
  >();

  for (const row of rows) {
    const [dateStr, workoutName, duration, exerciseName, setOrderStr, weightStr, repsStr] = row;
    if (!dateStr || !workoutName || !exerciseName) continue;

    if (!workoutMap.has(dateStr)) {
      const startedAt = new Date(dateStr).getTime();
      if (isNaN(startedAt)) continue;
      workoutMap.set(dateStr, {
        name: workoutName,
        startedAt,
        durationSeconds: parseDurationSeconds(duration ?? ''),
        exerciseMap: new Map(),
      });
    }

    const workout = workoutMap.get(dateStr)!;
    if (!workout.exerciseMap.has(exerciseName)) {
      workout.exerciseMap.set(exerciseName, []);
    }

    const setNumber = parseInt(setOrderStr ?? '0', 10);
    const weightLbs = parseFloat(weightStr ?? '0');
    const reps = parseInt(repsStr ?? '0', 10);

    if (!isNaN(setNumber) && !isNaN(reps) && reps > 0) {
      workout.exerciseMap.get(exerciseName)!.push({
        setNumber,
        weightLbs: isNaN(weightLbs) ? 0 : weightLbs,
        reps,
      });
    }
  }

  return Array.from(workoutMap.values())
    .map((w) => ({
      name: w.name,
      startedAt: w.startedAt,
      durationSeconds: w.durationSeconds,
      exercises: Array.from(w.exerciseMap.entries()).map(([name, sets]) => ({ name, sets })),
    }))
    .sort((a, b) => a.startedAt - b.startedAt);
}
