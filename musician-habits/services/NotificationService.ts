import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ALL_HABIT_IDS, Habit, HabitId, HABIT_NAMES, Language } from "../context/AppContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function setupNotificationCategories() {
  if (Platform.OS === "web") return;
  await Notifications.setNotificationCategoryAsync("practice_start", [
    {
      identifier: "INICIAR",
      buttonTitle: "Iniciar / Start",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "SNOOZE",
      buttonTitle: "Snooze (10 min)",
      options: { opensAppToForeground: false },
    },
  ]);
  await Notifications.setNotificationCategoryAsync("practice_end", [
    {
      identifier: "HECHO",
      buttonTitle: "Hecho / Done",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "NO",
      buttonTitle: "No",
      options: { opensAppToForeground: false },
    },
  ]);
}

export async function cancelAllHabitNotifications() {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleHabitNotifications(
  habits: Record<HabitId, Habit>,
  language: Language
) {
  if (Platform.OS === "web") return;
  await cancelAllHabitNotifications();
  for (const id of ALL_HABIT_IDS) {
    const habit = habits[id];
    if (!habit.enabled) continue;
    const name = HABIT_NAMES[id][language];
    const now = new Date();
    const startTime = new Date();
    startTime.setHours(habit.startHour, habit.startMinute, 0, 0);
    if (startTime <= now) startTime.setDate(startTime.getDate() + 1);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === "es" ? `¡Hora de ${name}!` : `Time for ${name}!`,
        body: language === "es"
          ? `Tu sesión de ${habit.durationMinutes} min comienza ahora`
          : `Your ${habit.durationMinutes} min session starts now`,
        categoryIdentifier: "practice_start",
        data: { habitId: id, action: "start" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: startTime,
        repeats: true,
      } as Notifications.DateTriggerInput,
    });

    const endTime = new Date(startTime.getTime() + habit.durationMinutes * 60 * 1000);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === "es" ? `¿Terminaste ${name}?` : `Did you finish ${name}?`,
        body: language === "es" ? "Marca tu progreso" : "Mark your progress",
        categoryIdentifier: "practice_end",
        data: { habitId: id, action: "end" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: endTime,
        repeats: true,
      } as Notifications.DateTriggerInput,
    });
  }
}

export async function scheduleEndOfDayNotification(
  language: Language,
  motivationalMessage: string
) {
  if (Platform.OS === "web") return;
  const endOfDay = new Date();
  endOfDay.setHours(21, 0, 0, 0);
  if (endOfDay <= new Date()) endOfDay.setDate(endOfDay.getDate() + 1);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: language === "es" ? "¡Día productivo completado!" : "Productive day done!",
      body: motivationalMessage,
      data: { action: "end_of_day" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: endOfDay,
    } as Notifications.DateTriggerInput,
  });
}

const MOTIVATIONAL_ES = [
  "¡Hoy venciste la pereza! Cada nota te acerca al escenario que sueñas.",
  "Día productivo: mientras otros scrolleaban, tú construiste tu grandeza.",
  "¡Eres un mejor músico hoy! El tiempo en redes se va, tu talento queda.",
  "Hoy practicaste de verdad—mañana, el mundo oirá tu sonido.",
  "Venciste el scroll: cada escala completada es un paso a la fama.",
  "¡Gran día! La pereza perdió, tu sueño ganó.",
  "Estás más cerca de la grandeza—cada práctica vence los feeds infinitos.",
  "Hoy fuiste disciplinado: redes pueden esperar, tu música no.",
];

const MOTIVATIONAL_EN = [
  "Today you beat laziness! Every note brings you closer to the stage you dream of.",
  "Productive day: while others scrolled, you built your greatness.",
  "You're a better musician today! Social media time vanishes—your talent endures.",
  "Today you really practiced—tomorrow, the world will hear your sound.",
  "You conquered the scroll: every scale completed is a step toward fame.",
  "Great day! Laziness lost, your dream won.",
  "You're closer to greatness—every practice beats endless feeds.",
  "Today you were disciplined: social media can wait—your music can't.",
];

let motivationalIndex = 0;
export function getMotivationalMessage(language: Language): string {
  const list = language === "es" ? MOTIVATIONAL_ES : MOTIVATIONAL_EN;
  const msg = list[motivationalIndex % list.length];
  motivationalIndex++;
  return msg;
}
