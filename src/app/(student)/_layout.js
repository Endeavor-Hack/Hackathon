// src/app/(student)/_layout.js
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../../theme/colors";

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function StudentTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Feed", tabBarIcon: (p) => <TabIcon emoji="🏠" {...p} /> }} />
      <Tabs.Screen name="connections" options={{ title: "Connections", tabBarIcon: (p) => <TabIcon emoji="🤝" {...p} /> }} />
      <Tabs.Screen name="opportunities" options={{ title: "Opportunities", tabBarIcon: (p) => <TabIcon emoji="💼" {...p} /> }} />
      <Tabs.Screen name="notifications" options={{ title: "Notifications", tabBarIcon: (p) => <TabIcon emoji="🔔" {...p} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: (p) => <TabIcon emoji="👤" {...p} /> }} />
    </Tabs>
  );
}
