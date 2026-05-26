import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { HealthSample } from '@/services/health';

const H = 110;
const PAD_T = 8;
const PAD_B = 20;
const PAD_L = 44;
const PAD_R = 8;
const PLOT_H = H - PAD_T - PAD_B;

interface Props {
  samples: HealthSample[];
  isLoading: boolean;
}

export function WeightSparkline({ samples, isLoading }: Props) {
  const { width } = useWindowDimensions();
  const W = width - 32; // full section width minus horizontal padding
  const PLOT_W = W - PAD_L - PAD_R;

  const { rawPath, avgPath, avgDots, yTicks, xLabels } = useMemo(() => {
    if (samples.length < 2) return { rawPath: '', avgPath: '', avgDots: [], yTicks: [], xLabels: [] };

    const values = samples.map((s) => s.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;

    const toX = (i: number) => PAD_L + (i / (samples.length - 1)) * PLOT_W;
    const toY = (v: number) => PAD_T + PLOT_H - ((v - minV) / range) * PLOT_H;

    // Raw weight path
    const rawPath = samples
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(s.value).toFixed(1)}`)
      .join(' ');

    // 7-day rolling average — for each day, average the nearest 7 samples
    const avgPoints = samples.map((_, i) => {
      const window = samples.slice(Math.max(0, i - 6), i + 1);
      const avg = window.reduce((sum, s) => sum + s.value, 0) / window.length;
      return { x: toX(i), y: toY(avg), avg };
    });

    const avgPath = avgPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    // Dots only on the final 7-day avg point
    const avgDots = [avgPoints[avgPoints.length - 1]];

    // Y-axis ticks: 3 evenly spaced
    const step = range / 2;
    const yTicks = [minV, minV + step, maxV].map((v) => ({
      y: toY(v),
      label: v.toFixed(1),
    }));

    // X-axis labels: first, middle, last date
    const indices = [0, Math.floor((samples.length - 1) / 2), samples.length - 1];
    const xLabels = indices.map((i) => ({
      x: toX(i),
      label: formatDate(samples[i].date),
    }));

    return { rawPath, avgPath, avgDots, yTicks, xLabels };
  }, [samples, PLOT_W]);

  if (isLoading) return <ActivityIndicator style={styles.spinner} />;
  if (samples.length < 2) return <Text style={styles.empty}>Not enough weight data</Text>;

  return (
    <View style={styles.container}>
      <Svg width={W} height={H}>
        {/* Y grid lines */}
        {yTicks.map((t, i) => (
          <Line
            key={i}
            x1={PAD_L}
            y1={t.y}
            x2={W - PAD_R}
            y2={t.y}
            stroke="#38383A"
            strokeWidth={1}
          />
        ))}

        {/* Y labels */}
        {yTicks.map((t, i) => (
          <SvgText
            key={i}
            x={PAD_L - 6}
            y={t.y + 4}
            textAnchor="end"
            fontSize={9}
            fill="#636366"
          >
            {t.label}
          </SvgText>
        ))}

        {/* Raw weight — faint thin line */}
        <Path d={rawPath} stroke="#3A5A7A" strokeWidth={1.5} fill="none" strokeOpacity={0.45} />

        {/* 7-day rolling average — bold blue */}
        <Path d={avgPath} stroke="#60A5FA" strokeWidth={2.5} fill="none" />

        {/* Dot at latest avg */}
        {avgDots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={4} fill="#60A5FA" />
        ))}

        {/* X labels */}
        {xLabels.map((l, i) => (
          <SvgText
            key={i}
            x={l.x}
            y={H - 4}
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
            fontSize={9}
            fill="#636366"
          >
            {l.label}
          </SvgText>
        ))}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#3A5A7A', opacity: 0.5 }]} />
          <Text style={styles.legendLabel}>Daily weight</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#60A5FA' }]} />
          <Text style={styles.legendLabel}>7-day avg</Text>
        </View>
      </View>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  spinner: { marginTop: 24 },
  empty: { color: '#636366', fontSize: 13, fontStyle: 'italic', marginTop: 8 },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 20, height: 2, borderRadius: 1 },
  legendLabel: { fontSize: 11, color: '#8E8E93' },
});
