import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const adminAppBaseUrl = process.env.ADMIN_APP_BASE_URL ?? "http://localhost:3001";
const npmBinary = process.env.NPM_BINARY ?? "npm";
const supabaseBinary = process.env.SUPABASE_BINARY ?? "supabase";

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
    args: ["--prefix", "apps/admin", "run", "build"],
    command: npmBinary,
    label: "Admin build",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:auth"],
    command: npmBinary,
    label: "Smoke auth",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:routes"],
    command: npmBinary,
    label: "Smoke routes",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:oversight"],
    command: npmBinary,
    label: "Smoke oversight",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:department-tags"],
    command: npmBinary,
    label: "Smoke department tags",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:club-events"],
    command: npmBinary,
    label: "Smoke club events",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:club-rewards"],
    command: npmBinary,
    label: "Smoke club rewards",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:club-claims"],
    command: npmBinary,
    label: "Smoke club claims",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:club-department-tags"],
    command: npmBinary,
    label: "Smoke club department tags",
  },
  {
    args: ["--prefix", "apps/admin", "run", "smoke:rls-core"],
    command: npmBinary,
    label: "Smoke RLS core",
  },
];

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
      `Could not reach ${adminAppBaseUrl}/login before route-backed QA: ${errorMessage}. Start the admin app with "npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001" or override ADMIN_APP_BASE_URL.`
    );
  }

  if (response.status !== 200) {
    throw new Error(
      `Expected ${adminAppBaseUrl}/login to return 200 before route-backed QA, got ${response.status}. Start the admin app with "npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001" or override ADMIN_APP_BASE_URL.`
    );
  }
};

const run = async () => {
  runCommand(commands[0]);
  runCommand(commands[1]);
  runCommand(commands[2]);
  runCommand(commands[3]);
  runCommand(commands[4]);

  await assertAdminAppReachableAsync();

  commands.slice(5).forEach(runCommand);
};

void run();
