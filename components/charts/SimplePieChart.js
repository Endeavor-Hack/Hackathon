// components/charts/SimplePieChart.js
import { View, Text } from "react-native";
import Svg, { Path, Text as SvgText, G } from "react-native-svg";
import { colors } from "../../theme/colors";

const PALETTE = ["#F2560A", "#8C1C13", "#22C55E", "#FBBF24", "#3B82F6", "#9AA3BD"];

export default function SimplePieChart({ data, size = 160 }) {
  if (!data.length) return <Text style={{ color: colors.textDim }}>No data yet.</Text>;
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const radius = size / 2 - 4;
  const cx = size / 2, cy = size / 2;
  let acc = 0;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
      <Svg width={size} height={size}>
        {data.map((d, i) => {
          const start = acc;
          const angle = (d.value / total) * Math.PI * 2;
          acc += angle;
          const large = angle > Math.PI ? 1 : 0;
          const x1 = cx + radius * Math.cos(start - Math.PI / 2);
          const y1 = cy + radius * Math.sin(start - Math.PI / 2);
          const x2 = cx + radius * Math.cos(acc - Math.PI / 2);
          const y2 = cy + radius * Math.sin(acc - Math.PI / 2);
          const d1 = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
          return <Path key={i} d={d1} fill={PALETTE[i % PALETTE.length]} />;
        })}
      </Svg>
      <View style={{ marginLeft: 12 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PALETTE[i % PALETTE.length], marginRight: 6 }} />
            <Text style={{ color: colors.text, fontSize: 12 }}>{d.label}: {d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
