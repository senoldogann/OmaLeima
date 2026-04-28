import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DepartmentTagMergeTarget,
  DepartmentTagModerationSnapshot,
  DepartmentTagRecord,
  DepartmentTagSourceType,
  DepartmentTagStatus,
} from "@/features/department-tags/types";

const pendingTagLimit = 8;
const activeUserTagLimit = 8;
const recentModeratedTagLimit = 8;

type DepartmentTagRow = {
  city: string | null;
  created_at: string;
  created_by: string | null;
  id: string;
  merged_into_tag_id: string | null;
  slug: string;
  source_club_id: string | null;
  source_type: DepartmentTagSourceType;
  status: DepartmentTagStatus;
  title: string;
  university_name: string | null;
  updated_at: string;
};

type ProfileDepartmentTagRow = {
  department_tag_id: string;
};

type ProfileRow = {
  email: string;
  id: string;
};

type ClubRow = {
  id: string;
  name: string;
};

const tagSourceTypePriority: Record<DepartmentTagSourceType, number> = {
  ADMIN: 0,
  CLUB: 1,
  USER: 2,
};

const fetchPendingDepartmentTagsAsync = async (
  supabase: SupabaseClient
): Promise<DepartmentTagRow[]> => {
  const { data, error } = await supabase
    .from("department_tags")
    .select(
      "id,title,slug,university_name,city,source_type,source_club_id,created_by,status,merged_into_tag_id,created_at,updated_at"
    )
    .eq("status", "PENDING_REVIEW")
    .order("created_at", {
      ascending: true,
    })
    .limit(pendingTagLimit)
    .returns<DepartmentTagRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load pending department tags: ${error.message}`);
  }

  return data;
};

const fetchActiveUserDepartmentTagsAsync = async (
  supabase: SupabaseClient
): Promise<DepartmentTagRow[]> => {
  const { data, error } = await supabase
    .from("department_tags")
    .select(
      "id,title,slug,university_name,city,source_type,source_club_id,created_by,status,merged_into_tag_id,created_at,updated_at"
    )
    .eq("status", "ACTIVE")
    .eq("source_type", "USER")
    .order("created_at", {
      ascending: false,
    })
    .limit(activeUserTagLimit)
    .returns<DepartmentTagRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active custom department tags: ${error.message}`);
  }

  return data;
};

const fetchRecentlyModeratedDepartmentTagsAsync = async (
  supabase: SupabaseClient
): Promise<DepartmentTagRow[]> => {
  const { data, error } = await supabase
    .from("department_tags")
    .select(
      "id,title,slug,university_name,city,source_type,source_club_id,created_by,status,merged_into_tag_id,created_at,updated_at"
    )
    .in("status", ["MERGED", "BLOCKED"])
    .order("updated_at", {
      ascending: false,
    })
    .limit(recentModeratedTagLimit)
    .returns<DepartmentTagRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load recently moderated department tags: ${error.message}`);
  }

  return data;
};

const fetchActiveMergeTargetsAsync = async (supabase: SupabaseClient): Promise<DepartmentTagRow[]> => {
  const { data, error } = await supabase
    .from("department_tags")
    .select(
      "id,title,slug,university_name,city,source_type,source_club_id,created_by,status,merged_into_tag_id,created_at,updated_at"
    )
    .eq("status", "ACTIVE")
    .is("merged_into_tag_id", null)
    .returns<DepartmentTagRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load department tag merge targets: ${error.message}`);
  }

  return data;
};

const fetchProfileEmailsByIdsAsync = async (
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, string>> => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email")
    .in("id", ids)
    .returns<ProfileRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load department tag creator emails: ${error.message}`);
  }

  return new Map<string, string>(data.map((row) => [row.id, row.email]));
};

const fetchClubNamesByIdsAsync = async (
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, string>> => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id,name")
    .in("id", ids)
    .returns<ClubRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load department tag source clubs: ${error.message}`);
  }

  return new Map<string, string>(data.map((row) => [row.id, row.name]));
};

const fetchTagTitlesByIdsAsync = async (
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, string>> => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("department_tags")
    .select("id,title")
    .in("id", ids)
    .returns<Array<Pick<DepartmentTagRow, "id" | "title">>>();

  if (error !== null) {
    throw new Error(`Failed to load merged department tag titles: ${error.message}`);
  }

  return new Map<string, string>(data.map((row) => [row.id, row.title]));
};

