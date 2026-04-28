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
    args: ["--prefix", "apps/admin", "run", "smoke:custom-domain-cutover-audit"],
    command: npmBinary,
    label: "Custom-domain cutover audit smoke",
  },
];

const run = async () => {
  commands.forEach(runCommand);
};

void run();
