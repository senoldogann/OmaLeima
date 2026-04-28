import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import type { ClubMembershipRole, ClubMembershipSummary } from "@/features/club-events/types";

type ClubMembershipRow = {
  club_id: string;
  role: ClubMembershipRole;
};

type ClubRow = {
  city: string | null;
  id: string;
  name: string;
  university_name: string | null;
};

export type ClubEventContext = {
  access: Awaited<ReturnType<typeof resolveAdminAccessAsync>>;
  memberships: ClubMembershipSummary[];
};

const fetchClubMembershipRowsAsync = async (
  supabase: SupabaseClient,
  userId: string
): Promise<ClubMembershipRow[]> => {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id,role")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .returns<ClubMembershipRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load club memberships for ${userId}: ${error.message}`);
  }

  return data;
};

const fetchClubsByIdsAsync = async (supabase: SupabaseClient, clubIds: string[]): Promise<ClubRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id,name,city,university_name")
    .in("id", clubIds)
    .eq("status", "ACTIVE")
    .returns<ClubRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active clubs for club events: ${error.message}`);
  }

  return data;
};

export const fetchClubEventContextAsync = async (
  supabase: SupabaseClient
): Promise<ClubEventContext> => {
  const access = await resolveAdminAccessAsync(supabase);

  if (access.area !== "club" || access.userId === null) {
    return {
      access,
      memberships: [],
    };
  }

  const membershipRows = await fetchClubMembershipRowsAsync(supabase, access.userId);
  const clubs = await fetchClubsByIdsAsync(
    supabase,
    membershipRows.map((membership) => membership.club_id)
  );
  const clubById = new Map(clubs.map((club) => [club.id, club]));
  const memberships = membershipRows.flatMap((membership) => {
    const club = clubById.get(membership.club_id);

    if (typeof club === "undefined") {
      return [];
    }

    return [
      {
        canCreateEvents: membership.role === "OWNER" || membership.role === "ORGANIZER",
        city: club.city,
        clubId: club.id,
        clubName: club.name,
        membershipRole: membership.role,
        universityName: club.university_name,
      },
    ];
  });

  return {
    access,
    memberships,
  };
};
