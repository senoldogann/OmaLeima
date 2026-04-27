import { Redirect } from "expo-router";

import { useSession } from "@/providers/session-provider";

export default function IndexRoute() {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return <Redirect href="/auth/login" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/student/events" />;
  }

  return <Redirect href="/auth/login" />;
}
