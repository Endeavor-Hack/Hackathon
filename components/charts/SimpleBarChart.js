// components/charts/SimpleBarChart.js
// Hand-rolled SVG bar chart. Avoids pulling in victory-native's Skia
// dependency (heavy on RN Web) — for the dashboards' modest needs a
// simple react-native-svg drawing is plenty.
import { View, Text } from "react-native";
import Svg, { Rect, Text as SvgText, Line, G } from "react-native-svg";
import { colors } from "../../theme/colors";

export default function SimpleBarChart({ data, width = 300, height = 180, color = colors.accent }) {
  if (!data.length) return <Text style={{ color: colors.textDim }}>No data yet.</Text>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const padding = { left: 24, right: 8, top: 8, bottom: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barW = chartW / data.length - 6;

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke={colors.border} strokeWidth="1" />
        {data.map((d, i) => {
          const h = (d.value / max) * chartH;
          const x = padding.left + i * (chartW / data.length) + 3;
          const y = padding.top + chartH - h;
          return (
            <G key={i}>
              <Rect x={x} y={y} width={barW} height={h} fill={color} rx={4} />
              <SvgText x={x + barW / 2} y={padding.top + chartH + 14} fill={colors.textDim} fontSize="10" textAnchor="middle">
                {d.label}
              </SvgText>
              <SvgText x={x + barW / 2} y={y - 4} fill={colors.text} fontSize="10" textAnchor="middle">
                {d.value}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
