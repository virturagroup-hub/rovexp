import { router } from "expo-router";
import { Settings2 } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

import { theme } from "@/constants/theme";

export function SettingsButton() {
  return (
    <Pressable onPress={() => router.push("/settings")} style={styles.button}>
      <Settings2 color={theme.colors.textOnDark} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: theme.colors.deep,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    width: 42,
  },
});
