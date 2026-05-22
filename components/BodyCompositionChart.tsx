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
import type { BodyCompPoint, BodyCompTimeRange } from '@/hooks/use-health-history';

const PAD_L = 48;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;
const CHART_H = 160;
const INNER_H = CHART_H - PAD_T - PAD_B;

const RANGES: { label: string; value: BodyCompTimeRange }[] = [
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
];

interface Props {
  points: BodyCompPoint[];
  isLoading: boolean;
  timeRange: BodyCompTimeRange;
  onTimeRangeChange: (r: BodyCompTimeRange) => void;
}

export function BodyCompositionChart({ points, isLoading, timeRange, onTimeRangeChange }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const innerW = screenWidth - 32 - PAD_L - PAD_R;
  const svgW = screenWidth - 32;

  const { weightPts, leanPts, yLabels, xLabels, hasLean } = useMemo(() => {
    if (points.length === 0) {
      return { weightPts: [], leanPts: [], yLabels: [], xLabels: [], hasLean: false };
    }

    const weightVals = points.map((p) => p.weight);
    const leanVals = points.filter((p) => p.leanMass != null).map((p) => p.leanMass!);
    const allVals = [...weightVals, ...leanVals];
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const pad = Math.max((rawMax - rawMin) * 0.1, 5);
    const yMin = Math.floor((rawMin - pad) / 5) * 5;
    const yMax = Math.ceil((rawMax + pad) / 5) * 5;
    const yRange = yMax - yMin || 1;

    const timestamps = points.map((p) => new Date(p.date).getTime());
    const xMin = Math.min(...timestamps);
    const xMax = Math.max(...timestamps);
    const xRange = xMax - xMin || 1;

    const xs = (ts: number) => PAD_L + ((ts - xMin) / xRange) * innerW;
    const ys = (val: number) => PAD_T + INNER_H - ((val - yMin) / yRange) * INNER_H;

    const weightPts = points.map((p) => ({ x: xs(new Date(p.date).getTime()), y: ys(p.weight) }));
    const leanPts = points
      .filter((p) => p.leanMass != null)
      .map((p) => ({ x: xs(new Date(p.date).getTime()), y: ys(p.leanMass!) }));

    const yLabels = [0, 1, 2, 3, 4].map((i) => {
      const val = yMin + (i / 4) * (yMax - yMin);
      return { label: Math.round(val).toString(), y: ys(val) };
    });

    const xLabels = [0, 1, 2, 3].map((i) => {
      const ts = xMin + (i / 3) * xRange;
      const d = new Date(ts);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        x: xs(ts),
      };
    });

    return { weightPts, leanPts, yLabels, xLabels, hasLean: leanPts.length >= 2 };
  }, [points, innerW]);

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
          <ActivityIndicator color="#007AFF" />
        </View>
      ) : points.length === 0 ? (
        <View style={styles.placeholder}>
          <Text style={styles.emptyText}>No weight data in this period</Text>
        </View>
      ) : (
        <>
          <Svg width={svgW} height={CHART_H}>
            {yLabels.map((l, i) => (
              <Line
                key={i}
                x1={PAD_L}
                y1={l.y}
                x2={PAD_L + innerW}
                y2={l.y}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
            ))}
            {yLabels.map((l, i) => (
              <SvgText key={i} x={PAD_L - 6} y={l.y + 4} textAnchor="end" fontSize={10} fill="#bbb">
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
                fill="#bbb"
              >
                {l.label}
              </SvgText>
            ))}
            {hasLean && (
              <Polyline
                points={leanPts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#34C759"
                strokeWidth="2"
                strokeDasharray="5,3"
                strokeLinejoin="round"
              />
            )}
            {weightPts.length >= 2 ? (
              <Polyline
                points={weightPts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#007AFF"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            ) : (
              <Circle
                cx={weightPts[0]?.x ?? PAD_L}
                cy={weightPts[0]?.y ?? PAD_T + INNER_H / 2}
                r={5}
                fill="#007AFF"
              />
            )}
          </Svg>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#007AFF' }]} />
              <Text style={styles.legendText}>Weight</Text>
            </View>
            {hasLean && (
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#34C759' }]} />
                <Text style={styles.legendText}>Lean Mass</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rangeRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  rangeBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#3A3A3C' },
  rangeBtnActive: { backgroundColor: '#007AFF' },
  rangeBtnText: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },
  rangeBtnTextActive: { color: '#fff' },
  placeholder: { height: CHART_H, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#636366', fontSize: 14 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 16, height: 2.5, borderRadius: 1 },
  legendText: { fontSize: 12, color: '#8E8E93' },
});
