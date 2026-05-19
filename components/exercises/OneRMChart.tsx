import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';

interface DataPoint {
  date: number;
  value: number;
}

interface Props {
  data: DataPoint[];
}

const CHART_HEIGHT = 160;
const MARGIN_LEFT = 48;
const MARGIN_RIGHT = 12;
const MARGIN_TOP = 16;
const MARGIN_BOTTOM = 28;

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function OneRMChart({ data }: Props) {
  const { width } = useWindowDimensions();

  if (data.length === 0) return null;

  const totalWidth = width - 32;
  const plotW = totalWidth - MARGIN_LEFT - MARGIN_RIGHT;
  const plotH = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = (rawMax - rawMin) * 0.1 || rawMax * 0.1 || 5;
  const yMin = rawMin - padding;
  const yMax = rawMax + padding;

  function toX(i: number): number {
    if (data.length === 1) return MARGIN_LEFT + plotW / 2;
    return MARGIN_LEFT + (i / (data.length - 1)) * plotW;
  }

  function toY(val: number): number {
    return MARGIN_TOP + plotH - ((val - yMin) / (yMax - yMin)) * plotH;
  }

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');

  const maxLabel = `${Math.round(rawMax)} lbs`;
  const minLabel = `${Math.round(rawMin)} lbs`;

  return (
    <View style={styles.card}>
      <Svg width={totalWidth} height={CHART_HEIGHT}>
        {/* Grid lines */}
        <Line
          x1={MARGIN_LEFT}
          y1={toY(rawMax)}
          x2={MARGIN_LEFT + plotW}
          y2={toY(rawMax)}
          stroke="#e5e5e5"
          strokeWidth={1}
        />
        {rawMin !== rawMax && (
          <Line
            x1={MARGIN_LEFT}
            y1={toY(rawMin)}
            x2={MARGIN_LEFT + plotW}
            y2={toY(rawMin)}
            stroke="#e5e5e5"
            strokeWidth={1}
          />
        )}

        {/* Y-axis labels */}
        <SvgText
          x={MARGIN_LEFT - 4}
          y={toY(rawMax) + 4}
          textAnchor="end"
          fontSize={10}
          fill="#888"
        >
          {maxLabel}
        </SvgText>
        {rawMin !== rawMax && (
          <SvgText
            x={MARGIN_LEFT - 4}
            y={toY(rawMin) + 4}
            textAnchor="end"
            fontSize={10}
            fill="#888"
          >
            {minLabel}
          </SvgText>
        )}

        {/* Trend line */}
        {data.length >= 2 && (
          <Polyline
            points={points}
            fill="none"
            stroke="#007AFF"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Data points */}
        {data.map((d, i) => (
          <Circle key={i} cx={toX(i)} cy={toY(d.value)} r={4} fill="#007AFF" />
        ))}

        {/* X-axis date labels */}
        <SvgText
          x={toX(0)}
          y={CHART_HEIGHT - 6}
          textAnchor="middle"
          fontSize={10}
          fill="#888"
        >
          {formatDateLabel(data[0].date)}
        </SvgText>
        {data.length > 1 && (
          <SvgText
            x={toX(data.length - 1)}
            y={CHART_HEIGHT - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#888"
          >
            {formatDateLabel(data[data.length - 1].date)}
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
