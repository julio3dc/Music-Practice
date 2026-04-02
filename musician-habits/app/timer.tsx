import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HABIT_NAMES, HabitId, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function TimerScreen() {
  const { habitId, duration, sessionId } = useLocalSearchParams<{
    habitId: string;
    duration: string;
    sessionId?: string;
  }>();
  const { language, logHabit, markSessionComplete } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const totalSeconds = (parseInt(duration ?? "15", 10)) * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = useCallback((es: string, en: string) => (language === "es" ? es : en), [language]);
  const name = HABIT_NAMES[habitId as HabitId]?.[language] ?? habitId;
  const durationMin = parseInt(duration ?? "15", 10);

  useEffect(() => {
    if (!running || done) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setDone(true);
          setRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, done]);

  const togglePause = () => {
    setRunning((r) => !r);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleComplete = () => {
    logHabit(habitId as HabitId, durationMin);
    if (sessionId) markSessionComplete(sessionId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleSkip = () => {
    if (sessionId) markSessionComplete(sessionId);
    router.back();
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = 1 - remaining / totalSeconds;
  const circumference = 2 * Math.PI * 100;
  const strokeDash = circumference * (1 - progress);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === "web" ? 67 : insets.top + 20,
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20,
        },
      ]}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Feather name="arrow-left" size={24} color={colors.foreground} />
      </TouchableOpacity>

      <Text style={[styles.habitName, { color: colors.foreground }]}>{name}</Text>
      <Text style={[styles.habitSub, { color: colors.mutedForeground }]}>
        {durationMin} min
      </Text>

      <View style={styles.circleContainer}>
        {Platform.OS !== "web" ? (
          <View style={[styles.circleOuter, { borderColor: colors.border }]}>
            <View
              style={[
                styles.circleProgress,
                {
                  borderColor: done ? "#00c853" : colors.primary,
                  opacity: progress,
                },
              ]}
            />
            <View style={styles.circleInner}>
              <Text style={[styles.timerText, { color: done ? "#00c853" : colors.foreground }]}>
                {pad(mins)}:{pad(secs)}
              </Text>
              {done && (
                <Text style={[styles.doneText, { color: "#00c853" }]}>
                  {t("¡Listo!", "Done!")}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.circleOuter, { borderColor: colors.border }]}>
            <View style={styles.circleInner}>
              <Text style={[styles.timerText, { color: done ? "#00c853" : colors.foreground }]}>
                {pad(mins)}:{pad(secs)}
              </Text>
              {done && (
                <Text style={[styles.doneText, { color: "#00c853" }]}>
                  {t("¡Listo!", "Done!")}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {!done ? (
          <>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={togglePause}
              activeOpacity={0.8}
            >
              <Feather name={running ? "pause" : "play"} size={28} color={colors.foreground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
              onPress={handleComplete}
              activeOpacity={0.8}
            >
              <Feather name="check" size={24} color={colors.primaryForeground} />
              <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>
                {t("Completar", "Complete")}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: "#00c853", width: "100%" }]}
            onPress={handleComplete}
            activeOpacity={0.8}
          >
            <Feather name="check-circle" size={24} color="#fff" />
            <Text style={[styles.btnPrimaryText, { color: "#fff" }]}>
              {t("¡Terminé! Registrar", "Done! Log it")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!done && (
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
            {t("Omitir", "Skip")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  back: {
    alignSelf: "flex-start",
    padding: 8,
    marginBottom: 16,
  },
  habitName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  habitSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 32,
  },
  circleContainer: {
    marginVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  circleOuter: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  circleProgress: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 8,
  },
  circleInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  doneText: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 32,
  },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  btnPrimaryText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  skipBtn: {
    marginTop: 20,
    padding: 10,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
