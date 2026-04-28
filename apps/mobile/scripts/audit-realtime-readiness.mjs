import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFilePath);
const mobileRoot = path.resolve(scriptsDir, "..");
const mobileSourceRoot = path.join(mobileRoot, "src");
const qrSourcePath = path.join(mobileSourceRoot, "features", "qr", "student-qr.ts");
const leaderboardSourcePath = path.join(mobileSourceRoot, "features", "leaderboard", "student-leaderboard.ts");
const sessionProviderPath = path.join(mobileSourceRoot, "providers", "session-provider.tsx");
const rewardsSourcePath = path.join(mobileSourceRoot, "features", "rewards", "student-rewards.ts");
const leaderboardScreenPath = path.join(mobileSourceRoot, "app", "student", "leaderboard.tsx");
const activeEventScreenPath = path.join(mobileSourceRoot, "app", "student", "active-event.tsx");
const rewardsScreenPath = path.join(mobileSourceRoot, "app", "student", "rewards.tsx");
const eventDetailScreenPath = path.join(mobileSourceRoot, "app", "student", "events", "[eventId].tsx");
const plannedRealtimeDir = path.join(mobileSourceRoot, "features", "realtime");
const realtimeFeaturePath = path.join(plannedRealtimeDir, "student-realtime.ts");

const findSourceFilesAsync = async (directoryPath) => {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return findSourceFilesAsync(entryPath);
      }

      if (!entry.isFile()) {
        return [];
      }

      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        return [];
      }

      return [entryPath];
    })
  );

  return nestedFiles.flat();
};

