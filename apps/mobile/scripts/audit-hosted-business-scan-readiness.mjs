import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDir, "..");
const root = path.resolve(mobileRoot, "..", "..");
const sourceRoot = path.join(mobileRoot, "src");

const packageJsonPath = path.join(mobileRoot, "package.json");
const studentActiveEventPath = path.join(sourceRoot, "app", "student", "active-event.tsx");
const businessScannerPath = path.join(sourceRoot, "app", "business", "scanner.tsx");
const businessPasswordSignInPath = path.join(
  sourceRoot,
  "features",
  "auth",
  "components",
  "business-password-sign-in.tsx"
);
const readmePath = path.join(mobileRoot, "README.md");
const testingDocPath = path.join(root, "docs", "TESTING.md");

const readUtf8Async = async (filePath) => fs.readFile(filePath, "utf8");

const fail = (code, details) => {
  console.error(code);
  details.forEach((detail) => {
    console.error(`- ${detail}`);
  });
  process.exit(1);
};

const main = async () => {
  const [
    packageJsonSource,
    studentActiveEventSource,
    businessScannerSource,
    businessPasswordSignInSource,
    readmeSource,
    testingDocSource,
  ] = await Promise.all([
    readUtf8Async(packageJsonPath),
    readUtf8Async(studentActiveEventPath),
    readUtf8Async(businessScannerPath),
    readUtf8Async(businessPasswordSignInPath),
    readUtf8Async(readmePath),
    readUtf8Async(testingDocPath),
  ]);

  const packageWired = packageJsonSource.includes('"audit:hosted-business-scan-readiness"');
  const studentQrScenePresent =
    studentActiveEventSource.includes("Show at the venue desk") &&
    studentActiveEventSource.includes("Active leima pass") &&
    studentActiveEventSource.includes("Preview leima");
  const scannerFallbackGuidancePresent =
    businessScannerSource.includes("Manual token scan") &&
    businessScannerSource.includes("Paste LEIMA_STAMP_QR token") &&
    businessScannerSource.includes("scanPastedToken");
  const businessSignInFlowPresent =
    businessPasswordSignInSource.includes("businessCheckingAccess") &&
    businessPasswordSignInSource.includes("returnKeyType=\"done\"");

  const normalizedReadme = readmeSource.toLowerCase();
  const normalizedTestingDoc = testingDocSource.toLowerCase();
  const docsAligned =
    normalizedReadme.includes("hosted scanner smoke") &&
    normalizedReadme.includes("manual token scan") &&
    normalizedTestingDoc.includes("mobile hosted business scan readiness") &&
    normalizedTestingDoc.includes("manual token scan");

  if (
    !packageWired ||
    !studentQrScenePresent ||
    !scannerFallbackGuidancePresent ||
    !businessSignInFlowPresent ||
    !docsAligned
  ) {
    fail("mobile-hosted-business-scan-readiness:failed", [
      `packageWired=${packageWired}`,
      `studentQrScenePresent=${studentQrScenePresent}`,
      `scannerFallbackGuidancePresent=${scannerFallbackGuidancePresent}`,
      `businessSignInFlowPresent=${businessSignInFlowPresent}`,
      `docsAligned=${docsAligned}`,
    ]);
  }

  console.log(
    [
      "mobile-hosted-business-scan:repo-wired",
      "student-qr-scene:present",
      "scanner-manual-fallback:aligned",
      "business-sign-in-flow:aligned",
      "docs:aligned",
    ].join("|")
  );
};

void main();
