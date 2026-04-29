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
  const studentDiagnosticsPresent =
    studentActiveEventSource.includes("Hosted scanner smoke token") &&
    studentActiveEventSource.includes("showHostedSmokeCard") &&
    studentActiveEventSource.includes("__DEV__") &&
    studentActiveEventSource.includes("current hosted scanner account") &&
    studentActiveEventSource.includes("raw QR JWT should never be exposed");
  const scannerFallbackGuidancePresent =
    businessScannerSource.includes("Same-device hosted smoke") &&
    businessScannerSource.includes("copy the active token from My QR") &&
    businessScannerSource.includes("current hosted scanner account");
  const businessSignInCopyAligned =
    businessPasswordSignInSource.includes("current scanner credential from the local operator file") &&
    businessPasswordSignInSource.includes("__DEV__");

  const normalizedReadme = readmeSource.toLowerCase();
  const normalizedTestingDoc = testingDocSource.toLowerCase();
  const docsAligned =
    normalizedReadme.includes("hosted same-device scanner smoke") &&
    normalizedReadme.includes("hosted scanner smoke token") &&
    normalizedTestingDoc.includes("mobile hosted business scan readiness") &&
    normalizedTestingDoc.includes("same physical iphone");

  if (
    !packageWired ||
    !studentDiagnosticsPresent ||
    !scannerFallbackGuidancePresent ||
    !businessSignInCopyAligned ||
    !docsAligned
  ) {
    fail("mobile-hosted-business-scan-readiness:failed", [
      `packageWired=${packageWired}`,
      `studentDiagnosticsPresent=${studentDiagnosticsPresent}`,
      `scannerFallbackGuidancePresent=${scannerFallbackGuidancePresent}`,
      `businessSignInCopyAligned=${businessSignInCopyAligned}`,
      `docsAligned=${docsAligned}`,
    ]);
  }

  console.log(
    [
      "mobile-hosted-business-scan:repo-wired",
      "student-qr-dev-surface:present",
      "scanner-manual-fallback:aligned",
      "hosted-scanner-account-copy:aligned",
      "docs:aligned",
    ].join("|")
  );
};

void main();
