// components/charts/SimpleLineChart.js
import { View, Text } from "react-native";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg";
import { colors } from "../../theme/colors";

export default function SimpleLineChart({ data, width = 320, height = 160, color = colors.accent }) {
  if (data.length < 2) return <Text style={{ color: colors.textDim }}>Not enough data yet.</Text>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const padding = { left: 26, right: 8, top: 8, bottom: 22 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - (d.value / max) * chartH;
    return { x, y, d };
  });
  const polyStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke={colors.border} />
        <Polyline points={polyStr} fill="none" stroke={color} strokeWidth="2" />
        {points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
        <SvgText x={padding.left} y={padding.top + chartH + 14} fill={colors.textDim} fontSize="9">{data[0].label}</SvgText>
        <SvgText x={padding.left + chartW} y={padding.top + chartH + 14} fill={colors.textDim} fontSize="9" textAnchor="end">{data[data.length - 1].label}</SvgText>
      </Svg>
    </View>
  );
}