const hasPathAsync = async (targetPath) => {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

const readUtf8Async = async (targetPath) => readFile(targetPath, "utf8");

const createRelativePath = (targetPath) => path.relative(mobileRoot, targetPath);

const isRealtimeLine = (line) => {
  const channelPattern = /\bchannel\s*\(/;

  return channelPattern.test(line) || line.includes("postgres_changes");
};

const extractBlock = (source, startMarker, endMarkers) => {
  const startIndex = source.indexOf(startMarker);

  if (startIndex === -1) {
    throw new Error(`Could not find block start: ${startMarker}`);
  }

  const endIndex = endMarkers
    .map((marker) => source.indexOf(marker, startIndex + startMarker.length))
    .filter((index) => index !== -1)
    .sort((left, right) => left - right)[0];

  if (typeof endIndex === "undefined") {
    return source.slice(startIndex);
  }

  return source.slice(startIndex, endIndex);
};

const collectRealtimeSubscriptionHitsAsync = async (sourceFiles) => {
  const matches = [];

  for (const sourceFile of sourceFiles) {
    const source = await readUtf8Async(sourceFile);
    const lines = source.split("\n");

    lines.forEach((line, index) => {
      if (!isRealtimeLine(line)) {
        return;
      }

      matches.push(`${createRelativePath(sourceFile)}:${index + 1}`);
    });
  }

  return matches;
};

const fail = (message, details) => {
  console.error(message);

  for (const detail of details) {
    console.error(detail);
  }

  process.exit(1);
};

const main = async () => {
  const sourceFiles = await findSourceFilesAsync(mobileSourceRoot);
  const realtimeSubscriptionHits = await collectRealtimeSubscriptionHitsAsync(sourceFiles);
  const realtimeDirExists = await hasPathAsync(plannedRealtimeDir);
  const realtimeFeatureExists = await hasPathAsync(realtimeFeaturePath);
  const qrSource = await readUtf8Async(qrSourcePath);
  const leaderboardSource = await readUtf8Async(leaderboardSourcePath);
  const rewardsSource = await readUtf8Async(rewardsSourcePath);
  const sessionProviderSource = await readUtf8Async(sessionProviderPath);
  const leaderboardScreenSource = await readUtf8Async(leaderboardScreenPath);
  const activeEventScreenSource = await readUtf8Async(activeEventScreenPath);
  const rewardsScreenSource = await readUtf8Async(rewardsScreenPath);
  const eventDetailScreenSource = await readUtf8Async(eventDetailScreenPath);
  const realtimeFeatureSource = realtimeFeatureExists ? await readUtf8Async(realtimeFeaturePath) : "";
  const qrPollingBlock = extractBlock(qrSource, "export const useGenerateQrTokenQuery", [
    "export const useQrSvgQuery",
  ]);
  const stampSnapshotBlock = extractBlock(qrSource, "export const useStudentEventStampCountQuery", [
    "export const useGenerateQrTokenQuery",
  ]);
  const leaderboardOverviewBlock = extractBlock(
    leaderboardSource,
    "export const useStudentLeaderboardOverviewQuery",
    ["export const useEventLeaderboardQuery"]
  );
  const leaderboardEventBlock = extractBlock(
    leaderboardSource,
    "export const useEventLeaderboardQuery",
    []
  );
  const rewardOverviewBlock = extractBlock(
    rewardsSource,
    "export const useStudentRewardOverviewQuery",
    ["export const useStudentRewardEventQuery"]
  );
  const rewardEventBlock = extractBlock(rewardsSource, "export const useStudentRewardEventQuery", []);

  const qrUsesPolling =
    qrPollingBlock.includes("fetchGenerateQrTokenAsync") && qrPollingBlock.includes("refetchInterval");
  const stampUsesSnapshotOnly =
    stampSnapshotBlock.includes("fetchStudentEventStampCountAsync") &&
    !stampSnapshotBlock.includes("refetchInterval") &&
    !isRealtimeLine(stampSnapshotBlock);
  const leaderboardUsesSnapshotOnly =
    leaderboardOverviewBlock.includes("fetchStudentLeaderboardOverviewAsync") &&
    leaderboardEventBlock.includes("fetchEventLeaderboardAsync") &&
    !leaderboardOverviewBlock.includes("refetchInterval") &&
    !leaderboardEventBlock.includes("refetchInterval") &&
    !isRealtimeLine(leaderboardOverviewBlock) &&
    !isRealtimeLine(leaderboardEventBlock);
  const rewardQueriesUseSnapshotOnly =
    rewardOverviewBlock.includes("fetchStudentRewardOverviewAsync") &&
    rewardEventBlock.includes("fetchStudentRewardEventProgressAsync") &&
    !rewardOverviewBlock.includes("refetchInterval") &&
    !rewardEventBlock.includes("refetchInterval") &&
    !isRealtimeLine(rewardOverviewBlock) &&
    !isRealtimeLine(rewardEventBlock);
  const sessionProviderUsesOnlyAuthSubscription =
    sessionProviderSource.includes("onAuthStateChange") &&
    !isRealtimeLine(sessionProviderSource);
  const realtimeFoundationWired =
    realtimeFeatureSource.includes('table: "leaderboard_updates"') &&
    realtimeFeatureSource.includes('table: "stamps"') &&
    realtimeFeatureSource.includes('table: "reward_claims"') &&
    realtimeFeatureSource.includes("filter: `event_id=eq.${eventId}`") &&
    realtimeFeatureSource.includes("filter: `student_id=eq.${studentId}`") &&
    realtimeFeatureSource.includes("eventLeaderboardQueryKey") &&
    realtimeFeatureSource.includes("studentRewardOverviewQueryKey") &&
    realtimeFeatureSource.includes("studentRewardEventQueryKey") &&
    realtimeFeatureSource.includes("student-leaderboard-catch-up") &&
    realtimeFeatureSource.includes("student-reward-progress-catch-up") &&
    leaderboardScreenSource.includes("useStudentEventLeaderboardRealtime") &&
    activeEventScreenSource.includes("useStudentRewardProgressRealtime") &&
    rewardsScreenSource.includes("useStudentRewardProgressRealtime");
  const sharedInventoryRealtimeWired =
    realtimeFeatureSource.includes('table: "reward_tiers"') &&
    realtimeFeatureSource.includes("studentEventDetailQueryKey") &&
    realtimeFeatureSource.includes("student-reward-inventory-catch-up") &&
    realtimeFeatureSource.includes("payloadTouchesTrackedEvents") &&
    activeEventScreenSource.includes("useStudentRewardInventoryRealtime") &&
    rewardsScreenSource.includes("useStudentRewardInventoryRealtime") &&
    eventDetailScreenSource.includes("useStudentRewardInventoryRealtime");

  if (!qrUsesPolling) {
    fail("mobile-realtime-audit:missing-qr-polling", [
      "Expected student QR flow to keep the current polling refresh path.",
      `Checked file: ${createRelativePath(qrSourcePath)}`,
    ]);
  }

  if (!stampUsesSnapshotOnly) {
    fail("mobile-realtime-audit:unexpected-stamp-refresh-shape", [
      "Stamp progress query no longer matches the expected snapshot-only shape.",
      `Checked file: ${createRelativePath(qrSourcePath)}`,
    ]);
  }

  if (!leaderboardUsesSnapshotOnly) {
    fail("mobile-realtime-audit:unexpected-leaderboard-refresh-shape", [
      "Leaderboard queries no longer match the expected snapshot-only shape.",
      `Checked file: ${createRelativePath(leaderboardSourcePath)}`,
    ]);
  }

  if (!rewardQueriesUseSnapshotOnly) {
    fail("mobile-realtime-audit:unexpected-reward-refresh-shape", [
      "Reward queries no longer match the expected snapshot-only fetch shape.",
      `Checked file: ${createRelativePath(rewardsSourcePath)}`,
    ]);
  }

  if (!sessionProviderUsesOnlyAuthSubscription) {
    fail("mobile-realtime-audit:unexpected-session-provider-shape", [
      "Session provider no longer matches the expected auth-only subscription pattern.",
      `Checked file: ${createRelativePath(sessionProviderPath)}`,
    ]);
  }

  if (!realtimeDirExists || !realtimeFeatureExists || !realtimeFoundationWired || !sharedInventoryRealtimeWired) {
    const details = [
      "Expected the mobile Realtime foundation to be wired for leaderboard, current-student progress, and shared inventory freshness.",
      `Realtime directory present: ${realtimeDirExists}`,
      `Realtime feature file present: ${realtimeFeatureExists}`,
      `Shared inventory wiring present: ${sharedInventoryRealtimeWired}`,
      `Realtime markers: ${realtimeSubscriptionHits.join(", ") || "none"}`,
    ];

    fail("mobile-realtime-audit:missing-realtime-foundation", details);
  }

  console.log(
    [
      "mobile-realtime-state:FOUNDATION_ACTIVE",
      "leaderboard-mode:realtime-invalidation",
      "student-progress-mode:realtime-invalidation",
      "shared-inventory-mode:realtime-invalidation",
      "qr-mode:polling-refresh",
      `realtime-subscriptions:${realtimeSubscriptionHits.length}`,
      `realtime-feature-dir:${realtimeFeatureExists ? "present" : "missing"}`,
    ].join("|")
  );
};

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`mobile-realtime-audit:failed|${message}`);
  process.exit(1);
});
