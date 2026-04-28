# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-glass-design-foundation`
- **Scope:** Establish a shared mobile visual foundation in `apps/mobile` that brings an Apple-like glass feel on iOS, a close high-quality fallback on Android/web, and lightweight motion across the student-facing shell.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/components/app-screen.tsx`
- `apps/mobile/src/components/info-card.tsx`
- `apps/mobile/src/components/status-badge.tsx`
- `apps/mobile/src/features/auth/components/login-hero.tsx`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/features/foundation/components/foundation-status-card.tsx`
- `apps/mobile/src/app/auth/login.tsx`
- `apps/mobile/src/app/student/_layout.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/active-event.tsx`
- `apps/mobile/src/features/foundation/*`

## Risks

- Liquid-glass styling can become noisy fast if we apply the effect to content cards instead of treating it as a navigation and chrome language first.
- `expo-glass-effect` is iOS-first; Android and web need a deliberate fallback so the design still feels premium instead of broken.
- Motion must stay lightweight enough for `expo export:web` and local previews without introducing layout jank or unsupported native-only behavior.
- Global component changes can unintentionally restyle all existing screens, so the slice must stay focused on shared primitives and a few key student routes.

## Dependencies

- Existing Expo SDK 55 setup in `apps/mobile`, including `expo-glass-effect`, `react-native-reanimated`, `expo-router`, and the current mobile route structure.
- Shared content components like `InfoCard`, `StatusBadge`, and `FoundationStatusCard`, which already sit under most student screens.
- Current dark mobile palette and tab layout, which are functional but visually flat.
- Apple guidance for Liquid Glass and Expo guidance for `expo-glass-effect`, especially the rule that glass works best for controls and navigation rather than the entire content layer.

## Existing Logic Checked

- `AppScreen` currently gives every mobile route the same plain dark background and spacing, so it is the right shared entry point for a visual upgrade.
- `InfoCard`, `StatusBadge`, `EventCard`, and `FoundationStatusCard` already define most of the visible student UI surfaces.
- Student tabs currently use a stock bottom bar without icons, floating treatment, or depth.
- `active-event.tsx` and `auth/login.tsx` are good anchors for testing the new language because they combine states, actions, and denser information.
- The mobile package already includes `expo-glass-effect`, so we can use native glass on supported iOS runtimes instead of faking it everywhere.

## Review Outcome

Build the smallest mobile design foundation slice that:

- introduces shared glass-aware surfaces and a richer multi-tone background
- keeps iOS closer to native glass while giving Android/web a polished translucent fallback
- adds lightweight motion and a more premium tab-bar treatment
- applies the new language to login plus the core student routes without refactoring unrelated business or admin flows
