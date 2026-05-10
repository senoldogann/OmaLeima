import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";
import type { ClubProfileRecord, ClubProfileSnapshot } from "@/features/club-profile/types";

export type ClubProfileMembershipRow = {
  club_id: string;
  role: "OWNER" | "ORGANIZER" | "STAFF";
};

export type ClubProfileClubRow = {
  address: string | null;
  announcement: string | null;
  city: string | null;
  contact_email: string | null;
  id: string;
  instagram_url: string | null;
  name: string;
  phone: string | null;
  university_name: string | null;
  website_url: string | null;
};

const canRoleEditProfile = (role: ClubProfileMembershipRow["role"]): boolean =>
  role === "OWNER" || role === "ORGANIZER";

const fetchActiveClubMembershipRowsAsync = async (
  supabase: SupabaseClient,
  userId: string
): Promise<ClubProfileMembershipRow[]> => {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .returns<ClubProfileMembershipRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club profile memberships for ${userId}: ${error.message}`);
  }

  return data;
};

const fetchClubRowsAsync = async (
  supabase: SupabaseClient,
  clubIds: string[]
): Promise<ClubProfileClubRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id,name,city,university_name,contact_email,phone,address,website_url,instagram_url,announcement")
    .in("id", clubIds)
    .eq("status", "ACTIVE")
    .returns<ClubProfileClubRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active clubs for profile editing: ${error.message}`);
  }

  return data;
};

export const mapClubProfileRecord = (
  club: ClubProfileClubRow,
  membership: ClubProfileMembershipRow
): ClubProfileRecord => ({
  address: club.address,
  announcement: club.announcement,
  canEditProfile: canRoleEditProfile(membership.role),
  city: club.city,
  clubId: club.id,
  clubName: club.name,
  contactEmail: club.contact_email,
  instagramUrl: club.instagram_url,
  membershipRole: membership.role,
  phone: club.phone,
  universityName: club.university_name,
  websiteUrl: club.website_url,
});

export const fetchClubProfileSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<ClubProfileSnapshot> => {
  const access = await resolveCurrentAdminAccessAsync();

  if (access.area !== "club" || access.userId === null) {
    return {
      clubs: [],
    };
  }

  const membershipRows = await fetchActiveClubMembershipRowsAsync(supabase, access.userId);
  const clubs = await fetchClubRowsAsync(
    supabase,
    membershipRows.map((membership) => membership.club_id)
  );
  const clubById = new Map(clubs.map((club) => [club.id, club]));

  return {
    clubs: membershipRows.flatMap((membership) => {
      const club = clubById.get(membership.club_id);

      if (typeof club === "undefined") {
        return [];
      }

      return [mapClubProfileRecord(club, membership)];
    }),
  };
};
