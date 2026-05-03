import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createAdminClient, readServiceRoleKey, readSupabaseUrl } from "./_shared/hosted-project-admin";
import { readProjectRef } from "./_shared/supabase-auth-config";

const authUserSchema = z.object({
  email: z.string().email().nullable(),
  id: z.string().min(1),
});

const profileRowSchema = z.object({
  id: z.string().min(1),
});

const businessStaffRowSchema = z.object({
  business_id: z.string().min(1),
});

type AuthUser = z.infer<typeof authUserSchema>;

type ManagerSeed = {
  displayName: string;
  email: string;
  password: string;
};

type PilotBusinessContext = {
  businessId: string;
  scannerEmail: string;
};

const readDesktopOutputPath = (): string => {
  const overridePath = process.env.PILOT_BUSINESS_MANAGER_OUTPUT_PATH;

  if (typeof overridePath === "string" && overridePath.trim().length > 0) {
    return overridePath.trim();
  }

  return "/Users/dogan/Desktop/OmaLeima-pilot-business-manager-credentials.txt";
};

const readManagerEmail = (): string => {
  const overrideEmail = process.env.PILOT_BUSINESS_MANAGER_EMAIL;

  if (typeof overrideEmail === "string" && overrideEmail.trim().length > 0) {
    return overrideEmail.trim().toLowerCase();
  }

  return "pilot-business-manager@example.com";
};

const readScannerEmail = (): string => {
  const overrideEmail = process.env.PILOT_BUSINESS_MANAGER_SCANNER_EMAIL;

  if (typeof overrideEmail === "string" && overrideEmail.trim().length > 0) {
    return overrideEmail.trim().toLowerCase();
  }

  return "pilot-scanner@example.com";
};

const createPassword = (): string => randomBytes(24).toString("base64url");

const createManagerSeed = (): ManagerSeed => ({
  displayName: "OmaLeima Pilot Business Manager",
  email: readManagerEmail(),
  password: createPassword(),
});

const fetchAllAuthUsersAsync = async (adminClient: SupabaseClient): Promise<AuthUser[]> => {
  const users: AuthUser[] = [];
  let pageNumber = 1;
  const pageSize = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page: pageNumber,
      perPage: pageSize,
    });

    if (error !== null) {
      throw new Error(`Failed to list hosted auth users. page=${pageNumber} message=${error.message}`);
    }

    const parsedUsers = z.array(authUserSchema).parse(
      data.users.map((user) => ({
        email: user.email ?? null,
        id: user.id,
      }))
    );

    users.push(...parsedUsers);

    if (parsedUsers.length < pageSize) {
      return users;
    }

    pageNumber += 1;
  }
};

const findAuthUser = (authUsers: AuthUser[], email: string): AuthUser | null =>
  authUsers.find((authUser) => authUser.email?.toLowerCase() === email.toLowerCase()) ?? null;

const ensurePasswordUserAsync = async (
  adminClient: SupabaseClient,
  manager: ManagerSeed,
  authUsers: AuthUser[]
): Promise<string> => {
  const existingUser = findAuthUser(authUsers, manager.email);

  if (existingUser !== null) {
    const { error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
      email: manager.email,
      email_confirm: true,
      password: manager.password,
      user_metadata: {
        display_name: manager.displayName,
      },
    });

    if (error !== null) {
      throw new Error(`Failed to update pilot business manager auth user. email=${manager.email} message=${error.message}`);
    }

    return existingUser.id;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: manager.email,
    email_confirm: true,
    password: manager.password,
    user_metadata: {
      display_name: manager.displayName,
    },
  });

  if (error !== null) {
    throw new Error(`Failed to create pilot business manager auth user. email=${manager.email} message=${error.message}`);
  }

  if (typeof data.user?.id !== "string") {
    throw new Error(`Pilot business manager auth create returned without a user id. email=${manager.email}`);
  }

  return data.user.id;
};

