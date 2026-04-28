import { useEffect, useMemo, useRef } from "react";

import { useSessionAccessQuery } from "@/features/auth/session-access";
import { useActiveAppState } from "@/features/qr/student-qr";
import {
  useStudentRewardOverviewInventoryRealtime,
  useStudentRewardOverviewRealtime,
} from "@/features/realtime/student-realtime";
import type {
  StudentRewardEventProgress,
  StudentRewardOverview,
  StudentRewardTierProgress,
} from "@/features/rewards/types";
import { useStudentRewardOverviewQuery } from "@/features/rewards/student-rewards";
import { presentLocalNotificationAsync } from "@/lib/push";
import { useSession } from "@/providers/session-provider";

type RewardNotificationCandidate = {
  key: string;
  eventId: string;
  eventName: string;
  tierId: string;
  tierTitle: string;
};

type RewardNotificationSnapshot = {
  claimableKeys: Set<string>;
  outOfStockKeys: Set<string>;
  trackedEventIds: string[];
  claimableCandidates: RewardNotificationCandidate[];
  outOfStockCandidates: RewardNotificationCandidate[];
};

const createRewardNotificationKey = (eventId: string, tierId: string): string => `${eventId}:${tierId}`;

const toRewardNotificationCandidate = (
  event: StudentRewardEventProgress,
  tier: StudentRewardTierProgress
): RewardNotificationCandidate => ({
  key: createRewardNotificationKey(event.id, tier.id),
  eventId: event.id,
  eventName: event.name,
  tierId: tier.id,
  tierTitle: tier.title,
});

const createRewardNotificationSnapshot = (overview: StudentRewardOverview): RewardNotificationSnapshot => {
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
  };
};

const createUnlockNotificationTitle = (candidates: RewardNotificationCandidate[]): string =>
  candidates.length === 1 ? "Reward unlocked" : `${candidates.length} rewards unlocked`;

const createUnlockNotificationBody = (candidates: RewardNotificationCandidate[]): string => {
  const [firstCandidate] = candidates;

  if (typeof firstCandidate === "undefined") {
    return "A reward is now claimable.";
  }

  if (candidates.length === 1) {
    return `${firstCandidate.tierTitle} is now claimable in ${firstCandidate.eventName}.`;
  }

  return `${firstCandidate.tierTitle} and ${candidates.length - 1} more rewards are now claimable.`;
};

const createStockChangeNotificationTitle = (candidates: RewardNotificationCandidate[]): string =>
  candidates.length === 1 ? "Reward stock changed" : `${candidates.length} rewards sold out`;

const createStockChangeNotificationBody = (candidates: RewardNotificationCandidate[]): string => {
  const [firstCandidate] = candidates;

  if (typeof firstCandidate === "undefined") {
    return "A reward is no longer available.";
  }

  if (candidates.length === 1) {
    return `${firstCandidate.tierTitle} is no longer available in ${firstCandidate.eventName}.`;
  }

  return `${firstCandidate.tierTitle} and ${candidates.length - 1} more rewards are no longer available.`;
};

const filterNewCandidates = (
  currentCandidates: RewardNotificationCandidate[],
  previousKeys: Set<string>
): RewardNotificationCandidate[] =>
  currentCandidates.filter((candidate) => !previousKeys.has(candidate.key));

const logRewardNotificationWarning = (code: string, detail: Record<string, unknown>): void => {
  console.warn(code, detail);
};

const notifyRewardUnlocksAsync = async (
  studentId: string,
  candidates: RewardNotificationCandidate[]
): Promise<void> => {
  if (candidates.length === 0) {
    return;
  }

  await presentLocalNotificationAsync({
    title: createUnlockNotificationTitle(candidates),
    body: createUnlockNotificationBody(candidates),
    data: {
      studentId,
      eventId: candidates[0]?.eventId ?? null,
      rewardTierId: candidates[0]?.tierId ?? null,
      type: "REWARD_UNLOCKED_LOCAL",
    },
    sound: "default",
  });
};

const notifyStockChangesAsync = async (
  studentId: string,
  candidates: RewardNotificationCandidate[]
): Promise<void> => {
  if (candidates.length === 0) {
    return;
  }

  await presentLocalNotificationAsync({
    title: createStockChangeNotificationTitle(candidates),
    body: createStockChangeNotificationBody(candidates),
    data: {
      studentId,
      eventId: candidates[0]?.eventId ?? null,
      rewardTierId: candidates[0]?.tierId ?? null,
      type: "REWARD_STOCK_CHANGED_LOCAL",
    },
    sound: "default",
  });
};

export const StudentRewardNotificationBridge = (): null => {
  const { session } = useSession();
  const isAppActive = useActiveAppState();
  const studentId = session?.user.id ?? null;
  const accessQuery = useSessionAccessQuery({
    userId: studentId ?? "",
    isEnabled: studentId !== null,
  });
  const isStudentSession = accessQuery.data?.area === "student";
  const overviewQuery = useStudentRewardOverviewQuery({
    studentId: studentId ?? "",
    isEnabled: studentId !== null && isStudentSession && isAppActive,
  });
  const overview = overviewQuery.data ?? null;
  const notificationSnapshot = useMemo(
    () => (overview === null ? null : createRewardNotificationSnapshot(overview)),
    [overview]
  );
  const trackedEventIds = notificationSnapshot?.trackedEventIds ?? [];
  const previousSnapshotRef = useRef<RewardNotificationSnapshot | null>(null);

  useStudentRewardOverviewRealtime({
    studentId: studentId ?? "",
    isEnabled: studentId !== null && isStudentSession && isAppActive,
  });

  useStudentRewardOverviewInventoryRealtime({
    trackedEventIds,
    studentId: studentId ?? "",
    isEnabled: studentId !== null && isStudentSession && isAppActive && trackedEventIds.length > 0,
  });

  useEffect(() => {
    if (studentId === null || !isStudentSession || notificationSnapshot === null || !isAppActive) {
      previousSnapshotRef.current = notificationSnapshot;
      return;
    }

    const previousSnapshot = previousSnapshotRef.current;

    if (previousSnapshot === null) {
      previousSnapshotRef.current = notificationSnapshot;
      return;
    }

    previousSnapshotRef.current = notificationSnapshot;

    const newlyUnlocked = filterNewCandidates(notificationSnapshot.claimableCandidates, previousSnapshot.claimableKeys);
    const newlyOutOfStock = filterNewCandidates(
      notificationSnapshot.outOfStockCandidates,
      previousSnapshot.outOfStockKeys
    );

    if (newlyUnlocked.length === 0 && newlyOutOfStock.length === 0) {
      return;
    }

    void (async () => {
      try {
        await notifyRewardUnlocksAsync(studentId, newlyUnlocked);
        await notifyStockChangesAsync(studentId, newlyOutOfStock);
      } catch (error) {
        logRewardNotificationWarning("student-reward-notification-failed", {
          studentId,
          unlockCount: newlyUnlocked.length,
          outOfStockCount: newlyOutOfStock.length,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, [isAppActive, isStudentSession, notificationSnapshot, studentId]);

  return null;
};
