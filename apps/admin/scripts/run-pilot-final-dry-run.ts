import { readFile } from "node:fs/promises";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createAdminClient, readPublishableKeyFromCli, readServiceRoleKey, readSupabaseUrl } from "./_shared/hosted-project-admin";
import { readProjectRef } from "./_shared/supabase-auth-config";

const credentialFilePath = process.env.PILOT_OPERATOR_BOOTSTRAP_OUTPUT_PATH ?? "/Users/dogan/Desktop/OmaLeima-pilot-operator-credentials.txt";

const operatorRoleMap = {
  Admin: "PLATFORM_ADMIN",
  Organizer: "CLUB_ORGANIZER",
  Scanner: "BUSINESS_STAFF",
} as const;

const profileSchema = z.object({
  id: z.string().min(1),
  primary_role: z.string().min(1),
  status: z.string().min(1),
});

const membershipSchema = z.object({
  status: z.string().min(1),
  user_id: z.string().min(1),
});

type OperatorKey = keyof typeof operatorRoleMap;

type OperatorCredential = {
  email: string;
  password: string;
};

type OperatorCredentialMap = Record<OperatorKey, OperatorCredential>;

const parseCredentialFile = (source: string): OperatorCredentialMap => {
  const lines = source.split("\n").map((line) => line.trim());

  const readValue = (label: string): string => {
    const matchingLine = lines.find((line) => line.startsWith(`${label}: `));

    if (matchingLine === undefined) {
      throw new Error(`Missing "${label}" in ${credentialFilePath}.`);
    }

    return matchingLine.slice(`${label}: `.length).trim();
  };

  return {
    Admin: {
      email: readValue("Admin email"),
      password: readValue("Admin password"),
    },
    Organizer: {
      email: readValue("Organizer email"),
      password: readValue("Organizer password"),
    },
    Scanner: {
      email: readValue("Scanner email"),
      password: readValue("Scanner password"),
    },
  };
};

const readOperatorCredentialsAsync = async (): Promise<OperatorCredentialMap> => {
  const source = await readFile(credentialFilePath, "utf8");

  return parseCredentialFile(source);
};

const createPublishableClient = (supabaseUrl: string, publishableKey: string): SupabaseClient =>
  createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

const signInAndReadProfileAsync = async (
  supabaseUrl: string,
  publishableKey: string,
  credential: OperatorCredential
): Promise<z.infer<typeof profileSchema>> => {
  const client = createPublishableClient(supabaseUrl, publishableKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: credential.email,
    password: credential.password,
  });

  if (error !== null) {
    throw new Error(`Operator sign-in failed. email=${credential.email} message=${error.message}`);
  }

  const userId = data.user?.id;

  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error(`Operator sign-in returned without a user id. email=${credential.email}`);
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,primary_role,status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError !== null) {
    throw new Error(`Operator profile lookup failed. email=${credential.email} message=${profileError.message}`);
  }

  if (profile === null) {
    throw new Error(`Operator profile was not found after sign-in. email=${credential.email} user_id=${userId}`);
  }

  await client.auth.signOut();

  return profileSchema.parse(profile);
};

const countActiveClubMembershipsAsync = async (adminClient: SupabaseClient, userId: string): Promise<number> => {
  const { data, error } = await adminClient
    .from("club_members")
    .select("user_id,status")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .returns<z.infer<typeof membershipSchema>[]>();

  if (error !== null) {
    throw new Error(`Failed to read active club memberships. user_id=${userId} message=${error.message}`);
  }

  return z.array(membershipSchema).parse(data).length;
};

const countActiveBusinessMembershipsAsync = async (adminClient: SupabaseClient, userId: string): Promise<number> => {
  const { data, error } = await adminClient
    .from("business_staff")
    .select("user_id,status")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .returns<z.infer<typeof membershipSchema>[]>();

  if (error !== null) {
    throw new Error(`Failed to read active business memberships. user_id=${userId} message=${error.message}`);
  }

  return z.array(membershipSchema).parse(data).length;
};

const run = async (): Promise<void> => {
  const projectRef = readProjectRef("PILOT_OPERATOR_AUDIT_PROJECT_REF");
  const supabaseUrl = readSupabaseUrl(projectRef, "PILOT_OPERATOR_AUDIT_SUPABASE_URL");
  const serviceRoleKey = readServiceRoleKey(projectRef, "PILOT_OPERATOR_AUDIT_SERVICE_ROLE_KEY");
  const publishableKey = readPublishableKeyFromCli(projectRef);
  const credentials = await readOperatorCredentialsAsync();
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  const adminProfile = await signInAndReadProfileAsync(supabaseUrl, publishableKey, credentials.Admin);
  const organizerProfile = await signInAndReadProfileAsync(supabaseUrl, publishableKey, credentials.Organizer);
  const scannerProfile = await signInAndReadProfileAsync(supabaseUrl, publishableKey, credentials.Scanner);

  if (adminProfile.primary_role !== operatorRoleMap.Admin || adminProfile.status !== "ACTIVE") {
    throw new Error(
      `Admin role mismatch. email=${credentials.Admin.email} role=${adminProfile.primary_role} status=${adminProfile.status}`
    );
  }

  if (organizerProfile.primary_role !== operatorRoleMap.Organizer || organizerProfile.status !== "ACTIVE") {
    throw new Error(
      `Organizer role mismatch. email=${credentials.Organizer.email} role=${organizerProfile.primary_role} status=${organizerProfile.status}`
    );
  }

  if (scannerProfile.primary_role !== operatorRoleMap.Scanner || scannerProfile.status !== "ACTIVE") {
    throw new Error(
      `Scanner role mismatch. email=${credentials.Scanner.email} role=${scannerProfile.primary_role} status=${scannerProfile.status}`
    );
  }

  const [organizerMembershipCount, scannerMembershipCount] = await Promise.all([
    countActiveClubMembershipsAsync(adminClient, organizerProfile.id),
    countActiveBusinessMembershipsAsync(adminClient, scannerProfile.id),
  ]);

  if (organizerMembershipCount < 1) {
    throw new Error(`Organizer has no active club membership. email=${credentials.Organizer.email} user_id=${organizerProfile.id}`);
  }

  if (scannerMembershipCount < 1) {
    throw new Error(`Scanner has no active business membership. email=${credentials.Scanner.email} user_id=${scannerProfile.id}`);
  }

  console.log(
    [
      "pilot-final-dry-run:READY",
      `project:${projectRef}`,
      `credential-file:${credentialFilePath}`,
      `admin:${credentials.Admin.email}`,
      `organizer:${credentials.Organizer.email}`,
      `organizer-memberships:${organizerMembershipCount}`,
      `scanner:${credentials.Scanner.email}`,
      `scanner-memberships:${scannerMembershipCount}`,
      "next:run-browser-and-device-pilot-smoke",
    ].join("|")
  );
};

void run();
