// Shared palette + spacing + type tokens. Import from here instead
// of hard-coding hex values anywhere — a future palette shift then
// happens in this one file, not scattered across 80 stylesheets.

export const colors = {
  bg: "#0A0E1A",
  panel: "#12182B",
  panelLight: "#1B2338",
  accent: "#F2560A",
  accentHover: "#D6440A",
  accent2: "#8C1C13",
  accent2Hover: "#6B140D",
  text: "#F5EDE4",
  textDim: "#9AA3BD",
  good: "#22C55E",
  warn: "#FBBF24",
  border: "#2A3350",
  danger: "#EF4444",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "700", color: colors.text },
  h2: { fontSize: 20, fontWeight: "700", color: colors.text },
  body: { fontSize: 15, color: colors.text },
  bodyDim: { fontSize: 14, color: colors.textDim },
  label: { fontSize: 13, color: colors.textDim, marginBottom: 6 },
};
