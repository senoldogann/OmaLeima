import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { BusinessMembershipSummary } from "@/features/business/types";
import { supabase } from "@/lib/supabase";

export type BusinessRoiEvent = {
  activeScannerCount: number;
  city: string;
  endAt: string;
  eventId: string;
  name: string;
  repeatStudentCount: number;
  repeatVisitRate: number;
  startAt: string;
  status: string;
  uniqueStudentCount: number;
  validStampCount: number;
  venueStatus: string;
};

export type BusinessRoiSummary = {
  activeScannerCount: number;
  eventCount: number;
  joinedEventCount: number;
  repeatStudentCount: number;
  uniqueStudentCount: number;
  validStampCount: number;
};

export type BusinessRoiSnapshot = {
  events: BusinessRoiEvent[];
  summary: BusinessRoiSummary;
};

type UseBusinessRoiQueryParams = {
  isEnabled: boolean;
  memberships: BusinessMembershipSummary[];
  userId: string;
};

type RpcRoiPayload = {
  events?: unknown;
  summary?: unknown;
};

type RpcRoiEventPayload = {
  activeScannerCount?: unknown;
  city?: unknown;
  endAt?: unknown;
  eventId?: unknown;
  name?: unknown;
  repeatStudentCount?: unknown;
  repeatVisitRate?: unknown;
  startAt?: unknown;
  status?: unknown;
  uniqueStudentCount?: unknown;
  validStampCount?: unknown;
  venueStatus?: unknown;
};

type RpcRoiSummaryPayload = {
  activeScannerCount?: unknown;
  eventCount?: unknown;
  joinedEventCount?: unknown;
  repeatStudentCount?: unknown;
  uniqueStudentCount?: unknown;
  validStampCount?: unknown;
};

export const businessRoiQueryKey = (userId: string) => ["business-roi", userId] as const;

const reportWindowDays = 180;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const readNumber = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const readString = (value: unknown): string => (typeof value === "string" ? value : "");

const mapSummary = (value: unknown): BusinessRoiSummary => {
  const summary = isRecord(value) ? (value as RpcRoiSummaryPayload) : {};

  return {
    activeScannerCount: readNumber(summary.activeScannerCount),
    eventCount: readNumber(summary.eventCount),
    joinedEventCount: readNumber(summary.joinedEventCount),
    repeatStudentCount: readNumber(summary.repeatStudentCount),
    uniqueStudentCount: readNumber(summary.uniqueStudentCount),
    validStampCount: readNumber(summary.validStampCount),
  };
};

const mapEvent = (value: unknown): BusinessRoiEvent | null => {
  if (!isRecord(value)) {
    return null;
  }

  const event = value as RpcRoiEventPayload;
  const eventId = readString(event.eventId);
  const name = readString(event.name);

  if (eventId.length === 0 || name.length === 0) {
    return null;
  }

  return {
    activeScannerCount: readNumber(event.activeScannerCount),
    city: readString(event.city),
    endAt: readString(event.endAt),
    eventId,
    name,
    repeatStudentCount: readNumber(event.repeatStudentCount),
    repeatVisitRate: readNumber(event.repeatVisitRate),
    startAt: readString(event.startAt),
    status: readString(event.status),
    uniqueStudentCount: readNumber(event.uniqueStudentCount),
    validStampCount: readNumber(event.validStampCount),
    venueStatus: readString(event.venueStatus),
  };
};

const addSummaries = (left: BusinessRoiSummary, right: BusinessRoiSummary): BusinessRoiSummary => ({
  activeScannerCount: left.activeScannerCount + right.activeScannerCount,
  eventCount: left.eventCount + right.eventCount,
  joinedEventCount: left.joinedEventCount + right.joinedEventCount,
  repeatStudentCount: left.repeatStudentCount + right.repeatStudentCount,
  uniqueStudentCount: left.uniqueStudentCount + right.uniqueStudentCount,
  validStampCount: left.validStampCount + right.validStampCount,
});

const emptySummary: BusinessRoiSummary = {
  activeScannerCount: 0,
  eventCount: 0,
  joinedEventCount: 0,
  repeatStudentCount: 0,
  uniqueStudentCount: 0,
  validStampCount: 0,
};

const fetchBusinessRoiAsync = async (memberships: BusinessMembershipSummary[]): Promise<BusinessRoiSnapshot> => {
  const to = new Date();
  const from = new Date(to.getTime() - reportWindowDays * 24 * 60 * 60 * 1000);
  const managerMemberships = memberships.filter((membership) => membership.role === "OWNER" || membership.role === "MANAGER");
  const reportPayloads = await Promise.all(
    managerMemberships.map(async (membership): Promise<RpcRoiPayload> => {
      const { data, error } = await supabase.rpc("get_business_roi_report", {
        p_business_id: membership.businessId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });

      if (error !== null) {
        throw new Error(`Failed to load business ROI report for ${membership.businessId}: ${error.message}`);
      }

      return isRecord(data) ? (data as RpcRoiPayload) : {};
    })
  );

  return {
    events: reportPayloads.flatMap((payload) =>
      Array.isArray(payload.events)
        ? payload.events.flatMap((event) => {
          const mappedEvent = mapEvent(event);
          return mappedEvent === null ? [] : [mappedEvent];
        })
        : []
    ),
    summary: reportPayloads.reduce((summary, payload) => addSummaries(summary, mapSummary(payload.summary)), emptySummary),
  };
};

export const useBusinessRoiQuery = ({
  isEnabled,
  memberships,
  userId,
}: UseBusinessRoiQueryParams): UseQueryResult<BusinessRoiSnapshot, Error> =>
  useQuery({
    enabled: isEnabled && memberships.some((membership) => membership.role === "OWNER" || membership.role === "MANAGER"),
    queryFn: () => fetchBusinessRoiAsync(memberships),
    queryKey: businessRoiQueryKey(userId),
  });
