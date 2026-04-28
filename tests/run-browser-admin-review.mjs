import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const adminAppBaseUrl = process.env.ADMIN_APP_BASE_URL ?? "http://localhost:3001";
const functionBaseUrl = process.env.SUPABASE_FUNCTIONS_BASE_URL ?? "http://127.0.0.1:54321/functions/v1";
const npmBinary = process.env.NPM_BINARY ?? "npm";
const supabaseBinary = process.env.SUPABASE_BINARY ?? "supabase";

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
      `Could not reach ${adminAppBaseUrl}/login before browser review QA: ${errorMessage}. Start the admin app with "npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001" or override ADMIN_APP_BASE_URL.`
    );
  }

  if (response.status !== 200) {
    throw new Error(`Expected ${adminAppBaseUrl}/login to return 200 before browser review QA, got ${response.status}.`);
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
      `Could not reach ${functionBaseUrl}/generate-qr-token before browser review QA: ${errorMessage}. Start the local function server with "supabase functions serve --env-file supabase/.env.local" or override SUPABASE_FUNCTIONS_BASE_URL.`
    );
  }

  if (response.status !== 405) {
    throw new Error(
      `Expected ${functionBaseUrl}/generate-qr-token to return 405 on GET during browser review preflight, got ${response.status}.`
    );
  }
};

const commands = [
  {
    args: ["db", "reset", "--yes"],
    command: supabaseBinary,
    label: "Supabase reset",
  },
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
    args: ["--prefix", "apps/admin", "run", "smoke:browser-admin-review"],
    command: npmBinary,
    label: "Browser admin review smoke",
  },
];

const run = async () => {
  await assertAdminAppReachableAsync();
  await assertFunctionServerReachableAsync();

  commands.forEach(runCommand);
};

void run();
