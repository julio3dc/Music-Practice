import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ALL_HABIT_IDS,
  HABIT_NAMES,
  HabitId,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  requestNotificationPermissions,
  scheduleHabitNotifications,
  setupNotificationCategories,
} from "@/services/NotificationService";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 30, 45];
const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90];

type PickerMode = "startHour" | "startMinute" | "duration" | null;
type ActivePicker = { id: HabitId; mode: PickerMode };

function formatTime(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function HabitsScreen() {
  const { habits, updateHabit, saveHabits, language, t, getEnabledHabits } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);
  const [saving, setSaving] = useState(false);

  const handleToggle = (id: HabitId) => {
    updateHabit(id, { enabled: !habits[id].enabled });
  };

  const openPicker = (id: HabitId, mode: PickerMode) => {
    setActivePicker({ id, mode });
  };

  const closePicker = () => setActivePicker(null);

  const handlePickValue = (value: number) => {
    if (!activePicker) return;
    const { id, mode } = activePicker;
    if (mode === "startHour") updateHabit(id, { startHour: value });
    else if (mode === "startMinute") updateHabit(id, { startMinute: value });
    else if (mode === "duration") updateHabit(id, { durationMinutes: value });
    closePicker();
  };

  const handleSave = async () => {
    const enabled = getEnabledHabits();
    if (enabled.length === 0) {
      Alert.alert(
        t("Sin hábitos", "No habits"),
        t("Selecciona al menos un hábito.", "Select at least one habit.")
      );
      return;
    }
    setSaving(true);
    try {
      await saveHabits();
      const granted = await requestNotificationPermissions();
      if (granted) {
        await setupNotificationCategories();
        await scheduleHabitNotifications(habits, language);
      }
      router.replace("/");
    } catch (e) {
      Alert.alert(t("Error", "Error"), t("No se pudo guardar.", "Could not save."));
    } finally {
      setSaving(false);
    }
  };

  const pickerValues =
    activePicker?.mode === "startHour"
      ? HOURS
      : activePicker?.mode === "startMinute"
      ? MINUTES
      : DURATIONS;

  const pickerLabel =
    activePicker?.mode === "startHour"
      ? t("Hora de inicio", "Start Hour")
      : activePicker?.mode === "startMinute"
      ? t("Minuto de inicio", "Start Minute")
      : t("Duración (min)", "Duration (min)");

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.background,
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.replace("/language")} style={styles.backBtn}>
          <Feather name="globe" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("Mis Hábitos", "My Habits")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              (Platform.OS === "web" ? 34 : insets.bottom) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          {t(
            "Selecciona tus hábitos y configura horarios",
            "Select your habits and configure schedules"
          )}
        </Text>

        {ALL_HABIT_IDS.map((id) => {
          const habit = habits[id];
          const name = HABIT_NAMES[id][language];
          return (
            <View
              key={id}
              style={[
                styles.habitCard,
                {
                  backgroundColor: habit.enabled ? colors.card : colors.background,
                  borderColor: habit.enabled ? colors.primary : colors.border,
                  borderWidth: habit.enabled ? 2 : 1,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.habitTop}
                onPress={() => handleToggle(id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: habit.enabled ? colors.primary : "transparent",
                      borderColor: habit.enabled ? colors.primary : colors.mutedForeground,
                    },
                  ]}
                >
                  {habit.enabled && <Feather name="check" size={14} color="#000" />}
                </View>
                <Text
                  style={[
                    styles.habitName,
                    { color: habit.enabled ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>

              {habit.enabled && (
                <View style={styles.habitControls}>
                  <TouchableOpacity
                    style={[styles.timeBtn, { backgroundColor: colors.accent }]}
                    onPress={() => openPicker(id, "startHour")}
                  >
                    <Feather name="clock" size={13} color={colors.primary} />
                    <Text style={[styles.timeBtnText, { color: colors.primary }]}>
                      {formatTime(habit.startHour, habit.startMinute)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timeBtn, { backgroundColor: colors.accent }]}
                    onPress={() => openPicker(id, "duration")}
                  >
                    <Feather name="timer" size={13} color={colors.primary} />
                    <Text style={[styles.timeBtnText, { color: colors.primary }]}>
                      {habit.durationMinutes} min
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Feather name="check-circle" size={20} color={colors.primaryForeground} />
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            {saving
              ? t("Guardando...", "Saving...")
              : t("Continuar", "Continue")}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={activePicker !== null}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={closePicker} activeOpacity={1}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
              {pickerLabel}
            </Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {pickerValues.map((val) => {
                const current = activePicker?.mode === "startHour"
                  ? habits[activePicker.id]?.startHour
                  : activePicker?.mode === "startMinute"
                  ? habits[activePicker.id]?.startMinute
                  : habits[activePicker?.id ?? "warmup"]?.durationMinutes;
                const selected = val === current;
                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.pickerItem,
                      { borderColor: colors.border, backgroundColor: selected ? colors.accent : "transparent" },
                    ]}
                    onPress={() => handlePickValue(val)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: selected ? colors.primary : colors.foreground },
                      ]}
                    >
                      {activePicker?.mode === "startHour"
                        ? formatTime(val, 0).replace(":00", "")
                        : activePicker?.mode === "startMinute"
                        ? `:${val.toString().padStart(2, "0")}`
                        : `${val} min`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
    textAlign: "center",
  },
  habitCard: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  habitTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  habitName: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  habitControls: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  timeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveBtnText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 16,
    textAlign: "center",
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 4,
    borderWidth: 0,
  },
  pickerItemText: {
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
