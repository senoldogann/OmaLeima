import type { PropsWithChildren } from "react";
import { useState } from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import { AnnouncementPopupBridge } from "@/features/announcements/announcement-popup-bridge";
import { StudentRewardCelebrationProvider } from "@/features/notifications/student-reward-celebration";
import { StudentRewardNotificationBridge } from "@/features/notifications/student-reward-notifications";
import { UiPreferencesProvider } from "@/features/preferences/ui-preferences-provider";
import { NativePushDiagnosticsProvider } from "@/features/push/native-push-diagnostics";
import { createQueryClient } from "@/lib/query-client";
import { SessionProvider } from "@/providers/session-provider";

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <UiPreferencesProvider>
        <SessionProvider>
          <NativePushDiagnosticsProvider>
            <StudentRewardCelebrationProvider>
              <StudentRewardNotificationBridge />
              <AnnouncementPopupBridge />
              {children}
            </StudentRewardCelebrationProvider>
          </NativePushDiagnosticsProvider>
        </SessionProvider>
      </UiPreferencesProvider>
    </QueryClientProvider>
  );
};
