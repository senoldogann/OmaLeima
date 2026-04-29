import { spawnSync } from "node:child_process";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const apiKeySchema = z.object({
  api_key: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
});

const runCommand = (command: string, args: string[]): string => {
  const commandResult = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (commandResult.status === 0) {
    return commandResult.stdout.trim();
  }

  const stderr = commandResult.stderr.trim();
  const stdout = commandResult.stdout.trim();
  const errorOutput = stderr.length > 0 ? stderr : stdout;

  throw new Error(
    errorOutput.length > 0 ? errorOutput : `Command ${command} failed with status ${commandResult.status ?? "unknown"}.`
  );
};

export const readSupabaseUrl = (projectRef: string, environmentVariableName: string): string => {
  const overrideUrl = process.env[environmentVariableName];

  if (typeof overrideUrl === "string" && overrideUrl.trim().length > 0) {
    return overrideUrl.trim();
  }

  return `https://${projectRef}.supabase.co`;
};

export const readServiceRoleKeyFromCli = (projectRef: string): string => {
  const rawApiKeys = runCommand("supabase", ["projects", "api-keys", "--project-ref", projectRef, "-o", "json"]);
  const apiKeys = z.array(apiKeySchema).parse(JSON.parse(rawApiKeys) as unknown);
  const legacyServiceRoleKey = apiKeys.find((apiKey) => apiKey.name === "service_role" && apiKey.type === "legacy");

  if (typeof legacyServiceRoleKey?.api_key === "string" && !legacyServiceRoleKey.api_key.includes("·")) {
    return legacyServiceRoleKey.api_key;
  }

  const nonRedactedSecretKey = apiKeys.find(
    (apiKey) => apiKey.name === "default" && apiKey.type === "secret" && !apiKey.api_key.includes("·")
  );

  if (typeof nonRedactedSecretKey?.api_key === "string") {
    return nonRedactedSecretKey.api_key;
  }

  throw new Error(
    `Could not read a non-redacted service-role key for project ${projectRef}. Run "supabase projects api-keys --project-ref ${projectRef} -o json" and verify the CLI can access the hosted keys.`
  );
};

export const readServiceRoleKey = (projectRef: string, environmentVariableName: string): string => {
  const overrideKey = process.env[environmentVariableName];

  if (typeof overrideKey === "string" && overrideKey.trim().length > 0) {
    return overrideKey.trim();
  }

  return readServiceRoleKeyFromCli(projectRef);
};

export const createAdminClient = (supabaseUrl: string, serviceRoleKey: string): SupabaseClient =>
  createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
