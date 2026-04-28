import type { PropsWithChildren } from "react";
import { useState } from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import { StudentRewardNotificationBridge } from "@/features/notifications/student-reward-notifications";
import { createQueryClient } from "@/lib/query-client";
import { SessionProvider } from "@/providers/session-provider";

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StudentRewardNotificationBridge />
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
};
