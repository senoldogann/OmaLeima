import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getPreferredMobileRoleAreaAsync, type MobileRoleArea } from "@/features/auth/mobile-role-preference";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  primary_role: "STUDENT" | "BUSINESS_OWNER" | "BUSINESS_STAFF" | "CLUB_ORGANIZER" | "CLUB_STAFF" | "PLATFORM_ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
};

type BusinessMembershipRow = {
  business_id: string;
  role: "OWNER" | "MANAGER" | "SCANNER";
  status: "ACTIVE" | "DISABLED";
};

type BusinessRow = {
  id: string;
};

type ClubMembershipRow = {
  club_id: string;
  role: "OWNER" | "ORGANIZER" | "STAFF";
  status: "ACTIVE" | "DISABLED";
};

type ClubRow = {
  id: string;
};

export type SessionAccessArea = MobileRoleArea | "unsupported";

export type SessionAccess = {
  userId: string;
  area: SessionAccessArea;
  homeHref: "/student/events" | "/business/home" | "/business/scanner" | "/club/home" | null;
  primaryRole: ProfileRow["primary_role"];
  profileStatus: ProfileRow["status"];
  businessMembershipCount: number;
  clubMembershipCount: number;
  isBusinessScannerOnly: boolean;
  availableAreas: MobileRoleArea[];
  preferredArea: MobileRoleArea | null;
};

type UseSessionAccessQueryParams = {
  userId: string;
  isEnabled: boolean;
};

export const sessionAccessQueryKey = (userId: string) => ["session-access", userId] as const;

const fetchProfileAsync = async (userId: string): Promise<ProfileRow | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,primary_role,status")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error !== null) {
    throw new Error(`Failed to load session profile ${userId}: ${error.message}`);
  }

  return data;
};

const fetchBusinessMembershipsAsync = async (userId: string): Promise<BusinessMembershipRow[]> => {
  const { data, error } = await supabase
    .from("business_staff")
    .select("business_id,role,status")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .returns<BusinessMembershipRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active business memberships for ${userId}: ${error.message}`);
  }

  return data;
};

const fetchClubMembershipsAsync = async (userId: string): Promise<ClubMembershipRow[]> => {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id,role,status")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .returns<ClubMembershipRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active club memberships for ${userId}: ${error.message}`);
  }

  return data;
};

