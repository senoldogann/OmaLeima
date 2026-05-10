import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { ClubMembershipSummary } from "@/features/club/types";
import { supabase } from "@/lib/supabase";

export type ClubReportEvent = {
  attendanceRate: number;
  city: string;
  claimedRewardCount: number;
  endAt: string;
  eventId: string;
  joinedVenueCount: number;
  name: string;
  registeredParticipantCount: number;
  rewardClaimRate: number;
  startAt: string;
  status: string;
  ticketUrl: string | null;
  uniqueStampedStudentCount: number;
  validStampCount: number;
};

export type ClubReportSummary = {
  claimedRewardCount: number;
  eventCount: number;
  joinedVenueCount: number;
  registeredParticipantCount: number;
  uniqueStampedStudentCount: number;
  validStampCount: number;
};

export type ClubReportSnapshot = {
  events: ClubReportEvent[];
  summary: ClubReportSummary;
};

type UseClubReportQueryParams = {
  isEnabled: boolean;
  memberships: ClubMembershipSummary[];
  userId: string;
};

type RpcReportPayload = {
  events?: unknown;
  summary?: unknown;
};

type RpcReportEventPayload = {
  attendanceRate?: unknown;
  city?: unknown;
  claimedRewardCount?: unknown;
  endAt?: unknown;
  eventId?: unknown;
  joinedVenueCount?: unknown;
  name?: unknown;
  registeredParticipantCount?: unknown;
  rewardClaimRate?: unknown;
  startAt?: unknown;
  status?: unknown;
  ticketUrl?: unknown;
  uniqueStampedStudentCount?: unknown;
  validStampCount?: unknown;
};

type RpcReportSummaryPayload = {
  claimedRewardCount?: unknown;
  eventCount?: unknown;
  joinedVenueCount?: unknown;
  registeredParticipantCount?: unknown;
  uniqueStampedStudentCount?: unknown;
  validStampCount?: unknown;
};

export const clubReportQueryKey = (userId: string) => ["club-report", userId] as const;

const reportWindowDays = 180;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const readNumber = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const readString = (value: unknown): string => (typeof value === "string" ? value : "");

const readOptionalString = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

const mapSummary = (value: unknown): ClubReportSummary => {
  const summary = isRecord(value) ? (value as RpcReportSummaryPayload) : {};

  return {
    claimedRewardCount: readNumber(summary.claimedRewardCount),
    eventCount: readNumber(summary.eventCount),
    joinedVenueCount: readNumber(summary.joinedVenueCount),
    registeredParticipantCount: readNumber(summary.registeredParticipantCount),
    uniqueStampedStudentCount: readNumber(summary.uniqueStampedStudentCount),
    validStampCount: readNumber(summary.validStampCount),
  };
};

const mapEvent = (value: unknown): ClubReportEvent | null => {
  if (!isRecord(value)) {
    return null;
  }

  const event = value as RpcReportEventPayload;
  const eventId = readString(event.eventId);
  const name = readString(event.name);

  if (eventId.length === 0 || name.length === 0) {
    return null;
  }

  return {
    attendanceRate: readNumber(event.attendanceRate),
    city: readString(event.city),
    claimedRewardCount: readNumber(event.claimedRewardCount),
    endAt: readString(event.endAt),
    eventId,
    joinedVenueCount: readNumber(event.joinedVenueCount),
    name,
    registeredParticipantCount: readNumber(event.registeredParticipantCount),
    rewardClaimRate: readNumber(event.rewardClaimRate),
    startAt: readString(event.startAt),
    status: readString(event.status),
    ticketUrl: readOptionalString(event.ticketUrl),
    uniqueStampedStudentCount: readNumber(event.uniqueStampedStudentCount),
    validStampCount: readNumber(event.validStampCount),
  };
};

const addSummaries = (left: ClubReportSummary, right: ClubReportSummary): ClubReportSummary => ({
  claimedRewardCount: left.claimedRewardCount + right.claimedRewardCount,
  eventCount: left.eventCount + right.eventCount,
  joinedVenueCount: left.joinedVenueCount + right.joinedVenueCount,
  registeredParticipantCount: left.registeredParticipantCount + right.registeredParticipantCount,
  uniqueStampedStudentCount: left.uniqueStampedStudentCount + right.uniqueStampedStudentCount,
  validStampCount: left.validStampCount + right.validStampCount,
});

const emptySummary: ClubReportSummary = {
  claimedRewardCount: 0,
  eventCount: 0,
  joinedVenueCount: 0,
  registeredParticipantCount: 0,
  uniqueStampedStudentCount: 0,
  validStampCount: 0,
};

const fetchClubReportAsync = async (memberships: ClubMembershipSummary[]): Promise<ClubReportSnapshot> => {
  const to = new Date();
  const from = new Date(to.getTime() - reportWindowDays * 24 * 60 * 60 * 1000);
  const reportPayloads = await Promise.all(
    memberships.map(async (membership): Promise<RpcReportPayload> => {
      const { data, error } = await supabase.rpc("get_club_report", {
        p_club_id: membership.clubId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });

      if (error !== null) {
        throw new Error(`Failed to load club report for ${membership.clubId}: ${error.message}`);
      }

      return isRecord(data) ? (data as RpcReportPayload) : {};
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

export const useClubReportQuery = ({
  isEnabled,
  memberships,
  userId,
}: UseClubReportQueryParams): UseQueryResult<ClubReportSnapshot, Error> =>
  useQuery({
    enabled: isEnabled && memberships.length > 0,
    queryFn: () => fetchClubReportAsync(memberships),
    queryKey: clubReportQueryKey(userId),
  });
