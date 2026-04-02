# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a bilingual (Spanish/English) musician habit tracker mobile app built with Expo.

## Artifacts

### Musician Habit Tracker (`artifacts/musician-habits`)
- **Type**: Expo (React Native) mobile app
- **Preview path**: `/` (root)
- **Features**:
  - Bilingual UI (Spanish/English), saved in AsyncStorage
  - Language selector screen on first launch
  - 12 musical habits (right/left hand, warmup, chords, arpeggios, scales 5/7, phrases, improv, compose, speed, repertoire)
  - Time + duration picker per habit
  - Dashboard with daily schedule, timers, streak tracking
  - Random Practice generator (Normal or Intensivo mode, 1-4h, 5-8 blocks)
  - Local notifications via expo-notifications (start + end per habit, end-of-day motivational)
  - Weekly bar chart + activity breakdown
  - Pure dark mode UI: black background, white text, blue (#3b9eff) accents
- **Key files**:
  - `context/AppContext.tsx` — shared state (language, habits, logs, streak, random sessions)
  - `services/NotificationService.ts` — notification scheduling + motivational messages
  - `app/language.tsx` — language selector
  - `app/habits.tsx` — habit selection + time/duration picker
  - `app/index.tsx` — dashboard
  - `app/timer.tsx` — individual habit timer
  - `constants/colors.ts` — dark mode color tokens
- **Storage**: AsyncStorage (no backend, offline-first)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile**: Expo ~54, expo-router ~6, React Native 0.81.5
- **Notifications**: expo-notifications ~0.32
- **API framework**: Express 5 (api-server artifact, not used by mobile app)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/musician-habits run dev` — run Expo dev server
