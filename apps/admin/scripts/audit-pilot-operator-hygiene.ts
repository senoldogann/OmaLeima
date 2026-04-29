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

const privilegedProfileRoles = [
  "BUSINESS_OWNER",
  "BUSINESS_STAFF",
  "CLUB_ORGANIZER",
  "CLUB_STAFF",
  "PLATFORM_ADMIN",
] as const;

const authUserSchema = z.object({
  email: z.string().email().nullable(),
  id: z.string().min(1),
});

const profileRowSchema = z.object({
  id: z.string().min(1),
  primary_role: z.enum(privilegedProfileRoles),
  status: z.string().min(1),
});

const businessStaffRowSchema = z.object({
  business_id: z.string().min(1),
  role: z.string().min(1),
  status: z.string().min(1),
  user_id: z.string().min(1),
});

const clubMemberRowSchema = z.object({
  club_id: z.string().min(1),
  role: z.string().min(1),
  status: z.string().min(1),
  user_id: z.string().min(1),
});

type AuthUser = z.infer<typeof authUserSchema>;
type ProfileRow = z.infer<typeof profileRowSchema>;
type BusinessStaffRow = z.infer<typeof businessStaffRowSchema>;
type ClubMemberRow = z.infer<typeof clubMemberRowSchema>;

type HostedAuditState = {
  authUsers: AuthUser[];
  businessStaffRows: BusinessStaffRow[];
  clubMemberRows: ClubMemberRow[];
  profiles: ProfileRow[];
  projectRef: string;
  supabaseUrl: string;
};

type FixtureFinding = {
  email: string;
  userId: string;
};

type FixtureMembershipFinding = {
  context: string;
  email: string;
  userId: string;
};

type AuditReadinessState = {
  fixtureAuthUsers: FixtureFinding[];
  fixtureMemberships: FixtureMembershipFinding[];
  fixturePrivilegedProfiles: FixtureFinding[];
  fixtureTestDomainUsers: FixtureFinding[];
  projectRef: string;
};

const readOverrideRows = <T>(environmentVariableName: string, schema: z.ZodType<T>): T[] | null => {
  const rawValue = process.env[environmentVariableName];

  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return null;
  }

  return z.array(schema).parse(JSON.parse(rawValue) as unknown);
};