const fetchActiveBusinessesAsync = async (businessIds: string[]): Promise<BusinessRow[]> => {
  if (businessIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .in("id", businessIds)
    .eq("status", "ACTIVE")
    .returns<BusinessRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active businesses for the current session: ${error.message}`);
  }

  return data;
};

const fetchActiveClubsAsync = async (clubIds: string[]): Promise<ClubRow[]> => {
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
    throw new Error(`Failed to load active clubs for the current session: ${error.message}`);
  }

  return data;
};

const getHomeHrefForArea = (
  area: MobileRoleArea,
  isBusinessScannerOnly: boolean
): SessionAccess["homeHref"] => {
  if (area === "business") {
    return isBusinessScannerOnly ? "/business/scanner" : "/business/home";
  }

  if (area === "club") {
    return "/club/home";
  }

  return "/student/events";
};

const chooseAccessArea = (
  availableAreas: MobileRoleArea[],
  preferredArea: MobileRoleArea | null
): MobileRoleArea | null => {
  if (preferredArea !== null && availableAreas.includes(preferredArea)) {
    return preferredArea;
  }

  return availableAreas[0] ?? null;
};

const createSessionAccess = ({
  activeArea,
  availableAreas,
  businessMembershipCount,
  clubMembershipCount,
  isBusinessScannerOnly,
  preferredArea,
  profile,
  userId,
}: {
  activeArea: MobileRoleArea;
  availableAreas: MobileRoleArea[];
  businessMembershipCount: number;
  clubMembershipCount: number;
  isBusinessScannerOnly: boolean;
  preferredArea: MobileRoleArea | null;
  profile: ProfileRow;
  userId: string;
}): SessionAccess => ({
  userId,
  area: activeArea,
  homeHref: getHomeHrefForArea(activeArea, isBusinessScannerOnly),
  primaryRole: profile.primary_role,
  profileStatus: profile.status,
  businessMembershipCount,
  clubMembershipCount,
  isBusinessScannerOnly,
  availableAreas,
  preferredArea,
});

export const fetchSessionAccessAsync = async (userId: string): Promise<SessionAccess> => {
  const [profile, businessMemberships, clubMemberships, preferredArea] = await Promise.all([
    fetchProfileAsync(userId),
    fetchBusinessMembershipsAsync(userId),
    fetchClubMembershipsAsync(userId),
    getPreferredMobileRoleAreaAsync(),
  ]);

  if (profile === null) {
    throw new Error(`No session profile exists yet for ${userId}.`);
  }

  const activeBusinesses = await fetchActiveBusinessesAsync(
    businessMemberships.map((membership) => membership.business_id)
  );
  const activeClubs = await fetchActiveClubsAsync(
    clubMemberships.map((membership) => membership.club_id)
  );
  const activeBusinessIds = new Set(activeBusinesses.map((business) => business.id));
  const activeClubIds = new Set(activeClubs.map((club) => club.id));
  const activeBusinessMemberships = businessMemberships.filter((membership) =>
    activeBusinessIds.has(membership.business_id)
  );
  const activeBusinessMembershipCount = activeBusinessMemberships.length;
  const isBusinessScannerOnly =
    activeBusinessMemberships.length > 0 && activeBusinessMemberships.every((membership) => membership.role === "SCANNER");
  const activeClubMembershipCount = clubMemberships.filter((membership) =>
    activeClubIds.has(membership.club_id)
  ).length;

  if (profile.status !== "ACTIVE") {
    return {
      userId,
      area: "unsupported",
      homeHref: null,
      primaryRole: profile.primary_role,
      profileStatus: profile.status,
      businessMembershipCount: activeBusinessMembershipCount,
      clubMembershipCount: activeClubMembershipCount,
      isBusinessScannerOnly,
      availableAreas: [],
      preferredArea,
    };
  }

  if (isBusinessScannerOnly) {
    return createSessionAccess({
      activeArea: "business",
      availableAreas: ["business"],
      businessMembershipCount: activeBusinessMembershipCount,
      clubMembershipCount: activeClubMembershipCount,
      isBusinessScannerOnly,
      preferredArea,
      profile,
      userId,
    });
  }

  const availableAreas: MobileRoleArea[] = [
    ...(activeBusinessMembershipCount > 0 ? (["business"] as const) : []),
    ...(activeClubMembershipCount > 0 ? (["club"] as const) : []),
    ...(profile.primary_role === "STUDENT" ? (["student"] as const) : []),
  ];
  const activeArea = chooseAccessArea(availableAreas, preferredArea);

  if (activeArea !== null) {
    return createSessionAccess({
      activeArea,
      availableAreas,
      businessMembershipCount: activeBusinessMembershipCount,
      clubMembershipCount: activeClubMembershipCount,
      isBusinessScannerOnly: false,
      preferredArea,
      profile,
      userId,
    });
  }

  return {
    userId,
    area: "unsupported",
    homeHref: null,
    primaryRole: profile.primary_role,
    profileStatus: profile.status,
    businessMembershipCount: 0,
    clubMembershipCount: activeClubMembershipCount,
    isBusinessScannerOnly: false,
    availableAreas: [],
    preferredArea,
  };
};

export const useSessionAccessQuery = ({
  userId,
  isEnabled,
}: UseSessionAccessQueryParams): UseQueryResult<SessionAccess, Error> =>
  useQuery({
    queryKey: sessionAccessQueryKey(userId),
    queryFn: async () => fetchSessionAccessAsync(userId),
    enabled: isEnabled,
  });
