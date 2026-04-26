import { LinearGradient } from "expo-linear-gradient";
import { AlertTriangle, CheckCircle2, DatabaseZap } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import {
  describeSupabaseRuntimeSource,
  type SupabaseRuntimeSource,
} from "@/lib/runtime-status";

export function RuntimeStatusBanner({
  detail,
  source,
}: {
  detail?: string | null;
  source: SupabaseRuntimeSource;
}) {
  const runtime = describeSupabaseRuntimeSource(source, detail);

  if (runtime.tone === "good") {
    return (
      <View style={[styles.shell, styles.goodShell]}>
        <View style={styles.iconBubble}>
          <CheckCircle2 color={theme.colors.emerald} size={16} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>{runtime.label}</Text>
          <Text style={styles.body}>{runtime.body}</Text>
        </View>
      </View>
    );
  }

  if (runtime.tone === "warning") {
    return (
      <LinearGradient
        colors={["#FFF4D6", "#FFF8E8"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.shell, styles.warningShell]}
      >
        <View style={styles.iconBubbleWarning}>
          <AlertTriangle color={theme.colors.orange} size={16} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, styles.warningLabel]}>{runtime.label}</Text>
          <Text style={styles.body}>{runtime.body}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.shell, styles.neutralShell]}>
      <View style={styles.iconBubbleNeutral}>
        <DatabaseZap color={theme.colors.deepBlue} size={16} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{runtime.label}</Text>
        <Text style={styles.body}>{runtime.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  copy: {
    flex: 1,
  },
  goodShell: {
    backgroundColor: "rgba(139,195,74,0.12)",
    borderColor: "rgba(139,195,74,0.28)",
  },
  iconBubble: {
    alignItems: "center",
    backgroundColor: "rgba(139,195,74,0.18)",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  iconBubbleNeutral: {
    alignItems: "center",
    backgroundColor: theme.colors.badgeSoft,
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  iconBubbleWarning: {
    alignItems: "center",
    backgroundColor: "rgba(242,138,26,0.16)",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  label: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  neutralShell: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
  },
  shell: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  warningLabel: {
    color: theme.colors.sponsorText,
  },
  warningShell: {
    borderColor: "rgba(242,138,26,0.18)",
  },
});
