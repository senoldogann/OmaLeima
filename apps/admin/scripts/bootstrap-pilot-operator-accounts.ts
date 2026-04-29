import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createAdminClient, readServiceRoleKey, readSupabaseUrl } from "./_shared/hosted-project-admin";
import { readProjectRef } from "./_shared/supabase-auth-config";

const fixtureEmails = [
  "admin@omaleima.test",
  "organizer@omaleima.test",
  "scanner@omaleima.test",
  "student@omaleima.test",
] as const;

const authUserSchema = z.object({
  email: z.string().email().nullable(),
  id: z.string().min(1),
});

const profileRowSchema = z.object({
  email: z.string().email(),
  id: z.string().min(1),
  primary_role: z.string().min(1),
  status: z.string().min(1),
});

const clubMemberRowSchema = z.object({
  club_id: z.string().min(1),
  role: z.string().min(1),
  status: z.string().min(1),
  user_id: z.string().min(1),
});

const businessStaffRowSchema = z.object({
  business_id: z.string().min(1),
  role: z.string().min(1),
  status: z.string().min(1),
  user_id: z.string().min(1),
});

type OperatorKind = "admin" | "organizer" | "scanner";
type AuthUser = z.infer<typeof authUserSchema>;
type ProfileRow = z.infer<typeof profileRowSchema>;
type ClubMemberRow = z.infer<typeof clubMemberRowSchema>;
type BusinessStaffRow = z.infer<typeof businessStaffRowSchema>;

type OperatorSeed = {
  displayName: string;
  email: string;
  kind: OperatorKind;
  password: string;
  primaryRole: "PLATFORM_ADMIN" | "CLUB_ORGANIZER" | "BUSINESS_STAFF";
};

type ArchivedFixtureUser = {
  archivedEmail: string;
  originalEmail: string;
  userId: string;
};

type BootstrapPlan = {
  admin: OperatorSeed;
  organizer: OperatorSeed;
  scanner: OperatorSeed;
};

type HostedBootstrapContext = {
  activeFixtureBusinessMemberships: BusinessStaffRow[];
  activeFixtureClubMemberships: ClubMemberRow[];
  authUsers: AuthUser[];
  profiles: ProfileRow[];
};

const readDesktopOutputPath = (): string => {
  const overridePath = process.env.PILOT_OPERATOR_BOOTSTRAP_OUTPUT_PATH;

  if (typeof overridePath === "string" && overridePath.trim().length > 0) {
    return overridePath.trim();
  }

  return "/Users/dogan/Desktop/OmaLeima-pilot-operator-credentials.txt";
};

const readOperatorEmail = (kind: OperatorKind): string => {
  const environmentVariableName = `PILOT_OPERATOR_${kind.toUpperCase()}_EMAIL`;
  const overrideEmail = process.env[environmentVariableName];

  if (typeof overrideEmail === "string" && overrideEmail.trim().length > 0) {
    return overrideEmail.trim().toLowerCase();
  }

  return `pilot-${kind}@example.com`;
};

const createPassword = (): string => randomBytes(24).toString("base64url");

const createBootstrapPlan = (): BootstrapPlan => ({
  admin: {
    displayName: "OmaLeima Pilot Admin",
    email: readOperatorEmail("admin"),
    kind: "admin",
    password: createPassword(),
    primaryRole: "PLATFORM_ADMIN",
  },
  organizer: {
    displayName: "OmaLeima Pilot Organizer",
    email: readOperatorEmail("organizer"),
    kind: "organizer",
    password: createPassword(),
    primaryRole: "CLUB_ORGANIZER",
  },
  scanner: {
    displayName: "OmaLeima Pilot Scanner",
    email: readOperatorEmail("scanner"),
    kind: "scanner",
    password: createPassword(),
    primaryRole: "BUSINESS_STAFF",
  },
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

const fetchProfilesAsync = async (adminClient: SupabaseClient): Promise<ProfileRow[]> => {
  const { data, error } = await adminClient
    .from("profiles")
    .select("id,email,primary_role,status")
    .returns<ProfileRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load hosted profiles. message=${error.message}`);
  }

  return z.array(profileRowSchema).parse(data);
};

const fetchClubMembersAsync = async (adminClient: SupabaseClient): Promise<ClubMemberRow[]> => {
  const { data, error } = await adminClient
    .from("club_members")
    .select("user_id,club_id,role,status")
    .returns<ClubMemberRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load hosted club members. message=${error.message}`);
  }

  return z.array(clubMemberRowSchema).parse(data);
};

