import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AdminUserBusinessMembership,
  AdminUserClubMembership,
  AdminUserRecord,
  AdminUserRole,
  AdminUsersSnapshot,
  AdminUserStatus,
} from "@/features/admin-users/types";

type ProfileRow = {
  created_at: string;
  display_name: string | null;
  email: string;
  id: string;
  primary_role: AdminUserRole;
  status: AdminUserStatus;
  updated_at: string;
};

type BusinessStaffRow = {
  business_id: string;
  role: string;
  status: string;
  user_id: string;
};

type BusinessRow = {
  city: string | null;
  id: string;
  name: string;
  status: string;
};

type ClubMemberRow = {
  club_id: string;
  role: string;
  status: string;
  user_id: string;
};

type ClubRow = {
  city: string | null;
  id: string;
  name: string;
  status: string;
};

const profilePageSize = 1000;

const fetchProfilesAsync = async (supabase: SupabaseClient): Promise<ProfileRow[]> => {
  const profiles: ProfileRow[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * profilePageSize;
    const to = from + profilePageSize - 1;
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,display_name,primary_role,status,created_at,updated_at")
      .order("created_at", {
        ascending: false,
      })
      .range(from, to)
      .returns<ProfileRow[]>();

    if (error !== null) {
      throw new Error(`Failed to load admin user profiles page ${page + 1}: ${error.message}`);
    }

    profiles.push(...data);
    hasMore = data.length === profilePageSize;
    page += 1;
  }

  return profiles;
};

const fetchBusinessMembershipsAsync = async (
  supabase: SupabaseClient,
  userIds: string[]
): Promise<BusinessStaffRow[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("business_staff")
    .select("user_id,business_id,role,status")
    .in("user_id", userIds)
    .returns<BusinessStaffRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load admin user business memberships: ${error.message}`);
  }

  return data;
};

const fetchBusinessesAsync = async (
  supabase: SupabaseClient,
  businessIds: string[]
): Promise<Map<string, BusinessRow>> => {
  if (businessIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,city,status")
    .in("id", businessIds)
    .returns<BusinessRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load admin user businesses: ${error.message}`);
  }

  return new Map(data.map((business) => [business.id, business]));
};

const fetchClubMembershipsAsync = async (
  supabase: SupabaseClient,
  userIds: string[]
): Promise<ClubMemberRow[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("club_members")
    .select("user_id,club_id,role,status")
    .in("user_id", userIds)
    .returns<ClubMemberRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load admin user club memberships: ${error.message}`);
  }

  return data;
};

const fetchClubsAsync = async (
  supabase: SupabaseClient,
  clubIds: string[]
): Promise<Map<string, ClubRow>> => {
  if (clubIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id,name,city,status")
    .in("id", clubIds)
    .returns<ClubRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load admin user clubs: ${error.message}`);
  }

  return new Map(data.map((club) => [club.id, club]));
};

const groupBusinessMembershipsByUser = (
  memberships: BusinessStaffRow[],
  businessById: Map<string, BusinessRow>
): Map<string, AdminUserBusinessMembership[]> => {
  const result = new Map<string, AdminUserBusinessMembership[]>();

  memberships.forEach((membership) => {
    const business = businessById.get(membership.business_id);

    if (business === undefined) {
      throw new Error(`Business membership ${membership.business_id} for user ${membership.user_id} has no readable business row.`);
    }

    const list = result.get(membership.user_id) ?? [];
    list.push({
      businessCity: business.city,
      businessId: business.id,
      businessName: business.name,
      businessStatus: business.status,
      role: membership.role,
      status: membership.status,
    });
    result.set(membership.user_id, list);
  });

  return result;
};

const groupClubMembershipsByUser = (
  memberships: ClubMemberRow[],
  clubById: Map<string, ClubRow>
): Map<string, AdminUserClubMembership[]> => {
  const result = new Map<string, AdminUserClubMembership[]>();

  memberships.forEach((membership) => {
    const club = clubById.get(membership.club_id);

    if (club === undefined) {
      throw new Error(`Club membership ${membership.club_id} for user ${membership.user_id} has no readable club row.`);
    }

    const list = result.get(membership.user_id) ?? [];
    list.push({
      clubCity: club.city,
      clubId: club.id,
      clubName: club.name,
      clubStatus: club.status,
      role: membership.role,
      status: membership.status,
    });
    result.set(membership.user_id, list);
  });

  return result;
};

export const fetchAdminUsersSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<AdminUsersSnapshot> => {
  const profiles = await fetchProfilesAsync(supabase);
  const userIds = profiles.map((profile) => profile.id);
  const [businessMemberships, clubMemberships] = await Promise.all([
    fetchBusinessMembershipsAsync(supabase, userIds),
    fetchClubMembershipsAsync(supabase, userIds),
  ]);
  const [businessById, clubById] = await Promise.all([
    fetchBusinessesAsync(supabase, Array.from(new Set(businessMemberships.map((membership) => membership.business_id)))),
    fetchClubsAsync(supabase, Array.from(new Set(clubMemberships.map((membership) => membership.club_id)))),
  ]);
  const businessMembershipsByUser = groupBusinessMembershipsByUser(businessMemberships, businessById);
  const clubMembershipsByUser = groupClubMembershipsByUser(clubMemberships, clubById);
  const users: AdminUserRecord[] = profiles.map((profile) => ({
    businessMemberships: businessMembershipsByUser.get(profile.id) ?? [],
    clubMemberships: clubMembershipsByUser.get(profile.id) ?? [],
    createdAt: profile.created_at,
    displayName: profile.display_name,
    email: profile.email,
    id: profile.id,
    primaryRole: profile.primary_role,
    status: profile.status,
    updatedAt: profile.updated_at,
  }));

  return {
    activeCount: users.filter((user) => user.status === "ACTIVE").length,
    suspendedCount: users.filter((user) => user.status === "SUSPENDED").length,
    deletedCount: users.filter((user) => user.status === "DELETED").length,
    users,
  };
};
