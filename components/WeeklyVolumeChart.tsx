import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import type { WeeklyTonnage } from '@/db/queries/history';

const PAD_T = 8;
const PAD_B = 28;
const PAD_L = 52;
const PAD_R = 8;
const CHART_H = 140;
const INNER_H = CHART_H - PAD_T - PAD_B;
const WEEKS = 12;

interface Props {
  data: WeeklyTonnage[];
}

export function WeeklyVolumeChart({ data }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const W = screenWidth - 32;
  const innerW = W - PAD_L - PAD_R;

  const { bars, yTicks } = useMemo(() => {
    if (data.length === 0) return { bars: [], yTicks: [] };

    // Build a full 12-week grid (weeks without workouts get tonnage 0)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map = new Map(data.map((d) => [d.week_start, d.tonnage]));

    const weeks: { label: string; tonnage: number }[] = [];
    for (let i = WEEKS - 1; i >= 0; i--) {
      const monday = new Date(today);
      monday.setDate(monday.getDate() - monday.getDay() + 1 - i * 7);
      const key = monday.toISOString().slice(0, 10);
      const tonnage = map.get(key) ?? 0;
      weeks.push({ label: formatWeekLabel(monday), tonnage });
    }

    const maxT = Math.max(...weeks.map((w) => w.tonnage), 1);
    const barW = Math.max(4, (innerW / WEEKS) - 3);
    const gap = (innerW - barW * WEEKS) / (WEEKS - 1);

    const bars = weeks.map((w, i) => {
      const barH = (w.tonnage / maxT) * INNER_H;
      const x = PAD_L + i * (barW + gap);
      const y = PAD_T + INNER_H - barH;
      return { x, y, w: barW, h: Math.max(barH, w.tonnage > 0 ? 2 : 0), label: w.label, tonnage: w.tonnage };
    });

    // Y-axis: 3 ticks
    const yStep = maxT / 2;
    const yTicks = [0, 1, 2].map((i) => {
      const val = i * yStep;
      return {
        y: PAD_T + INNER_H - (val / maxT) * INNER_H,
        label: formatTonnage(val),
      };
    });

    return { bars, yTicks };
  }, [data, innerW]);

  if (data.length === 0) {
    return <Text style={styles.empty}>No workouts yet</Text>;
  }

  // Show month label when the week crosses a month boundary
  const monthLabels = useMemo(() => {
    const labels: { x: number; label: string }[] = [];
    let lastMonth = -1;
    bars.forEach((b, i) => {
      // Parse the x position back to determine the date — we re-derive from index
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monday = new Date(today);
      monday.setDate(monday.getDate() - monday.getDay() + 1 - (WEEKS - 1 - i) * 7);
      if (monday.getMonth() !== lastMonth) {
        lastMonth = monday.getMonth();
        labels.push({
          x: b.x + b.w / 2,
          label: monday.toLocaleDateString('en-US', { month: 'short' }),
        });
      }
    });
    return labels;
  }, [bars]);

  return (
    <View style={styles.container}>
      <Svg width={W} height={CHART_H}>
        {/* Y grid + labels */}
        {yTicks.map((t, i) => (
          <Line key={i} x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke="#38383A" strokeWidth={1} />
        ))}
        {yTicks.map((t, i) => (
          <SvgText key={i} x={PAD_L - 6} y={t.y + 4} textAnchor="end" fontSize={9} fill="#636366">
            {t.label}
          </SvgText>
        ))}

        {/* Bars */}
        {bars.map((b, i) => (
          <Rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={2}
            fill={b.tonnage > 0 ? '#2563EB' : '#2C2C2E'}
          />
        ))}

        {/* X month labels */}
        {monthLabels.map((l, i) => (
          <SvgText key={i} x={l.x} y={CHART_H - 4} textAnchor="middle" fontSize={9} fill="#636366">
            {l.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function formatWeekLabel(monday: Date): string {
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTonnage(t: number): string {
  if (t === 0) return '0';
  if (t >= 1000) return `${(t / 1000).toFixed(1)}k`;
  return Math.round(t).toString();
}

const styles = StyleSheet.create({
  container: {},
  empty: { color: '#636366', fontSize: 13, fontStyle: 'italic', marginTop: 8 },
});
