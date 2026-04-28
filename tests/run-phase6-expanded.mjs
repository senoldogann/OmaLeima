import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const adminAppBaseUrl = process.env.ADMIN_APP_BASE_URL ?? "http://localhost:3001";
const functionBaseUrl = process.env.SUPABASE_FUNCTIONS_BASE_URL ?? "http://127.0.0.1:54321/functions/v1";
const npmBinary = process.env.NPM_BINARY ?? "npm";

const runCommand = ({ command, args, label }) => {
  console.log(`\n== ${label} ==`);
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });
};

const assertAdminAppReachableAsync = async () => {
  let response;

  try {
    response = await fetch(`${adminAppBaseUrl}/login`, {
      method: "GET",
      redirect: "manual",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown fetch error";

    throw new Error(
      `Could not reach ${adminAppBaseUrl}/login before expanded QA: ${errorMessage}. Start the admin app with "npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001" or override ADMIN_APP_BASE_URL.`
    );
  }

  if (response.status !== 200) {
    throw new Error(
      `Expected ${adminAppBaseUrl}/login to return 200 before expanded QA, got ${response.status}. Start the admin app with "npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001" or override ADMIN_APP_BASE_URL.`
    );
  }
};

const assertFunctionServerReachableAsync = async () => {
  let response;

  try {
    response = await fetch(`${functionBaseUrl}/generate-qr-token`, {
      method: "GET",
      redirect: "manual",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown fetch error";

    throw new Error(
      `Could not reach ${functionBaseUrl}/generate-qr-token before expanded QA: ${errorMessage}. Start the local function server with "supabase functions serve --env-file supabase/.env.local" or override SUPABASE_FUNCTIONS_BASE_URL.`
    );
  }

  if (response.status !== 405) {
    throw new Error(
      `Expected ${functionBaseUrl}/generate-qr-token to return 405 on GET during preflight, got ${response.status}. Start the local function server with "supabase functions serve --env-file supabase/.env.local" or override SUPABASE_FUNCTIONS_BASE_URL.`
    );
  }
};

const commands = [
  {
    args: ["run", "qa:phase6-core"],
    command: npmBinary,
    label: "Phase 6 core matrix",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:business-applications"],
    command: npmBinary,
    label: "Smoke business applications",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:qr-security"],
    command: npmBinary,
    label: "Smoke QR security",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:scan-race"],
    command: npmBinary,
    label: "Smoke scan race",
  },
];

const run = async () => {
  await assertAdminAppReachableAsync();
  await assertFunctionServerReachableAsync();

  commands.forEach(runCommand);
};

void run();
