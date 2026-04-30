import type {
  StudentRewardEventProgress,
  StudentRewardOverview,
  StudentRewardTierProgress,
} from "@/features/rewards/types";

export type RewardNotificationCandidate = {
  key: string;
  eventId: string;
  eventName: string;
  coverImageUrl: string | null;
  tierId: string;
  tierTitle: string;
};

export type StudentStampCelebrationCandidate = {
  kind: "STAMP";
  key: string;
  eventId: string;
  eventName: string;
  coverImageUrl: string | null;
  stampCount: number;
};

export type StudentRewardCelebrationCandidate =
  | StudentStampCelebrationCandidate
  | (RewardNotificationCandidate & { kind: "REWARD" });

export type RewardNotificationSnapshot = {
  claimableKeys: Set<string>;
  outOfStockKeys: Set<string>;
  trackedEventIds: string[];
  claimableCandidates: RewardNotificationCandidate[];
  outOfStockCandidates: RewardNotificationCandidate[];
  eventStampCounts: Map<string, number>;
};

export const createRewardNotificationKey = (eventId: string, tierId: string): string =>
  `${eventId}:${tierId}`;

export const toRewardNotificationCandidate = (
  event: StudentRewardEventProgress,
  tier: StudentRewardTierProgress
): RewardNotificationCandidate => ({
  key: createRewardNotificationKey(event.id, tier.id),
  eventId: event.id,
  eventName: event.name,
  coverImageUrl: event.coverImageUrl,
  tierId: tier.id,
  tierTitle: tier.title,
});

export const toStudentStampCelebrationCandidate = (
  event: StudentRewardEventProgress
): StudentStampCelebrationCandidate => ({
  kind: "STAMP",
  key: `stamp:${event.id}:${event.stampCount}`,
  eventId: event.id,
  eventName: event.name,
  coverImageUrl: event.coverImageUrl,
  stampCount: event.stampCount,
});

export const createRewardNotificationSnapshot = (
  overview: StudentRewardOverview
): RewardNotificationSnapshot => {
  const claimableCandidates: RewardNotificationCandidate[] = [];
  const outOfStockCandidates: RewardNotificationCandidate[] = [];

  overview.events.forEach((event) => {
    event.tiers.forEach((tier) => {
      const candidate = toRewardNotificationCandidate(event, tier);

      if (tier.state === "CLAIMABLE") {
        claimableCandidates.push(candidate);
      }

      if (tier.state === "OUT_OF_STOCK") {
        outOfStockCandidates.push(candidate);
      }
    });
  });

  return {
    claimableKeys: new Set(claimableCandidates.map((candidate) => candidate.key)),
    outOfStockKeys: new Set(outOfStockCandidates.map((candidate) => candidate.key)),
    trackedEventIds: overview.events.map((event) => event.id),
    claimableCandidates,
    outOfStockCandidates,
    eventStampCounts: new Map(
      overview.events.map((event) => [event.id, event.stampCount] as const)
    ),
  };
};

export const filterNewCandidates = (
  currentCandidates: RewardNotificationCandidate[],
  previousKeys: Set<string>
): RewardNotificationCandidate[] =>
  currentCandidates.filter((candidate) => !previousKeys.has(candidate.key));

export const createRewardCelebrationCandidates = (
  candidates: RewardNotificationCandidate[]
): StudentRewardCelebrationCandidate[] =>
  candidates.map((candidate) => ({
    ...candidate,
    kind: "REWARD",
  }));

export const findNewStampCelebrationCandidates = (
  currentOverview: StudentRewardOverview,
  previousStampCounts: Map<string, number>
): StudentStampCelebrationCandidate[] =>
  currentOverview.events
    .filter((event) => event.stampCount > 0)
    .filter((event) => event.stampCount > (previousStampCounts.get(event.id) ?? 0))
    .map(toStudentStampCelebrationCandidate);
