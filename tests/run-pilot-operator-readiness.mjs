import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

const commands = [
  {
    label: "apps/admin lint",
    command: ["npm", "--prefix", "apps/admin", "run", "lint"],
  },
  {
    label: "apps/admin typecheck",
    command: ["npm", "--prefix", "apps/admin", "run", "typecheck"],
  },
  {
    label: "apps/admin smoke:pilot-operator-hygiene-audit",
    command: ["npm", "--prefix", "apps/admin", "run", "smoke:pilot-operator-hygiene-audit"],
  },
];

for (const commandEntry of commands) {
  console.log(`==> ${commandEntry.label}`);

  execFileSync(commandEntry.command[0], commandEntry.command.slice(1), {
    cwd: repoRoot,
    stdio: "inherit",
  });
}
