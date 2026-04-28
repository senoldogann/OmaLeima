import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileRole =
  | "STUDENT"
  | "BUSINESS_OWNER"
  | "BUSINESS_STAFF"
  | "CLUB_ORGANIZER"
  | "CLUB_STAFF"
  | "PLATFORM_ADMIN";

type ProfileStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

type ProfileRow = {
  id: string;
  email: string;
  primary_role: ProfileRole;
  status: ProfileStatus;
};

type ClubMembershipRow = {
  club_id: string;
};

type ClubRow = {
  id: string;
};

export type AdminAccessArea = "anonymous" | "admin" | "club" | "unsupported";

export type AdminAccess = {
  area: AdminAccessArea;
  clubMembershipCount: number;
  homeHref: "/login" | "/admin" | "/club" | "/forbidden";
  userId: string | null;
  userEmail: string | null;
  primaryRole: ProfileRole | null;
  profileStatus: ProfileStatus | null;
};

const createAnonymousAccess = (): AdminAccess => ({
  area: "anonymous",
  clubMembershipCount: 0,
  homeHref: "/login",
  userId: null,
  userEmail: null,
  primaryRole: null,
  profileStatus: null,
});

const mapUnsupportedAccess = (
  profile: ProfileRow | null,
  clubMembershipCount: number,
  userId: string | null
): AdminAccess => ({
  area: "unsupported",
  clubMembershipCount,
  homeHref: "/forbidden",
  userId: userId ?? profile?.id ?? null,
  userEmail: profile?.email ?? null,
  primaryRole: profile?.primary_role ?? null,
  profileStatus: profile?.status ?? null,
});

const fetchActiveClubMembershipsAsync = async (
  supabase: SupabaseClient,
  userId: string
): Promise<ClubMembershipRow[]> => {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .returns<ClubMembershipRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active club memberships for ${userId}: ${error.message}`);
  }

  return data;
};

const fetchActiveClubsAsync = async (supabase: SupabaseClient, clubIds: string[]): Promise<ClubRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id")
    .in("id", clubIds)
    .eq("status", "ACTIVE")
    .returns<ClubRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active clubs for admin access: ${error.message}`);
  }

  return data;
};

const mapProfileToAccess = async (supabase: SupabaseClient, profile: ProfileRow): Promise<AdminAccess> => {
  if (profile.status !== "ACTIVE") {
    return mapUnsupportedAccess(profile, 0, profile.id);
  }

  if (profile.primary_role === "PLATFORM_ADMIN") {
    return {
      area: "admin",
      clubMembershipCount: 0,
      homeHref: "/admin",
      userId: profile.id,
      userEmail: profile.email,
      primaryRole: profile.primary_role,
      profileStatus: profile.status,
    };
  }

  if (profile.primary_role === "CLUB_ORGANIZER" || profile.primary_role === "CLUB_STAFF") {
    const memberships = await fetchActiveClubMembershipsAsync(supabase, profile.id);
    const activeClubs = await fetchActiveClubsAsync(
      supabase,
      memberships.map((membership) => membership.club_id)
    );

    if (activeClubs.length === 0) {
      return mapUnsupportedAccess(profile, 0, profile.id);
    }

    return {
      area: "club",
      clubMembershipCount: activeClubs.length,
      homeHref: "/club",
      userId: profile.id,
      userEmail: profile.email,
      primaryRole: profile.primary_role,
      profileStatus: profile.status,
    };
  }

  return mapUnsupportedAccess(profile, 0, profile.id);
};

const fetchProfileAsync = async (supabase: SupabaseClient, userId: string): Promise<ProfileRow | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,primary_role,status")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error !== null) {
    throw new Error(`Failed to load admin access profile ${userId}: ${error.message}`);
  }

  return data;
};

export const resolveAdminAccessByUserIdAsync = async (
  supabase: SupabaseClient,
  userId: string
): Promise<AdminAccess> => {
  const profile = await fetchProfileAsync(supabase, userId);

  if (profile === null) {
    return mapUnsupportedAccess(null, 0, userId);
  }

  return mapProfileToAccess(supabase, profile);
};

export const resolveAdminAccessAsync = async (supabase: SupabaseClient): Promise<AdminAccess> => {
  const claimsResult = await supabase.auth.getClaims();

  if (claimsResult.error !== null) {
    throw new Error(`Failed to resolve admin claims: ${claimsResult.error.message}`);
  }

  const userId = claimsResult.data?.claims?.sub;

  if (typeof userId !== "string") {
    return createAnonymousAccess();
  }

  return resolveAdminAccessByUserIdAsync(supabase, userId);
};
