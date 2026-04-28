import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const npmBinary = process.env.NPM_BINARY ?? "npm";

const runCommand = ({ command, args, label }) => {
  console.log(`\n== ${label} ==`);
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
  });
};

const commands = [
  {
    command: npmBinary,
    args: ["--prefix", "apps/admin", "run", "lint"],
    label: "Admin lint",
  },
  {
    command: npmBinary,
    args: ["--prefix", "apps/admin", "run", "typecheck"],
    label: "Admin typecheck",
  },
  {
    command: npmBinary,
    args: ["--prefix", "apps/admin", "run", "smoke:hosted-setup-audit"],
    label: "Hosted admin readiness audit smoke",
  },
];

const run = async () => {
  commands.forEach(runCommand);
};

void run();