const fetchAllAuthUsersAsync = async (adminClient: SupabaseClient): Promise<AuthUser[]> => {
  const users: AuthUser[] = [];
  const pageSize = 200;
  let pageNumber = 1;

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

const chunkValues = (values: string[], chunkSize: number): string[][] => {
  const chunks: string[][] = [];

  for (let startIndex = 0; startIndex < values.length; startIndex += chunkSize) {
    chunks.push(values.slice(startIndex, startIndex + chunkSize));
  }

  return chunks;
};

const fetchProfilesAsync = async (adminClient: SupabaseClient, userIds: string[]): Promise<ProfileRow[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const profileRows: ProfileRow[] = [];

  for (const userIdChunk of chunkValues(userIds, 200)) {
    const { data, error } = await adminClient
      .from("profiles")
      .select("id,primary_role,status")
      .in("id", userIdChunk)
      .in("primary_role", [...privilegedProfileRoles])
      .returns<ProfileRow[]>();

    if (error !== null) {
      throw new Error(
        `Failed to load hosted privileged profiles. chunk-size=${userIdChunk.length} message=${error.message}`
      );
    }

    profileRows.push(...z.array(profileRowSchema).parse(data));
  }

  return profileRows;
};

const fetchBusinessStaffRowsAsync = async (
  adminClient: SupabaseClient,
  userIds: string[]
): Promise<BusinessStaffRow[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const membershipRows: BusinessStaffRow[] = [];

  for (const userIdChunk of chunkValues(userIds, 200)) {
    const { data, error } = await adminClient
      .from("business_staff")
      .select("user_id,business_id,role,status")
      .in("user_id", userIdChunk)
      .eq("status", "ACTIVE")
      .returns<BusinessStaffRow[]>();

    if (error !== null) {
      throw new Error(
        `Failed to load hosted business staff memberships. chunk-size=${userIdChunk.length} message=${error.message}`
      );
    }

    membershipRows.push(...z.array(businessStaffRowSchema).parse(data));
  }

  return membershipRows;
};

const fetchClubMemberRowsAsync = async (adminClient: SupabaseClient, userIds: string[]): Promise<ClubMemberRow[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const membershipRows: ClubMemberRow[] = [];

  for (const userIdChunk of chunkValues(userIds, 200)) {
    const { data, error } = await adminClient
      .from("club_members")
      .select("user_id,club_id,role,status")
      .in("user_id", userIdChunk)
      .eq("status", "ACTIVE")
      .returns<ClubMemberRow[]>();

    if (error !== null) {
      throw new Error(`Failed to load hosted club memberships. chunk-size=${userIdChunk.length} message=${error.message}`);
    }

    membershipRows.push(...z.array(clubMemberRowSchema).parse(data));
  }

  return membershipRows;
};

const readHostedAuditStateAsync = async (): Promise<HostedAuditState> => {
  const projectRef = readProjectRef("PILOT_OPERATOR_AUDIT_PROJECT_REF");
  const supabaseUrl = readSupabaseUrl(projectRef, "PILOT_OPERATOR_AUDIT_SUPABASE_URL");
  const overrideAuthUsers = readOverrideRows("PILOT_OPERATOR_AUDIT_AUTH_USERS_JSON", authUserSchema);
  const overrideProfiles = readOverrideRows("PILOT_OPERATOR_AUDIT_PROFILES_JSON", profileRowSchema);
  const overrideBusinessStaff = readOverrideRows("PILOT_OPERATOR_AUDIT_BUSINESS_STAFF_JSON", businessStaffRowSchema);
  const overrideClubMembers = readOverrideRows("PILOT_OPERATOR_AUDIT_CLUB_MEMBERS_JSON", clubMemberRowSchema);

  if (
    overrideAuthUsers !== null &&
    overrideProfiles !== null &&
    overrideBusinessStaff !== null &&
    overrideClubMembers !== null
  ) {
    return {
      authUsers: overrideAuthUsers,
      businessStaffRows: overrideBusinessStaff,
      clubMemberRows: overrideClubMembers,
      profiles: overrideProfiles,
      projectRef,
      supabaseUrl,
    };
  }

  const serviceRoleKey = readServiceRoleKey(projectRef, "PILOT_OPERATOR_AUDIT_SERVICE_ROLE_KEY");
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
  const authUsers = await fetchAllAuthUsersAsync(adminClient);
  const userIds = authUsers.map((user) => user.id);
  const [profiles, businessStaffRows, clubMemberRows] = await Promise.all([
    fetchProfilesAsync(adminClient, userIds),
    fetchBusinessStaffRowsAsync(adminClient, userIds),
    fetchClubMemberRowsAsync(adminClient, userIds),
  ]);

  return {
    authUsers,
    businessStaffRows,
    clubMemberRows,
    profiles,
    projectRef,
    supabaseUrl,
  };
};

const isFixtureEmail = (email: string): boolean => fixtureEmails.includes(email as (typeof fixtureEmails)[number]);

const isFixtureTestDomain = (email: string): boolean => email.endsWith("@omaleima.test");

const buildAuditReadinessState = (state: HostedAuditState): AuditReadinessState => {
  const userById = new Map(state.authUsers.map((user) => [user.id, user]));
  const fixtureAuthUsers = state.authUsers
    .filter((user) => typeof user.email === "string" && isFixtureEmail(user.email))
    .map((user) => ({
      email: user.email as string,
      userId: user.id,
    }));
  const fixtureTestDomainUsers = state.authUsers
    .filter((user) => typeof user.email === "string" && isFixtureTestDomain(user.email))
    .map((user) => ({
      email: user.email as string,
      userId: user.id,
    }));
  const fixturePrivilegedProfiles = state.profiles.flatMap((profile) => {
    const matchingUser = userById.get(profile.id);

    if (matchingUser?.email === undefined || matchingUser.email === null || !isFixtureTestDomain(matchingUser.email)) {
      return [];
    }

    return [
      {
        email: matchingUser.email,
        userId: profile.id,
      },
    ];
  });
  const fixtureBusinessMemberships = state.businessStaffRows.flatMap((membership) => {
    const matchingUser = userById.get(membership.user_id);

    if (matchingUser?.email === undefined || matchingUser.email === null || !isFixtureTestDomain(matchingUser.email)) {
      return [];
    }

    return [
      {
        context: `business:${membership.business_id}:${membership.role}`,
        email: matchingUser.email,
        userId: membership.user_id,
      },
    ];
  });
  const fixtureClubMemberships = state.clubMemberRows.flatMap((membership) => {
    const matchingUser = userById.get(membership.user_id);

    if (matchingUser?.email === undefined || matchingUser.email === null || !isFixtureTestDomain(matchingUser.email)) {
      return [];
    }

    return [
      {
        context: `club:${membership.club_id}:${membership.role}`,
        email: matchingUser.email,
        userId: membership.user_id,
      },
    ];
  });

  return {
    fixtureAuthUsers,
    fixtureMemberships: [...fixtureBusinessMemberships, ...fixtureClubMemberships],
    fixturePrivilegedProfiles,
    fixtureTestDomainUsers,
    projectRef: state.projectRef,
  };
};

const formatUsers = (findings: FixtureFinding[]): string =>
  findings.map((finding) => `${finding.email}:${finding.userId}`).join(",");

const formatMemberships = (findings: FixtureMembershipFinding[]): string =>
  findings.map((finding) => `${finding.email}:${finding.context}`).join(",");

const run = async (): Promise<void> => {
  const auditState = await readHostedAuditStateAsync();
  const readinessState = buildAuditReadinessState(auditState);

  if (
    readinessState.fixtureAuthUsers.length > 0 ||
    readinessState.fixturePrivilegedProfiles.length > 0 ||
    readinessState.fixtureMemberships.length > 0 ||
    readinessState.fixtureTestDomainUsers.length > 0
  ) {
    throw new Error(
      [
        `Hosted pilot operator hygiene is not ready for project ${readinessState.projectRef}.`,
        `fixture-auth-users=${readinessState.fixtureAuthUsers.length > 0 ? formatUsers(readinessState.fixtureAuthUsers) : "none"}`,
        `fixture-privileged-profiles=${readinessState.fixturePrivilegedProfiles.length > 0 ? formatUsers(readinessState.fixturePrivilegedProfiles) : "none"}`,
        `fixture-active-memberships=${readinessState.fixtureMemberships.length > 0 ? formatMemberships(readinessState.fixtureMemberships) : "none"}`,
        `fixture-test-domain-users=${readinessState.fixtureTestDomainUsers.length > 0 ? formatUsers(readinessState.fixtureTestDomainUsers) : "none"}`,
        "next=replace-or-disable-smoke-accounts-and-rerun-audit",
      ].join(" ")
    );
  }

  console.log(
    [
      "pilot-operator-hygiene:READY",
      `project:${readinessState.projectRef}`,
      `supabase-url:${auditState.supabaseUrl}`,
      `fixture-auth-users:${readinessState.fixtureAuthUsers.length}`,
      `fixture-privileged-profiles:${readinessState.fixturePrivilegedProfiles.length}`,
      `fixture-active-memberships:${readinessState.fixtureMemberships.length}`,
      `fixture-test-domain-users:${readinessState.fixtureTestDomainUsers.length}`,
      "next:run-real-pilot-dry-run",
    ].join("|")
  );
};

void run();
