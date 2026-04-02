import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  RandomSession,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  getMotivationalMessage,
  scheduleEndOfDayNotification,
} from "@/services/NotificationService";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTime(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const RANDOM_DURATIONS = [60, 120, 180, 240];
const RANDOM_MODES = ["normal", "intensivo"] as const;
type RandomMode = (typeof RANDOM_MODES)[number];

const INTENSIVE_HABITS: HabitId[] = [
  "right_hand", "left_hand", "arpeggios", "scales_5", "scales_7",
  "phrases", "improv", "compose", "speed", "repertoire",
];

function generateRandomSessions(
  enabledHabits: { id: string; durationMinutes: number }[],
  totalMinutes: number,
  mode: RandomMode,
  language: "es" | "en"
): RandomSession[] {
  const pool =
    mode === "intensivo"
      ? enabledHabits.filter((h) => INTENSIVE_HABITS.includes(h.id as HabitId))
      : enabledHabits;
  if (pool.length === 0) return [];

  const sessions: RandomSession[] = [];
  let remaining = totalMinutes;
  const count = Math.min(8, Math.max(5, Math.ceil(totalMinutes / 15)));

  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  for (let i = 0; i < count && remaining > 0; i++) {
    const habit = shuffled[i % shuffled.length];
    const dur = Math.min(20, Math.max(10, Math.round(remaining / (count - i))));
    sessions.push({
      id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      habitId: habit.id,
      name: HABIT_NAMES[habit.id as HabitId][language],
      durationMinutes: dur,
      completed: false,
    });
    remaining -= dur;
  }
  return sessions;
}

function HabitTimer({ habitId, durationMin, t }: { habitId: HabitId; durationMin: number; t: (es: string, en: string) => string }) {
  const [remaining, setRemaining] = useState(durationMin * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const colors = useColors();

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { setRunning(false); return; }
    intervalRef.current = setInterval(() => {
      setRemaining((p) => {
        if (p <= 1) { clearInterval(intervalRef.current!); setRunning(false); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <View style={timerStyles.row}>
      <Text style={[timerStyles.time, { color: remaining === 0 ? "#00c853" : colors.primary }]}>
        {pad(mins)}:{pad(secs)}
      </Text>
      <TouchableOpacity
        style={[timerStyles.btn, { backgroundColor: colors.accent }]}
        onPress={() => {
          setRunning((r) => !r);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Feather name={running ? "pause" : "play"} size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  time: { fontSize: 16, fontFamily: "Inter_700Bold", minWidth: 60 },
  btn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});

function WeeklyChart({ data, colors }: { data: { day: string; hours: number }[]; colors: ReturnType<typeof useColors> }) {
  const maxH = Math.max(...data.map((d) => d.hours), 1);
  return (
    <View style={chartStyles.container}>
      {data.map((d, i) => (
        <View key={i} style={chartStyles.bar}>
          <View style={[chartStyles.barFill, { height: Math.max(4, (d.hours / maxH) * 80), backgroundColor: colors.primary }]} />
          <Text style={[chartStyles.label, { color: colors.mutedForeground }]}>{d.day}</Text>
          <Text style={[chartStyles.val, { color: colors.foreground }]}>{d.hours}h</Text>
        </View>
      ))}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 120, paddingTop: 20 },
  bar: { alignItems: "center", gap: 4, flex: 1 },
  barFill: { width: 24, borderRadius: 4, minHeight: 4 },
  label: { fontSize: 10, fontFamily: "Inter_500Medium" },
  val: { fontSize: 9, fontFamily: "Inter_400Regular" },
});

export default function DashboardScreen() {
  const {
    language,
    t,
    habits,
    getTodayLogs,
    getEnabledHabits,
    logHabit,
    streak,
    randomSessions,
    setRandomSessions,
    markSessionComplete,
    weeklyData,
    activityBreakdown,
  } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [selectedMode, setSelectedMode] = useState<RandomMode>("normal");
  const [showSessions, setShowSessions] = useState(false);

  const todayLogs = getTodayLogs();
  const enabledHabits = getEnabledHabits();

  const completedToday = enabledHabits.filter((h) =>
    todayLogs.some((l) => l.habitId === h.id && l.completed)
  ).length;
  const totalToday = enabledHabits.length;
  const completionPct = totalToday > 0 ? completedToday / totalToday : 0;

  const handleStartRandom = () => {
    const sessions = generateRandomSessions(
      enabledHabits.map((h) => ({ id: h.id, durationMinutes: h.durationMinutes })),
      selectedDuration,
      selectedMode,
      language
    );
    setRandomSessions(sessions);
    setShowRandomModal(false);
    setShowSessions(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  useEffect(() => {
    if (completionPct >= 0.8 && totalToday > 0) {
      const msg = getMotivationalMessage(language);
      scheduleEndOfDayNotification(language, msg).catch(() => {});
    }
  }, [completionPct, totalToday, language]);

  const handleMarkDone = (habitId: HabitId, durationMin: number) => {
    logHabit(habitId, durationMin);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (enabledHabits.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: colors.background,
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 20,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20,
          },
        ]}
      >
        <Feather name="music" size={64} color={colors.primary} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          {t("Sin hábitos configurados", "No habits configured")}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          {t(
            "Configura tus hábitos musicales para comenzar",
            "Set up your musical habits to get started"
          )}
        </Text>
        <TouchableOpacity
          style={[styles.setupBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/habits")}
        >
          <Text style={[styles.setupBtnText, { color: colors.primaryForeground }]}>
            {t("Configurar Hábitos", "Set Up Habits")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/language")} style={{ marginTop: 16 }}>
          <Text style={[{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" }]}>
            {t("Cambiar idioma", "Change language")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t("Mi Práctica", "My Practice")}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {new Date().toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push("/habits")} style={styles.iconBtn}>
            <Feather name="sliders" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/language")} style={styles.iconBtn}>
            <Feather name="globe" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.streakCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Feather name="zap" size={20} color="#fdcb6e" />
              <Text style={[styles.streakNum, { color: colors.foreground }]}>{streak.current}</Text>
              <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>
                {t("racha", "streak")}
              </Text>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
            <View style={styles.streakItem}>
              <Feather name="award" size={20} color="#e17055" />
              <Text style={[styles.streakNum, { color: colors.foreground }]}>{streak.best}</Text>
              <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>
                {t("mejor", "best")}
              </Text>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
            <View style={styles.streakItem}>
              <Feather name="check-square" size={20} color={colors.primary} />
              <Text style={[styles.streakNum, { color: colors.foreground }]}>
                {completedToday}/{totalToday}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>
                {t("hoy", "today")}
              </Text>
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${completionPct * 100}%` as any, backgroundColor: completionPct >= 0.8 ? "#00c853" : colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            {Math.round(completionPct * 100)}% {t("completado hoy", "completed today")}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {t("Horario de Hoy", "Today's Schedule")}
        </Text>

        {ALL_HABIT_IDS.filter((id) => habits[id].enabled).map((id) => {
          const habit = habits[id];
          const name = HABIT_NAMES[id][language];
          const isDone = todayLogs.some((l) => l.habitId === id && l.completed);
          return (
            <View
              key={id}
              style={[
                styles.habitRow,
                {
                  backgroundColor: isDone ? colors.card : colors.background,
                  borderColor: isDone ? "#00c853" : colors.border,
                  borderLeftColor: isDone ? "#00c853" : colors.primary,
                },
              ]}
            >
              <View style={styles.habitLeft}>
                <Feather
                  name={isDone ? "check-circle" : "circle"}
                  size={22}
                  color={isDone ? "#00c853" : colors.mutedForeground}
                />
                <View style={styles.habitInfo}>
                  <Text style={[styles.habitItemName, { color: isDone ? colors.mutedForeground : colors.foreground }]}>
                    {name}
                  </Text>
                  <Text style={[styles.habitTime, { color: colors.mutedForeground }]}>
                    {formatTime(habit.startHour, habit.startMinute)} · {habit.durationMinutes} min
                  </Text>
                </View>
              </View>
              <View style={styles.habitRight}>
                {!isDone && (
                  <HabitTimer habitId={id} durationMin={habit.durationMinutes} t={t} />
                )}
                {!isDone && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/timer",
                        params: { habitId: id, duration: habit.durationMinutes.toString() },
                      })
                    }
                    style={[styles.startBtn, { backgroundColor: colors.primary }]}
                  >
                    <Feather name="play" size={14} color={colors.primaryForeground} />
                  </TouchableOpacity>
                )}
                {!isDone && (
                  <TouchableOpacity
                    onPress={() => handleMarkDone(id, habit.durationMinutes)}
                    style={[styles.doneBtn, { borderColor: colors.border }]}
                  >
                    <Feather name="check" size={14} color={colors.foreground} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {showSessions && randomSessions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
              {t("Práctica Aleatoria", "Random Practice")}
            </Text>
            {randomSessions.map((session, idx) => (
              <View
                key={session.id}
                style={[
                  styles.sessionRow,
                  {
                    backgroundColor: session.completed ? colors.card : colors.background,
                    borderColor: session.completed ? "#00c853" : colors.border,
                  },
                ]}
              >
                <View style={styles.sessionLeft}>
                  <Text style={[styles.sessionNum, { color: colors.primary }]}>{idx + 1}</Text>
                  <View>
                    <Text style={[styles.sessionName, { color: session.completed ? colors.mutedForeground : colors.foreground }]}>
                      {session.name}
                    </Text>
                    <Text style={[styles.sessionDur, { color: colors.mutedForeground }]}>
                      {session.durationMinutes} min
                    </Text>
                  </View>
                </View>
                {!session.completed ? (
                  <TouchableOpacity
                    style={[styles.startBtn, { backgroundColor: colors.primary }]}
                    onPress={() =>
                      router.push({
                        pathname: "/timer",
                        params: {
                          habitId: session.habitId,
                          duration: session.durationMinutes.toString(),
                          sessionId: session.id,
                        },
                      })
                    }
                  >
                    <Feather name="play" size={14} color={colors.primaryForeground} />
                  </TouchableOpacity>
                ) : (
                  <Feather name="check-circle" size={22} color="#00c853" />
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setShowSessions(false)}
              style={[styles.dismissBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>
                {t("Cerrar sesión aleatoria", "Close random session")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {weeklyData.some((d) => d.hours > 0) && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
              {t("Esta Semana", "This Week")}
            </Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <WeeklyChart data={weeklyData} colors={colors} />
            </View>
          </>
        )}

        {activityBreakdown.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
              {t("Desglose de Actividades", "Activity Breakdown")}
            </Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {activityBreakdown.map((item, i) => (
                <View key={i} style={styles.breakdownRow}>
                  <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.breakdownName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.breakdownMin, { color: colors.mutedForeground }]}>
                    {item.minutes} min
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
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
          style={[styles.randomBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowRandomModal(true)}
          activeOpacity={0.85}
        >
          <Feather name="shuffle" size={22} color={colors.primaryForeground} />
          <Text style={[styles.randomBtnText, { color: colors.primaryForeground }]}>
            {t("Práctica Aleatoria", "Random Practice")}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showRandomModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRandomModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRandomModal(false)}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {t("Práctica Aleatoria", "Random Practice")}
            </Text>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
              {t("Duración total", "Total Duration")}
            </Text>
            <View style={styles.optionRow}>
              {RANDOM_DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.optionBtn,
                    {
                      backgroundColor: selectedDuration === d ? colors.primary : colors.background,
                      borderColor: selectedDuration === d ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedDuration(d)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: selectedDuration === d ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {d / 60}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
              {t("Modo", "Mode")}
            </Text>
            <View style={styles.optionRow}>
              {RANDOM_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.optionBtnWide,
                    {
                      backgroundColor: selectedMode === mode ? colors.primary : colors.background,
                      borderColor: selectedMode === mode ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedMode(mode)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: selectedMode === mode ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {mode === "normal"
                      ? t("Normal", "Normal")
                      : t("Intensivo", "Intensive")}
                  </Text>
                  <Text
                    style={[
                      styles.optionSubtext,
                      { color: selectedMode === mode ? colors.primaryForeground + "cc" : colors.mutedForeground },
                    ]}
                  >
                    {mode === "normal"
                      ? t("Mezcla equilibrada", "Balanced mix")
                      : t("Técnica + escalas + improv", "Technique + scales + improv")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.generateBtn, { backgroundColor: colors.primary }]}
              onPress={handleStartRandom}
            >
              <Feather name="shuffle" size={18} color={colors.primaryForeground} />
              <Text style={[styles.generateBtnText, { color: colors.primaryForeground }]}>
                {t("Generar Sesión", "Generate Session")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  setupBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  setupBtnText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    textTransform: "capitalize",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  streakCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  streakItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  streakDivider: {
    width: 1,
    height: "100%",
    marginHorizontal: 8,
  },
  streakNum: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  streakLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
    gap: 8,
  },
  habitLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  habitInfo: { flex: 1 },
  habitItemName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  habitTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  habitRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  startBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  sessionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sessionNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    width: 24,
  },
  sessionName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  sessionDur: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  dismissBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  dismissText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  chartCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  breakdownMin: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  randomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  randomBtnText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 10,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
  optionBtnWide: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  optionSubtext: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 2,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  generateBtnText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
});
