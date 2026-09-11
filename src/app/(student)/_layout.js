// Tab bar for signed-in student & alumni accounts. Also the place
// where the first-run tutorial modal gets mounted on top of the
// tabs, so a new signup sees it as soon as they land.
import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { colors } from "../../../theme/colors";
import { useAuth } from "../../../context/AuthContext";
import OnboardingTutorial from "../../../components/OnboardingTutorial";

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function StudentTabsLayout() {
  const { firebaseUser, userDoc } = useAuth();
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    if (userDoc && userDoc.tutorialSeen !== true) setTutorialOpen(true);
  }, [userDoc]);

  return (
    <View style={{ flex: 1 }}>
      <TabsShell />
      {firebaseUser && (
        <OnboardingTutorial
          uid={firebaseUser.uid}
          visible={tutorialOpen}
          onClose={() => setTutorialOpen(false)}
        />
      )}
    </View>
  );
}

function TabsShell() {
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
      {/* Additional routes accessible from within the app but not in the tab bar */}
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="pathways" options={{ href: null }} />
      <Tabs.Screen name="chatbot" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="conversation" options={{ href: null }} />
      <Tabs.Screen name="user/[uid]" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="interview" options={{ href: null }} />
      <Tabs.Screen name="cv-checker" options={{ href: null }} />
    </Tabs>
  );
}
