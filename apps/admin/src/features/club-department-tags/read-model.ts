import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchClubEventContextAsync } from "@/features/club-events/context";
import type {
  ClubDepartmentTagsSnapshot,
  ClubOfficialDepartmentTagRecord,
  ManageableDepartmentTagClub,
} from "@/features/club-department-tags/types";

const visibleTagLimit = 24;

type DepartmentTagRow = {
  city: string | null;
  created_at: string;
  id: string;
  slug: string;
  source_club_id: string;
  title: string;
  university_name: string | null;
};

const fetchOfficialClubDepartmentTagsAsync = async (
  supabase: SupabaseClient,
  clubIds: string[]
): Promise<DepartmentTagRow[]> => {
  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("department_tags")
    .select("id,title,slug,university_name,city,source_club_id,created_at")
    .eq("source_type", "CLUB")
    .eq("status", "ACTIVE")
    .in("source_club_id", clubIds)
    .order("created_at", {
      ascending: false,
    })
    .returns<DepartmentTagRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load official club department tags: ${error.message}`);
  }

  return data;
};

const buildTagCountByClubId = (rows: DepartmentTagRow[]): Map<string, number> => {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    counts.set(row.source_club_id, (counts.get(row.source_club_id) ?? 0) + 1);
  });

  return counts;
};

const mapManageableClubs = (
  tagCountByClubId: Map<string, number>,
  memberships: Awaited<ReturnType<typeof fetchClubEventContextAsync>>["memberships"]
): ManageableDepartmentTagClub[] =>
  memberships
    .filter((membership) => membership.canCreateEvents)
    .map((membership) => ({
      city: membership.city,
      clubId: membership.clubId,
      clubName: membership.clubName,
      existingOfficialTagCount: tagCountByClubId.get(membership.clubId) ?? 0,
      membershipRole: membership.membershipRole === "OWNER" ? "OWNER" : "ORGANIZER",
      universityName: membership.universityName,
    }));

const mapOfficialTags = (
  rows: DepartmentTagRow[],
  clubNameById: Map<string, string>
): ClubOfficialDepartmentTagRecord[] =>
  rows.slice(0, visibleTagLimit).flatMap((row) => {
    const clubName = clubNameById.get(row.source_club_id);

    if (typeof clubName === "undefined") {
      return [];
    }

    return [
      {
        city: row.city,
        clubId: row.source_club_id,
        clubName,
        createdAt: row.created_at,
        departmentTagId: row.id,
        slug: row.slug,
        title: row.title,
        universityName: row.university_name,
      },
    ];
  });

export const fetchClubDepartmentTagsSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<ClubDepartmentTagsSnapshot> => {
  const context = await fetchClubEventContextAsync(supabase);
  const manageableMemberships = context.memberships.filter((membership) => membership.canCreateEvents);
  const clubIds = manageableMemberships.map((membership) => membership.clubId);
  const tagRows = await fetchOfficialClubDepartmentTagsAsync(supabase, clubIds);
  const tagCountByClubId = buildTagCountByClubId(tagRows);
  const clubs = mapManageableClubs(tagCountByClubId, context.memberships);
  const clubNameById = new Map(clubs.map((club) => [club.clubId, club.clubName] as const));

  return {
    clubs,
    officialTags: mapOfficialTags(tagRows, clubNameById),
    summary: {
      manageableClubCount: clubs.length,
      totalOfficialTagCount: tagRows.length,
      visibleOfficialTagCount: Math.min(tagRows.length, visibleTagLimit),
      visibleTagLimit,
    },
  };
};
