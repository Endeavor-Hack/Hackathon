// Tab bar for admin accounts. Mirrors the admin web panel but sized
// for a phone screen. Content moderation is a hidden sub-screen you
// reach from the Home tab, not a sixth tab — five tabs is already a
// tight fit and moderation is an occasional destination.
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../../theme/colors";

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: (p) => <TabIcon emoji="📊" {...p} /> }} />
      <Tabs.Screen name="users" options={{ title: "Users", tabBarIcon: (p) => <TabIcon emoji="👤" {...p} /> }} />
      <Tabs.Screen name="opportunities" options={{ title: "Listings", tabBarIcon: (p) => <TabIcon emoji="💼" {...p} /> }} />
      <Tabs.Screen name="events" options={{ title: "Events", tabBarIcon: (p) => <TabIcon emoji="📅" {...p} /> }} />
      <Tabs.Screen name="announcements" options={{ title: "Announce", tabBarIcon: (p) => <TabIcon emoji="📢" {...p} /> }} />
      <Tabs.Screen name="moderation" options={{ href: null }} />
    </Tabs>
  );
}