const fetchProfileIdByEmailAsync = async (adminClient: SupabaseClient, email: string): Promise<string> => {
  const { data, error } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle<z.infer<typeof profileRowSchema>>();

  if (error !== null) {
    throw new Error(`Failed to load profile for ${email}. message=${error.message}`);
  }

  if (data === null) {
    throw new Error(`Could not find a profile for ${email}. Bootstrap pilot operator accounts before creating a manager.`);
  }

  return profileRowSchema.parse(data).id;
};

const fetchScannerBusinessContextAsync = async (adminClient: SupabaseClient): Promise<PilotBusinessContext> => {
  const scannerEmail = readScannerEmail();
  const scannerUserId = await fetchProfileIdByEmailAsync(adminClient, scannerEmail);
  const { data, error } = await adminClient
    .from("business_staff")
    .select("business_id")
    .eq("user_id", scannerUserId)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle<z.infer<typeof businessStaffRowSchema>>();

  if (error !== null) {
    throw new Error(`Failed to load active business membership for ${scannerEmail}. message=${error.message}`);
  }

  if (data === null) {
    throw new Error(`Pilot scanner ${scannerEmail} has no active business membership.`);
  }

  return {
    businessId: businessStaffRowSchema.parse(data).business_id,
    scannerEmail,
  };
};

const upsertManagerProfileAsync = async (
  adminClient: SupabaseClient,
  manager: ManagerSeed,
  userId: string
): Promise<void> => {
  const { error } = await adminClient.from("profiles").upsert(
    {
      display_name: manager.displayName,
      email: manager.email,
      id: userId,
      primary_role: "BUSINESS_STAFF",
      status: "ACTIVE",
    },
    {
      onConflict: "id",
    }
  );

  if (error !== null) {
    throw new Error(`Failed to upsert pilot business manager profile. email=${manager.email} message=${error.message}`);
  }
};

const upsertManagerMembershipAsync = async (
  adminClient: SupabaseClient,
  businessId: string,
  userId: string
): Promise<void> => {
  const { error } = await adminClient.from("business_staff").upsert(
    {
      business_id: businessId,
      role: "MANAGER",
      status: "ACTIVE",
      user_id: userId,
    },
    {
      onConflict: "business_id,user_id",
    }
  );

  if (error !== null) {
    throw new Error(`Failed to upsert pilot business manager membership. businessId=${businessId} message=${error.message}`);
  }
};

const writeCredentialsAsync = async (
  outputPath: string,
  manager: ManagerSeed,
  businessContext: PilotBusinessContext
): Promise<void> => {
  await mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  const content = [
    "OmaLeima pilot business manager credentials",
    `Generated at: ${new Date().toISOString()}`,
    "",
    `Business manager email: ${manager.email}`,
    `Business manager password: ${manager.password}`,
    `Business staff role: MANAGER`,
    `Business ID: ${businessContext.businessId}`,
    `Matched via scanner account: ${businessContext.scannerEmail}`,
    "",
  ].join("\n");

  await writeFile(outputPath, content, "utf8");
};

const mainAsync = async (): Promise<void> => {
  const projectRef = readProjectRef("SUPABASE_PROJECT_REF");
  const supabaseUrl = readSupabaseUrl(projectRef, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readServiceRoleKey(projectRef, "SUPABASE_SERVICE_ROLE_KEY");
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
  const manager = createManagerSeed();
  const outputPath = readDesktopOutputPath();
  const [authUsers, businessContext] = await Promise.all([
    fetchAllAuthUsersAsync(adminClient),
    fetchScannerBusinessContextAsync(adminClient),
  ]);
  const userId = await ensurePasswordUserAsync(adminClient, manager, authUsers);

  await upsertManagerProfileAsync(adminClient, manager, userId);
  await upsertManagerMembershipAsync(adminClient, businessContext.businessId, userId);
  await writeCredentialsAsync(outputPath, manager, businessContext);

  console.log(
    JSON.stringify({
      businessId: businessContext.businessId,
      email: manager.email,
      outputPath,
      role: "MANAGER",
      status: "ready",
    })
  );
};

mainAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(
    JSON.stringify({
      level: "error",
      message,
      operation: "bootstrap-pilot-business-manager",
    })
  );
  process.exitCode = 1;
});
