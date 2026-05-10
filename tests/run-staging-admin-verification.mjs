import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const npmBinary = process.env.NPM_BINARY ?? "npm";

const requiredEnvironmentVariables = [
  "ADMIN_APP_BASE_URL",
];

const requireEnvironmentVariable = (variableName) => {
  const value = process.env[variableName];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${variableName} for staged admin verification.`);
  }
};

const verificationMode = process.env.STAGING_ADMIN_VERIFICATION_MODE ?? "authenticated";

const createBypassHeaders = () => {
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  return typeof bypassSecret === "string" && bypassSecret.length > 0
    ? {
        "x-vercel-protection-bypass": bypassSecret,
      }
    : undefined;
};

const runCommand = ({ command, args, label }) => {
  console.log(`\n== ${label} ==`);
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });
};

const commands = [
  {
    args: ["--prefix", "apps/admin", "run", "lint"],
    command: npmBinary,
    label: "Admin lint",
  },
  {
    args: ["--prefix", "apps/admin", "run", "typecheck"],
    command: npmBinary,
    label: "Admin typecheck",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:hosted-admin-access"],
    command: npmBinary,
    label: "Hosted admin access smoke",
  },
];

const runHostedPreflightAsync = async () => {
  console.log("\n== Hosted admin preflight ==");

  const appBaseUrl = process.env.ADMIN_APP_BASE_URL;

  requireEnvironmentVariable("ADMIN_APP_BASE_URL");

  const loginResponse = await fetch(`${appBaseUrl}/login`, {
    headers: createBypassHeaders(),
    redirect: "manual",
  });

  if (loginResponse.status !== 200) {
    throw new Error(`Expected ${appBaseUrl}/login to return 200, got ${loginResponse.status}.`);
  }

  const adminResponse = await fetch(`${appBaseUrl}/admin`, {
    headers: createBypassHeaders(),
    redirect: "manual",
  });
  const redirectLocation = adminResponse.headers.get("location");

  if (![303, 307, 308].includes(adminResponse.status) || redirectLocation === null || !redirectLocation.includes("/login")) {
    throw new Error(
      `Expected anonymous /admin to redirect to /login, got status ${adminResponse.status} and location ${redirectLocation ?? "none"}.`
    );
  }

  console.log("hosted-admin-preflight:SUCCESS");
};

const run = async () => {
  if (verificationMode !== "authenticated" && verificationMode !== "preflight-only") {
    throw new Error(`Unsupported STAGING_ADMIN_VERIFICATION_MODE: ${verificationMode}.`);
  }

  requiredEnvironmentVariables.forEach(requireEnvironmentVariable);
  commands.slice(0, 2).forEach(runCommand);

  if (verificationMode === "preflight-only") {
    await runHostedPreflightAsync();
    return;
  }

  requireEnvironmentVariable("STAGING_ADMIN_EMAIL");
  requireEnvironmentVariable("STAGING_ADMIN_PASSWORD");
  commands.slice(2).forEach(runCommand);
};

void run();
