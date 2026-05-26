import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import type { DailyTonnage } from '@/db/queries/history';

const WEEKS = 16;
const LABEL_W = 10;
const LABEL_GAP = 4;
const MONTH_H = 16;
const GRID_X = LABEL_W + LABEL_GAP;
const ROWS = 7;

// Only show M / W / F to avoid clutter in the narrow label column
const DAY_SHOWN: Record<number, string> = { 1: 'M', 3: 'W', 5: 'F' };

const COLORS = {
  empty: '#2C2C2E',
  l1: '#1e3a5f',
  l2: '#2563eb',
  l3: '#60a5fa',
};

interface Cell {
  col: number;
  row: number;
  isFuture: boolean;
  hasWorkout: boolean;
  tonnage: number;
}

interface Props {
  data: DailyTonnage[];
}

export function WorkoutHeatmap({ data }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  // Fit exactly 16 weeks across the available section width (minus horizontal padding)
  const availableW = screenWidth - 32 - GRID_X;
  const CELL = Math.floor((availableW - (WEEKS - 1) * 2) / WEEKS);
  const GAP = 2;
  const STEP = CELL + GAP;
  const GRID_W = WEEKS * STEP - GAP;
  const GRID_H = ROWS * STEP - GAP;
  const SVG_W = GRID_X + GRID_W;
  const SVG_H = MONTH_H + GRID_H;

  const { cells, monthLabels, maxTonnage } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDow = today.getDay();
    const map = new Map(data.map((d) => [d.date, d]));

    const cells: Cell[] = [];
    for (let col = 0; col < WEEKS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const daysFromToday = (WEEKS - 1 - col) * 7 + (todayDow - row);
        if (daysFromToday < 0) {
          cells.push({ col, row, isFuture: true, hasWorkout: false, tonnage: 0 });
          continue;
        }
        const d = new Date(today);
        d.setDate(d.getDate() - daysFromToday);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const entry = map.get(dateStr);
        cells.push({
          col,
          row,
          isFuture: false,
          hasWorkout: entry != null,
          tonnage: entry?.tonnage ?? 0,
        });
      }
    }

    // Month labels: label a column when its Sunday falls in the first 7 days of a month
    const monthLabels: { label: string; col: number }[] = [];
    const seen = new Set<string>();
    for (let col = 0; col < WEEKS; col++) {
      const daysFromTodayForSunday = (WEEKS - 1 - col) * 7 + todayDow;
      const sunday = new Date(today);
      sunday.setDate(sunday.getDate() - daysFromTodayForSunday);
      if (sunday.getDate() <= 7) {
        const key = `${sunday.getFullYear()}-${sunday.getMonth()}`;
        if (!seen.has(key)) {
          seen.add(key);
          monthLabels.push({
            label: sunday.toLocaleDateString('en-US', { month: 'short' }),
            col,
          });
        }
      }
    }

    const maxTonnage = Math.max(...data.map((d) => d.tonnage), 1);
    return { cells, monthLabels, maxTonnage };
  }, [data, CELL]);

  function cellFill(cell: Cell): string {
    if (cell.isFuture || !cell.hasWorkout) return COLORS.empty;
    if (cell.tonnage === 0) return COLORS.l1;
    const r = cell.tonnage / maxTonnage;
    if (r < 0.33) return COLORS.l1;
    if (r < 0.66) return COLORS.l2;
    return COLORS.l3;
  }

  return (
    <View style={styles.container}>
      <Svg width={SVG_W} height={SVG_H}>
        {monthLabels.map((m, i) => (
          <SvgText key={i} x={GRID_X + m.col * STEP} y={MONTH_H - 4} fontSize={9} fill="#636366">
            {m.label}
          </SvgText>
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((row) =>
          DAY_SHOWN[row] ? (
            <SvgText
              key={row}
              x={LABEL_W}
              y={MONTH_H + row * STEP + CELL - 2}
              textAnchor="end"
              fontSize={8}
              fill="#636366"
            >
              {DAY_SHOWN[row]}
            </SvgText>
          ) : null
        )}
        {cells.map((cell, i) => (
          <Rect
            key={i}
            x={GRID_X + cell.col * STEP}
            y={MONTH_H + cell.row * STEP}
            width={CELL}
            height={CELL}
            rx={3}
            fill={cellFill(cell)}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});
