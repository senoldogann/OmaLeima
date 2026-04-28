import { spawnSync } from "node:child_process";

const runCommand = (label, command, args) => {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

runCommand("apps/mobile lint", "npm", ["--prefix", "apps/mobile", "run", "lint"]);
runCommand("apps/mobile typecheck", "npm", ["--prefix", "apps/mobile", "run", "typecheck"]);
runCommand("apps/mobile audit:realtime-readiness", "npm", [
  "--prefix",
  "apps/mobile",
  "run",
  "audit:realtime-readiness",
]);
