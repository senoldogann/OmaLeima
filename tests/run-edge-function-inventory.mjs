import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const functionsRoot = join(repoRoot, "supabase/functions");
const configToml = readFileSync(join(repoRoot, "supabase/config.toml"), "utf8");
const edgeFunctionsDoc = readFileSync(join(repoRoot, "docs/EDGE_FUNCTIONS.md"), "utf8");

const shippedFunctions = readdirSync(functionsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((functionName) => existsSync(join(functionsRoot, functionName, "index.ts")))
  .sort();

const configuredFunctions = Array.from(configToml.matchAll(/^\[functions\.([^\]]+)\]$/gmu))
  .map((match) => match[1])
  .filter((functionName) => typeof functionName === "string")
  .sort();

const documentedFunctions = Array.from(edgeFunctionsDoc.matchAll(/^- `([^`]+)`$/gmu))
  .map((match) => match[1])
  .filter((functionName) => typeof functionName === "string")
  .sort();

const missingFromConfig = shippedFunctions.filter((functionName) => !configuredFunctions.includes(functionName));
const staleConfigEntries = configuredFunctions.filter((functionName) => !shippedFunctions.includes(functionName));
const missingFromDocs = shippedFunctions.filter((functionName) => !documentedFunctions.includes(functionName));

if (missingFromConfig.length > 0 || staleConfigEntries.length > 0 || missingFromDocs.length > 0) {
  console.error(JSON.stringify({
    missingFromConfig,
    missingFromDocs,
    staleConfigEntries,
  }, null, 2));
  process.exit(1);
}

console.log(`edge-function-inventory:OK|count:${shippedFunctions.length}`);
