import type { PropsWithChildren } from "react";
import { useState } from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import { AnnouncementPopupBridge } from "@/features/announcements/announcement-popup-bridge";
import { AnnouncementPushRouterBridge } from "@/features/notifications/announcement-push-router";
import { StudentEventReminderBridge } from "@/features/notifications/student-event-reminders";
import { StudentRewardCelebrationProvider } from "@/features/notifications/student-reward-celebration";
import { StudentRewardNotificationBridge } from "@/features/notifications/student-reward-notifications";
import { UiPreferencesProvider } from "@/features/preferences/ui-preferences-provider";
import { NativePushDiagnosticsProvider } from "@/features/push/native-push-diagnostics";
import { PushAutoRegistrationBridge } from "@/features/push/push-auto-registration";
import { ReleaseGateProvider } from "@/features/release/release-gate-provider";
import { createQueryClient } from "@/lib/query-client";
import { SessionProvider } from "@/providers/session-provider";

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <UiPreferencesProvider>
        <ReleaseGateProvider>
          <SessionProvider>
            <NativePushDiagnosticsProvider>
              <PushAutoRegistrationBridge />
              <StudentRewardCelebrationProvider>
                <AnnouncementPushRouterBridge />
                <StudentEventReminderBridge />
                <StudentRewardNotificationBridge />
                <AnnouncementPopupBridge />
                {children}
              </StudentRewardCelebrationProvider>
            </NativePushDiagnosticsProvider>
          </SessionProvider>
        </ReleaseGateProvider>
      </UiPreferencesProvider>
    </QueryClientProvider>
  );
};
