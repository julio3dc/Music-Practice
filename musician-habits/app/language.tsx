import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function LanguageScreen() {
  const { setLanguage, getEnabledHabits } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleSelect = async (lang: "es" | "en") => {
    await setLanguage(lang);
    const enabled = getEnabledHabits();
    if (enabled.length > 0) {
      router.replace("/");
    } else {
      router.replace("/habits");
    }
  };

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
      <View style={styles.header}>
        <View style={styles.iconRow}>
          <Feather name="music" size={48} color={colors.primary} />
          <Feather name="activity" size={40} color={colors.primary} style={{ marginLeft: 8 }} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Musician Habit Tracker
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Select your language / Selecciona tu idioma
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.langBtn, { backgroundColor: colors.primary }]}
          onPress={() => handleSelect("es")}
          activeOpacity={0.8}
        >
          <Text style={[styles.langEmoji]}>🇪🇸</Text>
          <Text style={[styles.langText, { color: colors.primaryForeground }]}>
            Español
          </Text>
          <Text style={[styles.langSub, { color: colors.primaryForeground + "cc" }]}>
            Continuar en español
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.langBtn, { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary }]}
          onPress={() => handleSelect("en")}
          activeOpacity={0.8}
        >
          <Text style={[styles.langEmoji]}>🇺🇸</Text>
          <Text style={[styles.langText, { color: colors.foreground }]}>
            English
          </Text>
          <Text style={[styles.langSub, { color: colors.mutedForeground }]}>
            Continue in English
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Feather name="headphones" size={20} color={colors.mutedForeground} />
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          Practice makes perfect
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  buttons: {
    width: "100%",
    gap: 16,
  },
  langBtn: {
    width: "100%",
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    gap: 6,
  },
  langEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  langText: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  langSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
