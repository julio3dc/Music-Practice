import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Language = "es" | "en";

export type Habit = {
  id: string;
  enabled: boolean;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
};

export type HabitLog = {
  habitId: string;
  date: string;
  completed: boolean;
  durationMinutes: number;
};

export type RandomSession = {
  id: string;
  habitId: string;
  name: string;
  durationMinutes: number;
  startedAt?: number;
  completed: boolean;
};

const HABIT_IDS = [
  "right_hand",
  "left_hand",
  "warmup",
  "chords",
  "arpeggios",
  "scales_5",
  "scales_7",
  "phrases",
  "improv",
  "compose",
  "speed",
  "repertoire",
] as const;

export type HabitId = (typeof HABIT_IDS)[number];

export const HABIT_NAMES: Record<HabitId, { es: string; en: string }> = {
  right_hand: { es: "Técnica Mano Derecha", en: "Right Hand Technique" },
  left_hand: { es: "Técnica Mano Izquierda", en: "Left Hand Technique" },
  warmup: { es: "Calentamiento", en: "Warm-up" },
  chords: { es: "Acordes", en: "Chords" },
  arpeggios: { es: "Arpegios", en: "Arpeggios" },
  scales_5: { es: "Escalas de 5 notas", en: "5-note Scales" },
  scales_7: { es: "Escalas de 7 notas", en: "7-note Scales" },
  phrases: { es: "Frases", en: "Phrases" },
  improv: { es: "Improvisar", en: "Improvise" },
  compose: { es: "Componer frases cortas", en: "Compose Short Phrases" },
  speed: { es: "Técnica de velocidad", en: "Speed Technique" },
  repertoire: { es: "Repertorio", en: "Repertoire" },
};

export const ALL_HABIT_IDS = HABIT_IDS;

const DEFAULT_HABITS: Record<HabitId, Habit> = {
  right_hand: { id: "right_hand", enabled: false, startHour: 9, startMinute: 0, durationMinutes: 15 },
  left_hand: { id: "left_hand", enabled: false, startHour: 9, startMinute: 15, durationMinutes: 15 },
  warmup: { id: "warmup", enabled: false, startHour: 8, startMinute: 30, durationMinutes: 10 },
  chords: { id: "chords", enabled: false, startHour: 10, startMinute: 0, durationMinutes: 20 },
  arpeggios: { id: "arpeggios", enabled: false, startHour: 10, startMinute: 30, durationMinutes: 15 },
  scales_5: { id: "scales_5", enabled: false, startHour: 11, startMinute: 0, durationMinutes: 10 },
  scales_7: { id: "scales_7", enabled: false, startHour: 11, startMinute: 15, durationMinutes: 10 },
  phrases: { id: "phrases", enabled: false, startHour: 14, startMinute: 0, durationMinutes: 20 },
  improv: { id: "improv", enabled: false, startHour: 14, startMinute: 30, durationMinutes: 20 },
  compose: { id: "compose", enabled: false, startHour: 15, startMinute: 0, durationMinutes: 20 },
  speed: { id: "speed", enabled: false, startHour: 15, startMinute: 30, durationMinutes: 15 },
  repertoire: { id: "repertoire", enabled: false, startHour: 16, startMinute: 0, durationMinutes: 30 },
};

export type Streak = {
  current: number;
  best: number;
  lastCompletedDate: string | null;
};

type AppContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  habits: Record<HabitId, Habit>;
  updateHabit: (id: HabitId, update: Partial<Habit>) => void;
  saveHabits: () => Promise<void>;
  logs: HabitLog[];
  logHabit: (habitId: HabitId, durationMinutes: number) => void;
  streak: Streak;
  getTodayLogs: () => HabitLog[];
  getEnabledHabits: () => Habit[];
  t: (es: string, en: string) => string;
  randomSessions: RandomSession[];
  setRandomSessions: (sessions: RandomSession[]) => void;
  markSessionComplete: (sessionId: string) => void;
  weeklyData: { day: string; hours: number }[];
  activityBreakdown: { name: string; minutes: number; color: string }[];
};

const AppContext = createContext<AppContextType | null>(null);

