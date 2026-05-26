import { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import type { BodyCompTimeRange } from '@/hooks/use-health-history';
import type { HealthSample } from '@/services/health';

const PAD_L = 48;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;
const CHART_H = 150;
const INNER_H = CHART_H - PAD_T - PAD_B;

const RANGES: { label: string; value: BodyCompTimeRange }[] = [
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
];

interface Props {
  samples: HealthSample[];
  isLoading: boolean;
  timeRange: BodyCompTimeRange;
  onTimeRangeChange: (r: BodyCompTimeRange) => void;
}

export function BodyFatChart({ samples, isLoading, timeRange, onTimeRangeChange }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const innerW = screenWidth - 32 - PAD_L - PAD_R;
  const svgW = screenWidth - 32;

  const { pts, yLabels, xLabels } = useMemo(() => {
    if (samples.length === 0) return { pts: [], yLabels: [], xLabels: [] };

    const vals = samples.map((s) => s.value);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const pad = Math.max((rawMax - rawMin) * 0.15, 0.5);
    const yMin = Math.max(0, rawMin - pad);
    const yMax = rawMax + pad;
    const yRange = yMax - yMin || 1;

    const timestamps = samples.map((s) => new Date(s.date).getTime());
    const xMin = Math.min(...timestamps);
    const xMax = Math.max(...timestamps);
    const xRange = xMax - xMin || 1;

    const xs = (ts: number) => PAD_L + ((ts - xMin) / xRange) * innerW;
    const ys = (val: number) => PAD_T + INNER_H - ((val - yMin) / yRange) * INNER_H;

    const pts = samples.map((s) => ({ x: xs(new Date(s.date).getTime()), y: ys(s.value) }));

    const yLabels = [0, 1, 2, 3, 4].map((i) => {
      const val = yMin + (i / 4) * (yMax - yMin);
      return { label: val.toFixed(1) + '%', y: ys(val) };
    });

    const xLabels = [0, 1, 2, 3].map((i) => {
      const ts = xMin + (i / 3) * xRange;
      const d = new Date(ts);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        x: xs(ts),
      };
    });

    return { pts, yLabels, xLabels };
  }, [samples, innerW]);

  return (
    <View>
      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.rangeBtn, timeRange === r.value && styles.rangeBtnActive]}
            onPress={() => onTimeRangeChange(r.value)}
          >
            <Text style={[styles.rangeBtnText, timeRange === r.value && styles.rangeBtnTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.placeholder}>
          <ActivityIndicator color="#FF9F0A" />
        </View>
      ) : samples.length === 0 ? (
        <View style={styles.placeholder}>
          <Text style={styles.emptyText}>No body fat data in this period</Text>
        </View>
      ) : (
        <Svg width={svgW} height={CHART_H}>
          {yLabels.map((l, i) => (
            <Line
              key={i}
              x1={PAD_L}
              y1={l.y}
              x2={PAD_L + innerW}
              y2={l.y}
              stroke="#38383A"
              strokeWidth={1}
            />
          ))}
          {yLabels.map((l, i) => (
            <SvgText key={i} x={PAD_L - 6} y={l.y + 4} textAnchor="end" fontSize={10} fill="#636366">
              {l.label}
            </SvgText>
          ))}
          {xLabels.map((l, i) => (
            <SvgText
              key={i}
              x={l.x}
              y={CHART_H - 4}
              textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}
              fontSize={9}
              fill="#636366"
            >
              {l.label}
            </SvgText>
          ))}
          {pts.length >= 2 ? (
            <Polyline
              points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#FF9F0A"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          ) : (
            <Circle cx={pts[0]?.x ?? PAD_L} cy={pts[0]?.y ?? PAD_T + INNER_H / 2} r={5} fill="#FF9F0A" />
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rangeRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  rangeBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#3A3A3C' },
  rangeBtnActive: { backgroundColor: '#FF9F0A' },
  rangeBtnText: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },
  rangeBtnTextActive: { color: '#fff' },
  placeholder: { height: CHART_H, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#636366', fontSize: 14 },
});
