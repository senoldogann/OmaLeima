import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type {
  ClubReportEvent,
  ClubReportRecord,
  ClubReportsSnapshot,
  ClubReportSummary,
} from "@/features/club-reports/types";

const reportWindowDays = 180;

type RpcClubReportPayload = {
  clubId?: unknown;
  events?: unknown;
  from?: unknown;
  summary?: unknown;
  to?: unknown;
};

type RpcClubReportEventPayload = {
  activeRewardTierCount?: unknown;
  attendanceRate?: unknown;
  city?: unknown;
  claimedRewardCount?: unknown;
  endAt?: unknown;
  eventId?: unknown;
  joinedVenueCount?: unknown;
  manualReviewStampCount?: unknown;
  name?: unknown;
  registeredParticipantCount?: unknown;
  rewardClaimRate?: unknown;
  revokedStampCount?: unknown;
  startAt?: unknown;
  status?: unknown;
  ticketUrl?: unknown;
  uniqueStampedStudentCount?: unknown;
  validStampCount?: unknown;
};

type RpcClubReportSummaryPayload = {
  claimedRewardCount?: unknown;
  eventCount?: unknown;
  joinedVenueCount?: unknown;
  registeredParticipantCount?: unknown;
  uniqueStampedStudentCount?: unknown;
  validStampCount?: unknown;
};

const readNumber = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const readString = (value: unknown): string => (typeof value === "string" ? value : "");

const readOptionalString = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const mapSummary = (value: unknown): ClubReportSummary => {
  const summary = isRecord(value) ? (value as RpcClubReportSummaryPayload) : {};

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

  const event = value as RpcClubReportEventPayload;
  const eventId = readString(event.eventId);
  const name = readString(event.name);
  const startAt = readString(event.startAt);
  const endAt = readString(event.endAt);

  if (eventId.length === 0 || name.length === 0 || startAt.length === 0 || endAt.length === 0) {
    return null;
  }

  return {
    activeRewardTierCount: readNumber(event.activeRewardTierCount),
    attendanceRate: readNumber(event.attendanceRate),
    city: readString(event.city),
    claimedRewardCount: readNumber(event.claimedRewardCount),
    endAt,
    eventId,
    joinedVenueCount: readNumber(event.joinedVenueCount),
    manualReviewStampCount: readNumber(event.manualReviewStampCount),
    name,
    registeredParticipantCount: readNumber(event.registeredParticipantCount),
    rewardClaimRate: readNumber(event.rewardClaimRate),
    revokedStampCount: readNumber(event.revokedStampCount),
    startAt,
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

export const fetchClubReportsSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<ClubReportsSnapshot> => {
  const context = await fetchClubEventContextAsync(supabase);
  const to = new Date();
  const from = new Date(to.getTime() - reportWindowDays * 24 * 60 * 60 * 1000);
  const reports = await Promise.all(
    context.memberships.map(async (membership): Promise<ClubReportRecord> => {
      const { data, error } = await supabase.rpc("get_club_report", {
        p_club_id: membership.clubId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });

      if (error !== null) {
        throw new Error(`Failed to load club report for ${membership.clubId}: ${error.message}`);
      }

      const payload = isRecord(data) ? (data as RpcClubReportPayload) : {};
      const events = Array.isArray(payload.events)
        ? payload.events.flatMap((event) => {
          const mappedEvent = mapEvent(event);
          return mappedEvent === null ? [] : [mappedEvent];
        })
        : [];

      return {
        clubId: membership.clubId,
        clubName: membership.clubName,
        events,
        from: readString(payload.from) || from.toISOString(),
        summary: mapSummary(payload.summary),
        to: readString(payload.to) || to.toISOString(),
      };
    })
  );

  return {
    reports,
    selectedWindowDays: reportWindowDays,
    summary: reports.reduce((currentSummary, report) => addSummaries(currentSummary, report.summary), emptySummary),
  };
};