const COLORS_BY_HABIT: Record<string, string> = {
  right_hand: "#3b9eff",
  left_hand: "#6c5ce7",
  warmup: "#00cec9",
  chords: "#fdcb6e",
  arpeggios: "#e17055",
  scales_5: "#74b9ff",
  scales_7: "#a29bfe",
  phrases: "#55efc4",
  improv: "#fd79a8",
  compose: "#ffeaa7",
  speed: "#ff7675",
  repertoire: "#81ecec",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es");
  const [habits, setHabits] = useState<Record<HabitId, Habit>>(DEFAULT_HABITS);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [streak, setStreak] = useState<Streak>({ current: 0, best: 0, lastCompletedDate: null });
  const [randomSessions, setRandomSessionsState] = useState<RandomSession[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [langRaw, habitsRaw, logsRaw, streakRaw] = await Promise.all([
        AsyncStorage.getItem("language"),
        AsyncStorage.getItem("habits"),
        AsyncStorage.getItem("logs"),
        AsyncStorage.getItem("streak"),
      ]);
      if (langRaw) setLanguageState(langRaw as Language);
      if (habitsRaw) setHabits(JSON.parse(habitsRaw));
      if (logsRaw) setLogs(JSON.parse(logsRaw));
      if (streakRaw) setStreak(JSON.parse(streakRaw));
    } catch (e) {}
  };

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem("language", lang);
  }, []);

  const updateHabit = useCallback((id: HabitId, update: Partial<Habit>) => {
    setHabits((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...update },
    }));
  }, []);

  const saveHabits = useCallback(async () => {
    await AsyncStorage.setItem("habits", JSON.stringify(habits));
  }, [habits]);

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  const getTodayLogs = useCallback(() => {
    const today = getTodayDate();
    return logs.filter((l) => l.date === today);
  }, [logs]);

  const getEnabledHabits = useCallback(() => {
    return ALL_HABIT_IDS.filter((id) => habits[id].enabled).map((id) => habits[id]);
  }, [habits]);

  const logHabit = useCallback(
    async (habitId: HabitId, durationMinutes: number) => {
      const today = getTodayDate();
      const newLog: HabitLog = {
        habitId,
        date: today,
        completed: true,
        durationMinutes,
      };
      const newLogs = [...logs.filter((l) => !(l.date === today && l.habitId === habitId)), newLog];
      setLogs(newLogs);
      await AsyncStorage.setItem("logs", JSON.stringify(newLogs));

      const todayLogs = newLogs.filter((l) => l.date === today);
      const enabledHabits = ALL_HABIT_IDS.filter((id) => habits[id].enabled);
      const allDone = enabledHabits.every((id) => todayLogs.some((l) => l.habitId === id && l.completed));
      if (allDone) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split("T")[0];
        const newStreak: Streak = {
          current: streak.lastCompletedDate === yStr ? streak.current + 1 : 1,
          best: Math.max(streak.best, streak.lastCompletedDate === yStr ? streak.current + 1 : 1),
          lastCompletedDate: today,
        };
        setStreak(newStreak);
        await AsyncStorage.setItem("streak", JSON.stringify(newStreak));
      }
    },
    [logs, habits, streak]
  );

  const markSessionComplete = useCallback(
    (sessionId: string) => {
      setRandomSessionsState((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, completed: true } : s))
      );
    },
    []
  );

  const setRandomSessions = useCallback((sessions: RandomSession[]) => {
    setRandomSessionsState(sessions);
  }, []);

  const t = useCallback(
    (es: string, en: string) => (language === "es" ? es : en),
    [language]
  );

  const weeklyData = (() => {
    const days = language === "es"
      ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLogs = logs.filter((l) => l.date === dateStr);
      const totalMin = dayLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
      result.push({ day: days[d.getDay() === 0 ? 6 : d.getDay() - 1], hours: Math.round((totalMin / 60) * 10) / 10 });
    }
    return result;
  })();

  const activityBreakdown = ALL_HABIT_IDS
    .map((id) => {
      const totalMin = logs
        .filter((l) => l.habitId === id)
        .reduce((acc, l) => acc + l.durationMinutes, 0);
      return {
        name: HABIT_NAMES[id][language],
        minutes: totalMin,
        color: COLORS_BY_HABIT[id] ?? "#3b9eff",
      };
    })
    .filter((h) => h.minutes > 0);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        habits,
        updateHabit,
        saveHabits,
        logs,
        logHabit,
        streak,
        getTodayLogs,
        getEnabledHabits,
        t,
        randomSessions,
        setRandomSessions,
        markSessionComplete,
        weeklyData,
        activityBreakdown,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
