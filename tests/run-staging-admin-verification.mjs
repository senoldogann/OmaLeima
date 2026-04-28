import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const npmBinary = process.env.NPM_BINARY ?? "npm";

const requiredEnvironmentVariables = [
  "ADMIN_APP_BASE_URL",
  "STAGING_ADMIN_EMAIL",
  "STAGING_ADMIN_PASSWORD",
];

const requireEnvironmentVariable = (variableName) => {
  const value = process.env[variableName];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${variableName} for staged admin verification.`);
  }
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

const run = async () => {
  requiredEnvironmentVariables.forEach(requireEnvironmentVariable);
  commands.forEach(runCommand);
};

void run();
