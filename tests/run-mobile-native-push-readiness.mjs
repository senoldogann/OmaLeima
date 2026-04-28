import { spawnSync } from "node:child_process";

const commands = [
  {
    label: "apps/mobile lint",
    command: ["npm", "--prefix", "apps/mobile", "run", "lint"],
  },
  {
    label: "apps/mobile typecheck",
    command: ["npm", "--prefix", "apps/mobile", "run", "typecheck"],
  },
  {
    label: "apps/mobile export:web",
    command: ["npm", "--prefix", "apps/mobile", "run", "export:web"],
  },
  {
    label: "apps/mobile audit:native-push-device-readiness",
    command: ["npm", "--prefix", "apps/mobile", "run", "audit:native-push-device-readiness"],
  },
];

for (const { label, command } of commands) {
  console.log(`==> ${label}`);
  const result = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
