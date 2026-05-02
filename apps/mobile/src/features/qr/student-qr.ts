import { useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import * as QRCode from "qrcode";
import * as ScreenCapture from "expo-screen-capture";

import { publicEnv } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import type {
  GenerateQrTokenResponse,
  QrProtectionStatus,
  RegisteredQrEvent,
  SelectedStudentQrEvent,
  StudentQrContext,
} from "@/features/qr/types";

type ProfileRow = {
  display_name: string | null;
  email: string;
};

type RegistrationRow = {
  event_id: string;
};

type EventRow = {
  id: string;
  name: string;
  city: string;
  start_at: string;
  end_at: string;
  minimum_stamps_required: number;
  status: "PUBLISHED" | "ACTIVE";
};

type StampCountResult = {
  stampCount: number;
};

type GenerateQrTokenErrorResponse = {
  status: string;
  message: string;
};

type UseStudentQrContextQueryParams = {
  studentId: string;
  isEnabled: boolean;
};

type UseStampCountQueryParams = {
  eventId: string;
  studentId: string;
  isEnabled: boolean;
};

type UseGenerateQrTokenQueryParams = {
  accessToken: string;
  eventId: string;
  isEnabled: boolean;
};

type UseQrSvgQueryParams = {
  token: string;
  isEnabled: boolean;
};

type QrProtectionState = {
  detail: string;
  status: QrProtectionStatus;
};

export const studentQrContextQueryKey = (studentId: string) => ["student-qr-context", studentId] as const;

export const studentEventStampCountQueryKey = (eventId: string, studentId: string) =>
  ["student-event-stamp-count", eventId, studentId] as const;

export const studentGenerateQrTokenQueryKey = (eventId: string, accessTokenCacheKey: string) =>
  ["student-generate-qr-token", eventId, accessTokenCacheKey] as const;

export const studentQrSvgQueryKey = (token: string) => ["student-qr-svg", token] as const;

const toRegisteredQrEvent = (row: EventRow): RegisteredQrEvent => ({
  id: row.id,
  name: row.name,
  city: row.city,
  startAt: row.start_at,
  endAt: row.end_at,
  minimumStampsRequired: row.minimum_stamps_required,
  status: row.status,
});

const getDisplayName = (profile: ProfileRow): string => profile.display_name ?? profile.email;

const readErrorResponseAsync = async (response: Response): Promise<GenerateQrTokenErrorResponse> => {
  const data = (await response.json()) as unknown;

  if (typeof data !== "object" || data === null) {
    return {
      status: "UNKNOWN_ERROR",
      message: `Function returned HTTP ${response.status}.`,
    };
  }

  const record = data as Record<string, unknown>;

  return {
    status: typeof record.status === "string" ? record.status : "UNKNOWN_ERROR",
    message: typeof record.message === "string" ? record.message : `Function returned HTTP ${response.status}.`,
  };
};

const fetchStudentQrContextAsync = async (studentId: string): Promise<StudentQrContext> => {
  const [{ data: profile, error: profileError }, { data: registrations, error: registrationsError }] = await Promise.all([
    supabase.from("profiles").select("display_name,email").eq("id", studentId).single<ProfileRow>(),
    supabase
      .from("event_registrations")
      .select("event_id")
      .eq("student_id", studentId)
      .eq("status", "REGISTERED")
      .returns<RegistrationRow[]>(),
  ]);

  if (profileError !== null) {
    throw new Error(`Failed to load student profile for QR screen: ${profileError.message}`);
  }

  if (registrationsError !== null) {
    throw new Error(`Failed to load registered events for QR screen: ${registrationsError.message}`);
  }

  const eventIds = registrations.map((registration) => registration.event_id);

  if (eventIds.length === 0) {
    return {
      studentDisplayName: getDisplayName(profile),
      registeredEvents: [],
    };
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id,name,city,start_at,end_at,minimum_stamps_required,status")
    .in("id", eventIds)
    .in("status", ["PUBLISHED", "ACTIVE"])
    .eq("visibility", "PUBLIC")
    .order("start_at", { ascending: true })
    .returns<EventRow[]>();

  if (eventsError !== null) {
    throw new Error(`Failed to load QR event context: ${eventsError.message}`);
  }

  return {
    studentDisplayName: getDisplayName(profile),
    registeredEvents: events.map(toRegisteredQrEvent),
  };
};

const fetchStudentEventStampCountAsync = async (eventId: string, studentId: string): Promise<StampCountResult> => {
  const { count, error } = await supabase
    .from("stamps")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("student_id", studentId)
    .eq("validation_status", "VALID");

  if (error !== null) {
    throw new Error(`Failed to load stamp progress for ${eventId}: ${error.message}`);
  }

  return {
    stampCount: count ?? 0,
  };
};

const fetchGenerateQrTokenAsync = async (
  accessToken: string,
  eventId: string
): Promise<GenerateQrTokenResponse> => {
  const response = await fetch(`${publicEnv.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-qr-token`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      eventId,
    }),
  });

  if (!response.ok) {
    const errorPayload = await readErrorResponseAsync(response);
    throw new Error(`${errorPayload.status}: ${errorPayload.message}`);
  }

  return (await response.json()) as GenerateQrTokenResponse;
};

