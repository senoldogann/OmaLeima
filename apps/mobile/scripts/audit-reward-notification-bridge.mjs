import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDir, "..");
const root = path.resolve(mobileRoot, "..", "..");
const sourceRoot = path.join(mobileRoot, "src");

const providerPath = path.join(sourceRoot, "providers", "app-providers.tsx");
const bridgePath = path.join(sourceRoot, "features", "notifications", "student-reward-notifications.ts");
const rewardsScreenPath = path.join(sourceRoot, "app", "student", "rewards.tsx");
const readmePath = path.join(mobileRoot, "README.md");
const masterPlanPath = path.join(root, "LEIMA_APP_MASTER_PLAN.md");

const readUtf8Async = async (filePath) => fs.readFile(filePath, "utf8");

const fail = (code, details) => {
  console.error(code);
  details.forEach((detail) => {
    console.error(`- ${detail}`);
  });
  process.exit(1);
};

const main = async () => {
  const [providerSource, bridgeSource, rewardsScreenSource, readmeSource, masterPlanSource] = await Promise.all([
    readUtf8Async(providerPath),
    readUtf8Async(bridgePath),
    readUtf8Async(rewardsScreenPath),
    readUtf8Async(readmePath),
    readUtf8Async(masterPlanPath),
  ]);

  const providerWired = providerSource.includes("StudentRewardNotificationBridge");
  const bridgeMarkersPresent =
    bridgeSource.includes("useStudentRewardOverviewQuery") &&
    bridgeSource.includes("useStudentRewardOverviewRealtime") &&
    bridgeSource.includes("useStudentRewardOverviewInventoryRealtime") &&
    bridgeSource.includes('type: "REWARD_UNLOCKED_LOCAL"') &&
    bridgeSource.includes('type: "REWARD_STOCK_CHANGED_LOCAL"') &&
    bridgeSource.includes("presentLocalNotificationAsync");
  const rewardsScreenTrimmed =
    !rewardsScreenSource.includes("useStudentRewardProgressRealtime") &&
    !rewardsScreenSource.includes("useStudentRewardInventoryRealtime");
  const normalizedReadmeSource = readmeSource.toLowerCase();
  const normalizedMasterPlanSource = masterPlanSource.toLowerCase();
  const docsAligned =
    normalizedReadmeSource.includes("local foreground reward notifications") &&
    normalizedMasterPlanSource.includes("local foreground reward notifications are shipped") &&
    normalizedReadmeSource.includes("remote reward-unlocked push delivery now ships") &&
    normalizedMasterPlanSource.includes("remote reward-unlocked push delivery now ships");

  if (!providerWired || !bridgeMarkersPresent || !rewardsScreenTrimmed || !docsAligned) {
    fail("mobile-reward-notification-audit:failed", [
      `providerWired=${providerWired}`,
      `bridgeMarkersPresent=${bridgeMarkersPresent}`,
      `rewardsScreenTrimmed=${rewardsScreenTrimmed}`,
      `docsAligned=${docsAligned}`,
    ]);
  }

  console.log(
    [
      "student-reward-notification-bridge:present",
      "notification-mode:local-foreground",
      "remote-reward-push:backend-shipped",
      "reward-screen-ownership:provider-bridge",
      "docs:aligned",
    ].join("|")
  );
};

void main();
