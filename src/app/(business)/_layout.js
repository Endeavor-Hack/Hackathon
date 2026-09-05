// src/app/(business)/_layout.js
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../../theme/colors";

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function BusinessTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: (p) => <TabIcon emoji="🏠" {...p} /> }} />
      <Tabs.Screen name="candidates" options={{ title: "Candidates", tabBarIcon: (p) => <TabIcon emoji="🔍" {...p} /> }} />
      <Tabs.Screen name="listings" options={{ title: "My Listings", tabBarIcon: (p) => <TabIcon emoji="📋" {...p} /> }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics", tabBarIcon: (p) => <TabIcon emoji="📊" {...p} /> }} />
      <Tabs.Screen name="company" options={{ title: "Company", tabBarIcon: (p) => <TabIcon emoji="🏢" {...p} /> }} />
    </Tabs>
  );
}