export const selectStudentQrEvent = (
  registeredEvents: RegisteredQrEvent[],
  now: number
): SelectedStudentQrEvent | null => {
  const activeEvent = registeredEvents.find((event) => {
    const startTime = new Date(event.startAt).getTime();
    const endTime = new Date(event.endAt).getTime();

    return now >= startTime && now <= endTime;
  });

  if (typeof activeEvent !== "undefined") {
    return {
      ...activeEvent,
      viewState: "ACTIVE",
    };
  }

  const upcomingEvent = registeredEvents.find((event) => now < new Date(event.startAt).getTime());

  if (typeof upcomingEvent === "undefined") {
    return null;
  }

  return {
    ...upcomingEvent,
    viewState: "UPCOMING",
  };
};

export const createQrSvgDataAsync = async (token: string): Promise<string> => {
  const svgMarkup = await QRCode.toString(token, {
    errorCorrectionLevel: "M",
    margin: 1,
    type: "svg",
    width: 280,
  });

  return svgMarkup;
};

export const useStudentQrContextQuery = ({
  studentId,
  isEnabled,
}: UseStudentQrContextQueryParams): UseQueryResult<StudentQrContext, Error> =>
  useQuery({
    queryKey: studentQrContextQueryKey(studentId),
    queryFn: async () => fetchStudentQrContextAsync(studentId),
    enabled: isEnabled,
  });

export const useStudentEventStampCountQuery = ({
  eventId,
  studentId,
  isEnabled,
}: UseStampCountQueryParams): UseQueryResult<StampCountResult, Error> =>
  useQuery({
    queryKey: studentEventStampCountQueryKey(eventId, studentId),
    queryFn: async () => fetchStudentEventStampCountAsync(eventId, studentId),
    enabled: isEnabled,
  });

export const useGenerateQrTokenQuery = ({
  accessToken,
  eventId,
  isEnabled,
}: UseGenerateQrTokenQueryParams): UseQueryResult<GenerateQrTokenResponse, Error> =>
  useQuery({
    queryKey: studentGenerateQrTokenQueryKey(eventId, accessToken),
    queryFn: async () => fetchGenerateQrTokenAsync(accessToken, eventId),
    enabled: isEnabled,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => {
      const result = query.state.data as GenerateQrTokenResponse | undefined;

      if (!isEnabled || typeof result === "undefined") {
        return false;
      }

      const expiresAtMs = new Date(result.expiresAt).getTime();
      const remainingMs = expiresAtMs - Date.now();

      if (remainingMs <= 0) {
        return 0;
      }

      return remainingMs;
    },
  });

export const useQrSvgQuery = ({
  token,
  isEnabled,
}: UseQrSvgQueryParams): UseQueryResult<string, Error> =>
  useQuery({
    queryKey: studentQrSvgQueryKey(token),
    queryFn: async () => createQrSvgDataAsync(token),
    enabled: isEnabled,
  });

export const useActiveAppState = (): boolean => {
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setIsActive(nextState === "active");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return isActive;
};

export const useQrScreenProtection = (): QrProtectionState => {
  const [state, setState] = useState<QrProtectionState>({
    detail: "Preparing screen-capture protection for this view.",
    status: "UNAVAILABLE",
  });

  useEffect(() => {
    if (Platform.OS === "web") {
      setState({
        detail: "Web preview cannot block screenshots, so this screen only shows the warning surface here.",
        status: "WEB_PREVIEW",
      });
      return;
    }

    let isActive = true;

    const enableProtectionAsync = async (): Promise<void> => {
      try {
        const available = await ScreenCapture.isAvailableAsync();

        if (!isActive) {
          return;
        }

        if (!available) {
          setState({
            detail: "Screen-capture prevention is not available on this device runtime.",
            status: "UNAVAILABLE",
          });
          return;
        }

        await ScreenCapture.preventScreenCaptureAsync();

        if (!isActive) {
          await ScreenCapture.allowScreenCaptureAsync();
          return;
        }

        setState({
          detail: "Screenshot and screen-recording prevention is active while this screen stays open.",
          status: "ACTIVE",
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState({
          detail: error instanceof Error ? error.message : "Unknown capture-protection error.",
          status: "ERROR",
        });
      }
    };

    void enableProtectionAsync();

    return () => {
      isActive = false;
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  return state;
};

export const useQrCountdown = (
  expiresAt: string | null,
  isEnabled: boolean
): number => {
  const now = useCurrentTime(isEnabled);

  return useMemo(() => {
    if (expiresAt === null) {
      return 0;
    }

    const nextRefreshAt = new Date(expiresAt).getTime();
    const remainingMs = Math.max(nextRefreshAt - now, 0);

    return Math.ceil(remainingMs / 1000);
  }, [expiresAt, now]);
};

export const useCurrentTime = (isEnabled: boolean): number => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const intervalId = globalThis.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [isEnabled]);

  return now;
};
