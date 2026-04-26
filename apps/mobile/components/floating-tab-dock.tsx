import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Compass, House, Map, Trophy, UserRound, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tabBarLayout } from "@/constants/navigation";
import { theme } from "@/constants/theme";

const iconByRoute: Record<string, LucideIcon> = {
  friends: Trophy,
  index: House,
  map: Map,
  profile: UserRound,
  quests: Compass,
};

export function FloatingTabDock({ descriptors, navigation, state }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(tabBarLayout.bottomOffset, insets.bottom + 6);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.shell,
        {
          bottom: bottomOffset,
          left: tabBarLayout.horizontalInset,
          right: tabBarLayout.horizontalInset,
        },
      ]}
    >
      <LinearGradient
        colors={["rgba(11,24,48,0.98)", "rgba(13,32,60,0.96)", "rgba(18,58,99,0.92)"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[
          styles.dock,
          {
            minHeight: tabBarLayout.height,
            paddingBottom: Math.max(tabBarLayout.verticalPaddingBottom, insets.bottom ? 7 : 5),
            paddingTop: tabBarLayout.verticalPaddingTop,
          },
        ]}
      >
        <View style={styles.topEdge} />
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const options = descriptor?.options ?? {};
          const focused = state.index === index;
          const Icon = iconByRoute[route.name] ?? House;
          const label = options.title ?? route.name;
          const accessibilityLabel =
            options.tabBarAccessibilityLabel ?? label;

          const handlePress = () => {
            const event = navigation.emit({
              canPreventDefault: true,
              target: route.key,
              type: "tabPress",
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityLabel={accessibilityLabel}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onLongPress={() =>
                navigation.emit({
                  target: route.key,
                  type: "tabLongPress",
                })
              }
              onPress={handlePress}
              style={styles.tabPressable}
            >
              <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
                {focused ? <View style={styles.activeBackdrop} /> : null}
                <View style={[styles.iconShell, focused && styles.iconShellActive]}>
                  <Icon
                    color={focused ? theme.colors.textOnDark : theme.colors.navInactive}
                    size={tabBarLayout.iconSize}
                    strokeWidth={focused ? 2.4 : 2}
                  />
                </View>
                <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  activeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(45,183,255,0.08)",
    borderRadius: 18,
  },
  dock: {
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 16,
  },
  iconShell: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconShellActive: {
    backgroundColor: "rgba(45,183,255,0.12)",
    borderRadius: 999,
    marginBottom: 2,
    padding: 6,
  },
  label: {
    color: theme.colors.navInactive,
    fontSize: tabBarLayout.labelFontSize,
    fontWeight: "800",
    letterSpacing: 0.15,
    lineHeight: tabBarLayout.labelLineHeight,
    textAlign: "center",
  },
  labelFocused: {
    color: theme.colors.textOnDark,
  },
  shell: {
    position: "absolute",
  },
  tabItem: {
    alignItems: "center",
    borderRadius: 18,
    flex: 1,
    gap: 1,
    justifyContent: "center",
    minHeight: 40,
    overflow: "hidden",
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  tabItemFocused: {
    backgroundColor: "rgba(45,183,255,0.08)",
  },
  tabPressable: {
    flex: 1,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  topEdge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    height: 1,
    left: 14,
    position: "absolute",
    right: 14,
    top: 0,
  },
});
