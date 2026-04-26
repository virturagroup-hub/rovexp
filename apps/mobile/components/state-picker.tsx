import { ChevronDown, Check, Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { theme } from "@/constants/theme";
import type { StateRecord } from "@rovexp/types";

interface StatePickerProps {
  allowClear?: boolean;
  label: string;
  onChange: (value: StateRecord | null) => void;
  placeholder?: string;
  states: StateRecord[];
  value: StateRecord | null;
}

export function StatePicker({
  allowClear = true,
  label,
  onChange,
  placeholder = "Select a state",
  states,
  value,
}: StatePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredStates = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return states;
    }

    return states.filter((state) =>
      `${state.code} ${state.name}`.toLowerCase().includes(normalized),
    );
  }, [query, states]);

  const handleSelect = (state: StateRecord | null) => {
    onChange(state);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <Pressable onPress={() => setOpen(true)} style={styles.trigger}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.value, !value && styles.placeholder]}>
              {value ? `${value.name} (${value.code})` : placeholder}
            </Text>
            <Text style={styles.hint}>
              Search all 50 states by name or abbreviation.
            </Text>
          </View>
          <ChevronDown color={theme.colors.muted} size={18} />
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        presentationStyle="pageSheet"
        transparent={false}
        visible={open}
      >
        <View style={styles.modalShell}>
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: "padding", android: undefined })}
            style={styles.modalFlex}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Home base</Text>
                <Text style={styles.modalTitle}>Choose your state</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} style={styles.iconButton}>
                <X color={theme.colors.ink} size={18} />
              </Pressable>
            </View>

            <View style={styles.searchField}>
              <Search color={theme.colors.muted} size={16} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder="Search states"
                placeholderTextColor={theme.colors.muted}
                style={styles.searchInput}
                value={query}
              />
            </View>

            <View style={styles.selectionMeta}>
              <Text style={styles.selectionMetaLabel}>
                {value ? "Current selection" : "No state selected"}
              </Text>
              {allowClear ? (
                <Pressable onPress={() => handleSelect(null)} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>

            <FlatList
              contentContainerStyle={styles.listContent}
              data={filteredStates}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No matching states</Text>
                  <Text style={styles.emptyBody}>
                    Try a different spelling or use the two-letter abbreviation.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const active = item.id === value?.id;

                return (
                  <Pressable
                    onPress={() => handleSelect(item)}
                    style={[styles.row, active && styles.rowActive]}
                  >
                    <View style={styles.rowCodeWrap}>
                      <Text style={[styles.rowCode, active && styles.rowCodeActive]}>
                        {item.code}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, active && styles.rowNameActive]}>
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.rowHelper,
                          active && styles.rowHelperActive,
                        ]}
                      >
                        Tap to use this as your public home base.
                      </Text>
                    </View>
                    {active ? (
                      <Check color={theme.colors.cyan} size={18} />
                    ) : null}
                  </Pressable>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: theme.colors.deepBlue,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyBody: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  emptyTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 15,
  },
  field: {
    gap: 10,
  },
  hint: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  listContent: {
    gap: 10,
    paddingBottom: 8,
  },
  modalFlex: {
    flex: 1,
    gap: 16,
    padding: theme.spacing.screen,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  modalShell: {
    backgroundColor: theme.colors.canvas,
    flex: 1,
  },
  modalTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 22,
    lineHeight: 28,
  },
  modalEyebrow: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  placeholder: {
    color: theme.colors.muted,
  },
  row: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  rowActive: {
    backgroundColor: "rgba(45,183,255,0.08)",
    borderColor: "rgba(45,183,255,0.24)",
  },
  rowCode: {
    color: theme.colors.deepBlue,
    fontFamily: "SpaceMono",
    fontSize: 16,
  },
  rowCodeActive: {
    color: theme.colors.deep,
  },
  rowCodeWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.badgeSoft,
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 52,
  },
  rowHelper: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  rowHelperActive: {
    color: theme.colors.deepBlue,
  },
  rowName: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 15,
  },
  rowNameActive: {
    color: theme.colors.deep,
  },
  searchField: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 15,
    minHeight: 24,
  },
  selectionMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectionMetaLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  trigger: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  value: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 16,
  },
});
