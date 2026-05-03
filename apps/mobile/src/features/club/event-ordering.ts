import type { ClubDashboardEventSummary, ClubDashboardTimelineState } from "@/features/club/types";

const timelinePriority: Record<ClubDashboardTimelineState, number> = {
  LIVE: 0,
  UPCOMING: 1,
  DRAFT: 2,
  CANCELLED: 3,
  COMPLETED: 4,
};

const historicalTimelineStates = new Set<ClubDashboardTimelineState>(["CANCELLED", "COMPLETED"]);

const compareEventStartTimes = (
  leftEvent: ClubDashboardEventSummary,
  rightEvent: ClubDashboardEventSummary
): number => {
  const leftTime = new Date(leftEvent.startAt).getTime();
  const rightTime = new Date(rightEvent.startAt).getTime();
  const leftIsHistorical = historicalTimelineStates.has(leftEvent.timelineState);
  const rightIsHistorical = historicalTimelineStates.has(rightEvent.timelineState);

  if (leftIsHistorical && rightIsHistorical) {
    return rightTime - leftTime;
  }

  return leftTime - rightTime;
};

export const sortClubEventsForOrganizer = (
  events: readonly ClubDashboardEventSummary[]
): ClubDashboardEventSummary[] =>
  [...events].sort((leftEvent, rightEvent) => {
    const priorityDifference =
      timelinePriority[leftEvent.timelineState] - timelinePriority[rightEvent.timelineState];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return compareEventStartTimes(leftEvent, rightEvent);
  });
