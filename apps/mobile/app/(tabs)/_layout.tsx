import { Tabs } from "expo-router";

import { FloatingTabDock } from "@/components/floating-tab-dock";
import { LocationBootstrapper } from "@/components/location-bootstrapper";
import { theme } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <>
      <LocationBootstrapper />
      <Tabs
        tabBar={(props) => <FloatingTabDock {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.canvas },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: "Home" }}
        />
        <Tabs.Screen
          name="quests"
          options={{ title: "Quests" }}
        />
        <Tabs.Screen
          name="map"
          options={{ title: "Map" }}
        />
        <Tabs.Screen
          name="friends"
          options={{ title: "Friends" }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: "Profile" }}
        />
      </Tabs>
    </>
  );
}
