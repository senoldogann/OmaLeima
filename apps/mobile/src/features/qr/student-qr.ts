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
  refetchIntervalMs?: number | false;
  refetchOnMount?: boolean | "always";
  refetchOnReconnect?: boolean | "always";
};

type UseGenerateQrTokenQueryParams = {
  accessToken: string;
  eventId: string;
  isEnabled: boolean;
  sessionCacheKey: string;
};

type UseQrSvgQueryParams = {
  eventId: string;
  token: string;
  tokenVersion: string;
  isEnabled: boolean;
};

type QrProtectionState = {
  detail: string;
  status: QrProtectionStatus;
};

const minimumQrRefetchIntervalMs = 250;
const qrDarkModuleColor = "#111827";
const qrGradientId = "omaLeimaQrGradient";
const qrGradientMarkup = `<defs><linearGradient id="${qrGradientId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5b21b6"/><stop offset="52%" stop-color="#b91c1c"/><stop offset="100%" stop-color="#a16207"/></linearGradient></defs>`;

export const studentQrContextQueryKey = (studentId: string) => ["student-qr-context", studentId] as const;

export const studentEventStampCountQueryKey = (eventId: string, studentId: string) =>
  ["student-event-stamp-count", eventId, studentId] as const;

export const studentGenerateQrTokenQueryKey = (eventId: string, sessionCacheKey: string) =>
  ["student-generate-qr-token", eventId, sessionCacheKey] as const;

export const studentQrSvgQueryKey = (eventId: string, tokenVersion: string) =>
  ["student-qr-svg", eventId, tokenVersion] as const;

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
      apikey: publicEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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

export const selectStudentQrEvents = (
  registeredEvents: RegisteredQrEvent[],
  now: number
): SelectedStudentQrEvent[] => {
  const activeEvents = registeredEvents.flatMap((event): SelectedStudentQrEvent[] => {
    const startTime = new Date(event.startAt).getTime();
    const endTime = new Date(event.endAt).getTime();

    if (now < startTime || now > endTime) {
      return [];
    }

    return [
      {
        ...event,
        viewState: "ACTIVE",
      },
    ];
  });

  const upcomingEvents = registeredEvents.flatMap((event): SelectedStudentQrEvent[] => {
    const startTime = new Date(event.startAt).getTime();

    if (now >= startTime) {
      return [];
    }

    return [
      {
        ...event,
        viewState: "UPCOMING",
      },
    ];
  });

  return [...activeEvents, ...upcomingEvents];
};

export const selectStudentQrEvent = (
  registeredEvents: RegisteredQrEvent[],
  now: number
): SelectedStudentQrEvent | null => selectStudentQrEvents(registeredEvents, now)[0] ?? null;

export const createQrSvgDataAsync = async (token: string): Promise<string> => {
  const svgMarkup = await QRCode.toString(token, {
    color: {
      dark: qrDarkModuleColor,
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
    margin: 1,
    type: "svg",
    width: 280,
  });

  const gradientStrokeMarkup = `stroke="url(#${qrGradientId})"`;

  if (!svgMarkup.includes(`stroke="${qrDarkModuleColor}"`)) {
    return svgMarkup;
  }

  const rootTagEndIndex = svgMarkup.indexOf(">");

  if (rootTagEndIndex === -1) {
    return svgMarkup.replace(`stroke="${qrDarkModuleColor}"`, gradientStrokeMarkup);
  }

  return `${svgMarkup.slice(0, rootTagEndIndex + 1)}${qrGradientMarkup}${svgMarkup
    .slice(rootTagEndIndex + 1)
    .replace(`stroke="${qrDarkModuleColor}"`, gradientStrokeMarkup)}`;
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
  refetchIntervalMs,
  refetchOnMount,
  refetchOnReconnect,
}: UseStampCountQueryParams): UseQueryResult<StampCountResult, Error> =>
  useQuery({
    queryKey: studentEventStampCountQueryKey(eventId, studentId),
    queryFn: async () => fetchStudentEventStampCountAsync(eventId, studentId),
    enabled: isEnabled,
    refetchInterval: typeof refetchIntervalMs === "number" ? refetchIntervalMs : false,
    refetchOnMount,
    refetchOnReconnect,
  });

export const useGenerateQrTokenQuery = ({
  accessToken,
  eventId,
  isEnabled,
  sessionCacheKey,
}: UseGenerateQrTokenQueryParams): UseQueryResult<GenerateQrTokenResponse, Error> =>
  useQuery({
    queryKey: studentGenerateQrTokenQueryKey(eventId, sessionCacheKey),
    queryFn: async () => fetchGenerateQrTokenAsync(accessToken, eventId),
    enabled: isEnabled,
    gcTime: minimumQrRefetchIntervalMs,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchInterval: (query) => {
      const result = query.state.data as GenerateQrTokenResponse | undefined;

      if (!isEnabled) {
        return false;
      }

      if (typeof result === "undefined") {
        return minimumQrRefetchIntervalMs;
      }

      const expiresAtMs = new Date(result.expiresAt).getTime();
      const remainingMs = expiresAtMs - Date.now();

      if (remainingMs <= 0) {
        return minimumQrRefetchIntervalMs;
      }

      return Math.max(remainingMs, minimumQrRefetchIntervalMs);
    },
  });

export const useQrSvgQuery = ({
  eventId,
  token,
  tokenVersion,
  isEnabled,
}: UseQrSvgQueryParams): UseQueryResult<string, Error> =>
  useQuery({
    queryKey: studentQrSvgQueryKey(eventId, tokenVersion),
    queryFn: async () => createQrSvgDataAsync(token),
    enabled: isEnabled,
    gcTime: minimumQrRefetchIntervalMs,
    staleTime: 0,
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

export const useQrScreenProtection = (isEnabled: boolean): QrProtectionState => {
  const [state, setState] = useState<QrProtectionState>({
    detail: "Preparing screen-capture protection for this view.",
    status: "UNAVAILABLE",
  });

  useEffect(() => {
    if (!isEnabled) {
      setState({
        detail: "Screen-capture prevention is inactive outside the live QR view.",
        status: "UNAVAILABLE",
      });

      if (Platform.OS !== "web") {
        void ScreenCapture.allowScreenCaptureAsync().catch((error: unknown) => {
          setState({
            detail: error instanceof Error ? error.message : "Unknown capture-protection release error.",
            status: "ERROR",
          });
        });
      }

      return;
    }

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
  }, [isEnabled]);

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