const fetchBusinessStaffAsync = async (adminClient: SupabaseClient): Promise<BusinessStaffRow[]> => {
  const { data, error } = await adminClient
    .from("business_staff")
    .select("user_id,business_id,role,status")
    .returns<BusinessStaffRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load hosted business staff. message=${error.message}`);
  }

  return z.array(businessStaffRowSchema).parse(data);
};

const readHostedContextAsync = async (adminClient: SupabaseClient): Promise<HostedBootstrapContext> => {
  const [authUsers, profiles, clubMembers, businessStaff] = await Promise.all([
    fetchAllAuthUsersAsync(adminClient),
    fetchProfilesAsync(adminClient),
    fetchClubMembersAsync(adminClient),
    fetchBusinessStaffAsync(adminClient),
  ]);
  const fixtureUserIds = new Set(
    authUsers
      .filter((user) => typeof user.email === "string" && fixtureEmails.includes(user.email as (typeof fixtureEmails)[number]))
      .map((user) => user.id)
  );

  return {
    activeFixtureBusinessMemberships: businessStaff.filter(
      (membership) => fixtureUserIds.has(membership.user_id) && membership.status === "ACTIVE"
    ),
    activeFixtureClubMemberships: clubMembers.filter(
      (membership) => fixtureUserIds.has(membership.user_id) && membership.status === "ACTIVE"
    ),
    authUsers,
    profiles,
  };
};

const findExistingAuthUser = (authUsers: AuthUser[], email: string): AuthUser | null =>
  authUsers.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;

const ensurePasswordUserAsync = async (adminClient: SupabaseClient, operator: OperatorSeed, authUsers: AuthUser[]): Promise<string> => {
  const existingUser = findExistingAuthUser(authUsers, operator.email);

  if (existingUser !== null) {
    const { error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
      email: operator.email,
      email_confirm: true,
      password: operator.password,
      user_metadata: {
        display_name: operator.displayName,
      },
    });

    if (error !== null) {
      throw new Error(`Failed to update hosted operator auth user. email=${operator.email} message=${error.message}`);
    }

    return existingUser.id;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: operator.email,
    email_confirm: true,
    password: operator.password,
    user_metadata: {
      display_name: operator.displayName,
    },
  });

  if (error !== null) {
    throw new Error(`Failed to create hosted operator auth user. email=${operator.email} message=${error.message}`);
  }

  if (typeof data.user?.id !== "string") {
    throw new Error(`Hosted operator auth create returned without a user id. email=${operator.email}`);
  }

  return data.user.id;
};

const upsertProfileAsync = async (
  adminClient: SupabaseClient,
  operator: OperatorSeed,
  userId: string
): Promise<void> => {
  const { error } = await adminClient.from("profiles").upsert(
    {
      display_name: operator.displayName,
      email: operator.email,
      id: userId,
      primary_role: operator.primaryRole,
      status: "ACTIVE",
    },
    {
      onConflict: "id",
    }
  );

  if (error !== null) {
    throw new Error(`Failed to upsert hosted profile. email=${operator.email} message=${error.message}`);
  }
};

const assertSingleFixtureClubMembership = (rows: ClubMemberRow[]): ClubMemberRow => {
  if (rows.length !== 1) {
    throw new Error(`Expected exactly one active fixture club membership, found ${rows.length}.`);
  }

  return rows[0];
};

const assertSingleFixtureBusinessMembership = (rows: BusinessStaffRow[]): BusinessStaffRow => {
  if (rows.length !== 1) {
    throw new Error(`Expected exactly one active fixture business membership, found ${rows.length}.`);
  }

  return rows[0];
};

const upsertClubMembershipAsync = async (
  adminClient: SupabaseClient,
  clubId: string,
  role: string,
  userId: string
): Promise<void> => {
  const { error } = await adminClient.from("club_members").upsert(
    {
      club_id: clubId,
      role,
      status: "ACTIVE",
      user_id: userId,
    },
    {
      onConflict: "club_id,user_id",
    }
  );

  if (error !== null) {
    throw new Error(`Failed to upsert hosted club membership. club_id=${clubId} user_id=${userId} message=${error.message}`);
  }
};

const upsertBusinessStaffAsync = async (
  adminClient: SupabaseClient,
  businessId: string,
  role: string,
  userId: string
): Promise<void> => {
  const { error } = await adminClient.from("business_staff").upsert(
    {
      business_id: businessId,
      role,
      status: "ACTIVE",
      user_id: userId,
    },
    {
      onConflict: "business_id,user_id",
    }
  );

  if (error !== null) {
    throw new Error(
      `Failed to upsert hosted business staff membership. business_id=${businessId} user_id=${userId} message=${error.message}`
    );
  }
};

const updateClubContactEmailAsync = async (adminClient: SupabaseClient, clubId: string, contactEmail: string): Promise<void> => {
  const { error } = await adminClient.from("clubs").update({ contact_email: contactEmail }).eq("id", clubId);

  if (error !== null) {
    throw new Error(`Failed to update club contact email. club_id=${clubId} message=${error.message}`);
  }
};

const updateBusinessContactEmailAsync = async (
  adminClient: SupabaseClient,
  businessId: string,
  contactEmail: string
): Promise<void> => {
  const { error } = await adminClient.from("businesses").update({ contact_email: contactEmail }).eq("id", businessId);

  if (error !== null) {
    throw new Error(`Failed to update business contact email. business_id=${businessId} message=${error.message}`);
  }
};

const disableOldClubMembershipsAsync = async (adminClient: SupabaseClient, userIds: string[]): Promise<void> => {
  if (userIds.length === 0) {
    return;
  }

  const { error } = await adminClient
    .from("club_members")
    .update({ status: "DISABLED" })
    .in("user_id", userIds)
    .eq("status", "ACTIVE");

  if (error !== null) {
    throw new Error(`Failed to disable old club memberships. user_ids=${userIds.join(",")} message=${error.message}`);
  }
};

const disableOldBusinessStaffAsync = async (adminClient: SupabaseClient, userIds: string[]): Promise<void> => {
  if (userIds.length === 0) {
    return;
  }

  const { error } = await adminClient
    .from("business_staff")
    .update({ status: "DISABLED" })
    .in("user_id", userIds)
    .eq("status", "ACTIVE");

  if (error !== null) {
    throw new Error(`Failed to disable old business staff memberships. user_ids=${userIds.join(",")} message=${error.message}`);
  }
};

const createArchivedEmail = (originalEmail: string, index: number): string => {
  const [localPart] = originalEmail.split("@");
  const timestampSuffix = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);

  return `archived-${localPart}-${timestampSuffix}-${index}@example.com`;
};

const archiveFixtureUsersAsync = async (
  adminClient: SupabaseClient,
  authUsers: AuthUser[],
  profiles: ProfileRow[]
): Promise<ArchivedFixtureUser[]> => {
  const archivedUsers: ArchivedFixtureUser[] = [];
  let archiveIndex = 1;

  for (const user of authUsers) {
    if (typeof user.email !== "string" || !fixtureEmails.includes(user.email as (typeof fixtureEmails)[number])) {
      continue;
    }

    const archivedEmail = createArchivedEmail(user.email, archiveIndex);
    const archivePassword = createPassword();
    const { error: authError } = await adminClient.auth.admin.updateUserById(user.id, {
      email: archivedEmail,
      email_confirm: true,
      password: archivePassword,
      user_metadata: {
        archived_from: user.email,
      },
    });

    if (authError !== null) {
      throw new Error(
        `Failed to archive fixture auth user. email=${user.email} archived_email=${archivedEmail} message=${authError.message}`
      );
    }

    const matchingProfile = profiles.find((profile) => profile.id === user.id);

    if (matchingProfile !== undefined) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ email: archivedEmail, status: "SUSPENDED" })
        .eq("id", user.id);

      if (profileError !== null) {
        throw new Error(
          `Failed to archive fixture profile. email=${user.email} archived_email=${archivedEmail} message=${profileError.message}`
        );
      }
    }

    archivedUsers.push({
      archivedEmail,
      originalEmail: user.email,
      userId: user.id,
    });
    archiveIndex += 1;
  }

  return archivedUsers;
};

const ensureParentDirectoryAsync = async (filePath: string): Promise<void> => {
  const directoryPath = path.dirname(filePath);

  await mkdir(directoryPath, { recursive: true });
};

const buildCredentialFileContents = (
  outputPath: string,
  plan: BootstrapPlan,
  archivedUsers: ArchivedFixtureUser[],
  projectRef: string,
  supabaseUrl: string
): string => {
  const generatedAt = new Date().toISOString();

  return [
    "OmaLeima hosted operator credentials",
    `Generated at: ${generatedAt}`,
    `Project ref: ${projectRef}`,
    `Supabase URL: ${supabaseUrl}`,
    `Saved path: ${outputPath}`,
    "",
    "Active operator accounts",
    `Admin email: ${plan.admin.email}`,
    `Admin password: ${plan.admin.password}`,
    `Organizer email: ${plan.organizer.email}`,
    `Organizer password: ${plan.organizer.password}`,
    `Scanner email: ${plan.scanner.email}`,
    `Scanner password: ${plan.scanner.password}`,
    "",
    "Hosted entry points",
    "Admin / club web login: https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app/login",
    "Mobile student login: Google sign-in on the hosted mobile app",
    "Mobile business login: use the scanner credentials above",
    "",
    "Archived fixture users",
    ...archivedUsers.map((user) => `${user.originalEmail} -> ${user.archivedEmail}`),
    "",
    "Owner next steps",
    "1. Store this file somewhere safer than the Desktop before a real pilot.",
    "2. Use the admin account above for hosted admin verification and operator setup.",
    "3. Use the organizer account above for /club/events, /club/rewards, and /club/claims.",
    "4. Use the scanner account above for venue-side mobile scanner sign-in.",
    "5. Replace these placeholder operator emails with real club/operator emails when the first real pilot club is ready.",
    "",
  ].join("\n");
};

const writeCredentialFileAsync = async (
  outputPath: string,
  plan: BootstrapPlan,
  archivedUsers: ArchivedFixtureUser[],
  projectRef: string,
  supabaseUrl: string
): Promise<void> => {
  await ensureParentDirectoryAsync(outputPath);
  await writeFile(outputPath, buildCredentialFileContents(outputPath, plan, archivedUsers, projectRef, supabaseUrl), "utf8");
};

const run = async (): Promise<void> => {
  const projectRef = readProjectRef("PILOT_OPERATOR_BOOTSTRAP_PROJECT_REF");
  const supabaseUrl = readSupabaseUrl(projectRef, "PILOT_OPERATOR_BOOTSTRAP_SUPABASE_URL");
  const serviceRoleKey = readServiceRoleKey(projectRef, "PILOT_OPERATOR_BOOTSTRAP_SERVICE_ROLE_KEY");
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
  const plan = createBootstrapPlan();
  const outputPath = readDesktopOutputPath();
  const context = await readHostedContextAsync(adminClient);
  const fixtureClubMembership = assertSingleFixtureClubMembership(context.activeFixtureClubMemberships);
  const fixtureBusinessMembership = assertSingleFixtureBusinessMembership(context.activeFixtureBusinessMemberships);

  const adminUserId = await ensurePasswordUserAsync(adminClient, plan.admin, context.authUsers);
  const organizerUserId = await ensurePasswordUserAsync(adminClient, plan.organizer, context.authUsers);
  const scannerUserId = await ensurePasswordUserAsync(adminClient, plan.scanner, context.authUsers);

  await Promise.all([
    upsertProfileAsync(adminClient, plan.admin, adminUserId),
    upsertProfileAsync(adminClient, plan.organizer, organizerUserId),
    upsertProfileAsync(adminClient, plan.scanner, scannerUserId),
  ]);

  await Promise.all([
    upsertClubMembershipAsync(adminClient, fixtureClubMembership.club_id, fixtureClubMembership.role, organizerUserId),
    upsertBusinessStaffAsync(adminClient, fixtureBusinessMembership.business_id, fixtureBusinessMembership.role, scannerUserId),
    updateClubContactEmailAsync(adminClient, fixtureClubMembership.club_id, plan.organizer.email),
    updateBusinessContactEmailAsync(adminClient, fixtureBusinessMembership.business_id, plan.scanner.email),
  ]);

  const archivedUsers = await archiveFixtureUsersAsync(adminClient, context.authUsers, context.profiles);
  const archivedFixtureUserIds = archivedUsers.map((user) => user.userId);

  await Promise.all([
    disableOldClubMembershipsAsync(adminClient, archivedFixtureUserIds),
    disableOldBusinessStaffAsync(adminClient, archivedFixtureUserIds),
  ]);

  await writeCredentialFileAsync(outputPath, plan, archivedUsers, projectRef, supabaseUrl);

  console.log(
    [
      "pilot-operator-bootstrap:READY",
      `project:${projectRef}`,
      `credentials-file:${outputPath}`,
      `admin:${plan.admin.email}`,
      `organizer:${plan.organizer.email}`,
      `scanner:${plan.scanner.email}`,
      `archived-fixture-users:${archivedUsers.length}`,
    ].join("|")
  );
};

void run();
