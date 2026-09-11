// A fire-themed loader that only shows up if a screen is genuinely
// slow. For the first `delayMs` (500ms by default) it renders
// nothing, so a fast load still feels instant — no flash of loader.
// If we're still waiting after that, it fades in.
//
// The animation itself:
//   • Three warm glow discs behind the flame, each pulsing on its
//     own period so the glow flickers instead of ticking like a
//     heartbeat.
//   • The flame gently "breathes" (scale) and rocks a few degrees.
//   • A caption underneath cycles through short reassuring phrases.
//
// Everything uses React Native's built-in Animated API with
// useNativeDriver: true, so it doesn't compete for the JS thread
// while whatever's actually slow is loading.
import { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { colors, spacing } from "../theme/colors";

const LOGO_SRC = require("../assets/images/logo.png");

const DEFAULT_CAPTIONS = [
  "Stoking the fire…",
  "Warming things up…",
  "Almost there…",
];

export default function FireLoader({
  delayMs = 500,
  size = 96,
  captions = DEFAULT_CAPTIONS,
  showCaption = true,
}) {
  const [visible, setVisible] = useState(false);
  const [captionIndex, setCaptionIndex] = useState(0);

  // Animated values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const flickerA = useRef(new Animated.Value(0)).current;
  const flickerB = useRef(new Animated.Value(0)).current;
  const flickerC = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  // Delayed reveal
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  useEffect(() => {
    if (!visible) return;

    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Gentle "breathing" on the mark — 1.0 ↔ 1.08 scale, ~1.5 s cycle.
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    // Three offset pulses on the glow layers — different durations so
    // they don't sync up. This is what makes the glow read as fire
    // rather than a heartbeat.
    startFlicker(flickerA, 1200);
    startFlicker(flickerB, 1700);
    startFlicker(flickerC, 900);

    // Subtle rotation — 6° swing over ~2 s, so it feels like the flame
    // is dancing without spinning outright.
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [visible]);

  // Cycle captions every 2.5 s
  useEffect(() => {
    if (!visible || !showCaption) return;
    const iv = setInterval(
      () => setCaptionIndex((i) => (i + 1) % captions.length),
      2500,
    );
    return () => clearInterval(iv);
  }, [visible, showCaption, captions.length]);

  if (!visible) return null;

  const markScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const markRotate = rotate.interpolate({ inputRange: [-1, 1], outputRange: ["-3deg", "3deg"] });

  const glowScale = (val) => val.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.35] });
  const glowOpacity = (val) => val.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.05] });

  const glowSize = size * 1.6;

  return (
    <Animated.View style={[styles.wrap, { opacity: fadeIn }]}>
      <View style={{ width: size * 1.7, height: size * 1.7, justifyContent: "center", alignItems: "center" }}>
        {/* Warm glow layers — biggest / most red at the back */}
        <Animated.View
          style={[styles.glow, {
            width: glowSize, height: glowSize, borderRadius: glowSize / 2,
            backgroundColor: colors.accent2, // deep red
            transform: [{ scale: glowScale(flickerA) }],
            opacity: glowOpacity(flickerA),
          }]}
        />
        <Animated.View
          style={[styles.glow, {
            width: glowSize * 0.85, height: glowSize * 0.85, borderRadius: glowSize / 2,
            backgroundColor: colors.accent, // orange
            transform: [{ scale: glowScale(flickerB) }],
            opacity: glowOpacity(flickerB),
          }]}
        />
        <Animated.View
          style={[styles.glow, {
            width: glowSize * 0.6, height: glowSize * 0.6, borderRadius: glowSize / 2,
            backgroundColor: colors.warn, // amber core
            transform: [{ scale: glowScale(flickerC) }],
            opacity: glowOpacity(flickerC),
          }]}
        />

        {/* The mark itself */}
        <Animated.Image
          source={LOGO_SRC}
          style={{
            width: size,
            height: size,
            resizeMode: "contain",
            transform: [{ scale: markScale }, { rotate: markRotate }],
          }}
        />
      </View>

      {showCaption && (
        <Text style={styles.caption}>{captions[captionIndex]}</Text>
      )}
    </Animated.View>
  );
}

function startFlicker(value, duration) {
  Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: duration * 0.9, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]),
  ).start();
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute" },
  caption: {
    color: colors.textDim, fontSize: 13, marginTop: spacing.md,
    letterSpacing: 0.3, fontStyle: "italic",
  },
});
