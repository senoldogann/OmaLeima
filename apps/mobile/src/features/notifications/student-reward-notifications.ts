import { useEffect, useMemo, useRef } from "react";

import { useSessionAccessQuery } from "@/features/auth/session-access";
import { useActiveAppState } from "@/features/qr/student-qr";
import { useStudentRewardCelebration } from "@/features/notifications/student-reward-celebration";
import {
  createRewardNotificationSnapshot,
  createRewardCelebrationCandidates,
  findNewStampCelebrationCandidates,
  filterNewCandidates,
  type RewardNotificationCandidate,
  type RewardNotificationSnapshot,
} from "@/features/notifications/student-reward-notification-model";
import {
  useStudentRewardOverviewInventoryRealtime,
  useStudentRewardOverviewRealtime,
} from "@/features/realtime/student-realtime";
import { useStudentRewardOverviewQuery } from "@/features/rewards/student-rewards";
import { presentLocalNotificationAsync } from "@/lib/push";
import { useSession } from "@/providers/session-provider";

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
  const { triggerRewardCelebration } = useStudentRewardCelebration();
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
    if (
      studentId === null ||
      !isStudentSession ||
      notificationSnapshot === null ||
      overview === null ||
      !isAppActive
    ) {
      previousSnapshotRef.current = notificationSnapshot;
      return;
    }

    const previousSnapshot = previousSnapshotRef.current;

    if (previousSnapshot === null) {
      previousSnapshotRef.current = notificationSnapshot;
      return;
    }

    previousSnapshotRef.current = notificationSnapshot;
    const currentOverview = overview;

    const newlyUnlocked = filterNewCandidates(notificationSnapshot.claimableCandidates, previousSnapshot.claimableKeys);
    const newlyOutOfStock = filterNewCandidates(
      notificationSnapshot.outOfStockCandidates,
      previousSnapshot.outOfStockKeys
    );
    const newStamps = findNewStampCelebrationCandidates(
      currentOverview,
      previousSnapshot.eventStampCounts
    );

    if (newlyUnlocked.length === 0 && newlyOutOfStock.length === 0 && newStamps.length === 0) {
      return;
    }

    void (async () => {
      try {
        const celebrationCandidates =
          newStamps.length > 0
            ? newStamps
            : createRewardCelebrationCandidates(newlyUnlocked);
        triggerRewardCelebration(celebrationCandidates);
        await notifyRewardUnlocksAsync(studentId, newlyUnlocked);
        await notifyStockChangesAsync(studentId, newlyOutOfStock);
      } catch (error) {
        logRewardNotificationWarning("student-reward-notification-failed", {
          studentId,
          stampCount: newStamps.length,
          unlockCount: newlyUnlocked.length,
          outOfStockCount: newlyOutOfStock.length,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, [
    isAppActive,
    isStudentSession,
    notificationSnapshot,
    overview,
    studentId,
    triggerRewardCelebration,
  ]);

  return null;
};