const fetchProfileLinkCountsAsync = async (
  supabase: SupabaseClient,
  departmentTagIds: string[]
): Promise<Map<string, number>> => {
  if (departmentTagIds.length === 0) {
    return new Map<string, number>();
  }

  const { data, error } = await supabase
    .from("profile_department_tags")
    .select("department_tag_id")
    .in("department_tag_id", departmentTagIds)
    .returns<ProfileDepartmentTagRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load department tag profile link counts: ${error.message}`);
  }

  const counts = new Map<string, number>();

  data.forEach((row) => {
    counts.set(row.department_tag_id, (counts.get(row.department_tag_id) ?? 0) + 1);
  });

  return counts;
};

const fetchPendingTagCountAsync = async (supabase: SupabaseClient): Promise<number> => {
  const { count, error } = await supabase
    .from("department_tags")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "PENDING_REVIEW");

  if (error !== null) {
    throw new Error(`Failed to count pending department tags: ${error.message}`);
  }

  return count ?? 0;
};

const fetchActiveUserTagCountAsync = async (supabase: SupabaseClient): Promise<number> => {
  const { count, error } = await supabase
    .from("department_tags")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "ACTIVE")
    .eq("source_type", "USER");

  if (error !== null) {
    throw new Error(`Failed to count active custom department tags: ${error.message}`);
  }

  return count ?? 0;
};

const fetchRecentlyModeratedTagCountAsync = async (supabase: SupabaseClient): Promise<number> => {
  const { count, error } = await supabase
    .from("department_tags")
    .select("id", {
      count: "exact",
      head: true,
    })
    .in("status", ["MERGED", "BLOCKED"]);

  if (error !== null) {
    throw new Error(`Failed to count recently moderated department tags: ${error.message}`);
  }

  return count ?? 0;
};

const fetchActiveTargetCountAsync = async (supabase: SupabaseClient): Promise<number> => {
  const { count, error } = await supabase
    .from("department_tags")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "ACTIVE")
    .is("merged_into_tag_id", null);

  if (error !== null) {
    throw new Error(`Failed to count active department tag targets: ${error.message}`);
  }

  return count ?? 0;
};

const mapDepartmentTagRecord = (
  row: DepartmentTagRow,
  clubNames: Map<string, string>,
  creatorEmails: Map<string, string>,
  mergedTitles: Map<string, string>,
  profileLinkCounts: Map<string, number>
): DepartmentTagRecord => ({
  city: row.city,
  createdAt: row.created_at,
  createdByEmail: row.created_by !== null ? creatorEmails.get(row.created_by) ?? null : null,
  id: row.id,
  mergedIntoTagId: row.merged_into_tag_id,
  mergedIntoTitle:
    row.merged_into_tag_id !== null ? mergedTitles.get(row.merged_into_tag_id) ?? null : null,
  profileLinkCount: profileLinkCounts.get(row.id) ?? 0,
  slug: row.slug,
  sourceClubName: row.source_club_id !== null ? clubNames.get(row.source_club_id) ?? null : null,
  sourceType: row.source_type,
  status: row.status,
  title: row.title,
  universityName: row.university_name,
  updatedAt: row.updated_at,
});

const mapMergeTargets = (rows: DepartmentTagRow[]): DepartmentTagMergeTarget[] =>
  rows
    .sort((left, right) => {
      const sourcePriorityDelta =
        tagSourceTypePriority[left.source_type] - tagSourceTypePriority[right.source_type];

      if (sourcePriorityDelta !== 0) {
        return sourcePriorityDelta;
      }

      return left.title.localeCompare(right.title, "en");
    })
    .map((row) => ({
      city: row.city,
      id: row.id,
      sourceType: row.source_type,
      title: row.title,
      universityName: row.university_name,
    }));

export const fetchDepartmentTagModerationSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<DepartmentTagModerationSnapshot> => {
  const [
    pendingRows,
    activeUserRows,
    recentlyModeratedRows,
    activeTargetRows,
    pendingCount,
    activeCustomCount,
    recentlyModeratedCount,
    activeTargetCount,
  ] = await Promise.all([
    fetchPendingDepartmentTagsAsync(supabase),
    fetchActiveUserDepartmentTagsAsync(supabase),
    fetchRecentlyModeratedDepartmentTagsAsync(supabase),
    fetchActiveMergeTargetsAsync(supabase),
    fetchPendingTagCountAsync(supabase),
    fetchActiveUserTagCountAsync(supabase),
    fetchRecentlyModeratedTagCountAsync(supabase),
    fetchActiveTargetCountAsync(supabase),
  ]);

  const moderationRows = [...pendingRows, ...activeUserRows, ...recentlyModeratedRows];
  const mergedTargetIds = Array.from(
    new Set<string>(
      moderationRows.flatMap((row) => (row.merged_into_tag_id === null ? [] : [row.merged_into_tag_id]))
    )
  );
  const creatorIds = Array.from(
    new Set<string>(moderationRows.flatMap((row) => (row.created_by === null ? [] : [row.created_by])))
  );
  const clubIds = Array.from(
    new Set<string>(
      moderationRows.flatMap((row) => (row.source_club_id === null ? [] : [row.source_club_id]))
    )
  );
  const profileLinkCounts = await fetchProfileLinkCountsAsync(
    supabase,
    Array.from(new Set<string>(moderationRows.map((row) => row.id)))
  );
  const [creatorEmails, clubNames, mergedTitles] = await Promise.all([
    fetchProfileEmailsByIdsAsync(supabase, creatorIds),
    fetchClubNamesByIdsAsync(supabase, clubIds),
    fetchTagTitlesByIdsAsync(supabase, mergedTargetIds),
  ]);

  return {
    activeCustomTags: activeUserRows.map((row) =>
      mapDepartmentTagRecord(row, clubNames, creatorEmails, mergedTitles, profileLinkCounts)
    ),
    mergeTargets: mapMergeTargets(activeTargetRows),
    pendingTags: pendingRows.map((row) =>
      mapDepartmentTagRecord(row, clubNames, creatorEmails, mergedTitles, profileLinkCounts)
    ),
    recentlyModeratedTags: recentlyModeratedRows.map((row) =>
      mapDepartmentTagRecord(row, clubNames, creatorEmails, mergedTitles, profileLinkCounts)
    ),
    summary: {
      activeCustomCount,
      activeTargetCount,
      pendingCount,
      pendingLimit: pendingTagLimit,
      recentLimit: recentModeratedTagLimit,
      recentlyModeratedCount,
      userTagLimit: activeUserTagLimit,
    },
  };
};
