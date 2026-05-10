import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  SupportRequester,
  SupportRequestArea,
  SupportRequestCounts,
  SupportRequestRecord,
  SupportRequestsSnapshot,
  SupportRequestStatus,
  SupportRequestTarget,
} from "@/features/support-requests/types";

type SupportRequestRow = {
  admin_reply: string | null;
  area: SupportRequestArea;
  business_id: string | null;
  club_id: string | null;
  created_at: string;
  id: string;
  message: string;
  resolved_at: string | null;
  status: SupportRequestStatus;
  subject: string;
  updated_at: string;
  user_id: string;
};

type ProfileRow = {
  display_name: string | null;
  email: string;
  id: string;
  primary_role: string;
  status: string;
};

type BusinessRow = {
  city: string | null;
  id: string;
  name: string;
  status: string;
};

type ClubRow = {
  city: string | null;
  id: string;
  name: string;
  status: string;
};

const supportRequestsPageSize = 1000;
const supportRequestSelectColumns =
  "id,user_id,business_id,club_id,area,subject,message,status,admin_reply,created_at,updated_at,resolved_at";

const buildEmptyCounts = (): SupportRequestCounts => ({
  closed: 0,
  inProgress: 0,
  open: 0,
  resolved: 0,
  total: 0,
});

const createUniqueValues = (values: (string | null)[]): string[] => {
  const uniqueValues = new Set<string>();

  for (const value of values) {
    if (value !== null) {
      uniqueValues.add(value);
    }
  }

  return Array.from(uniqueValues);
};

const incrementCounts = (
  counts: SupportRequestCounts,
  status: SupportRequestStatus
): SupportRequestCounts => ({
  closed: counts.closed + (status === "CLOSED" ? 1 : 0),
  inProgress: counts.inProgress + (status === "IN_PROGRESS" ? 1 : 0),
  open: counts.open + (status === "OPEN" ? 1 : 0),
  resolved: counts.resolved + (status === "RESOLVED" ? 1 : 0),
  total: counts.total + 1,
});

const fetchSupportRequestRowsPageAsync = async (
  supabase: SupabaseClient,
  startInclusive: number,
  endInclusive: number
): Promise<SupportRequestRow[]> => {
  const { data, error } = await supabase
    .from("support_requests")
    .select(supportRequestSelectColumns)
    .order("created_at", { ascending: false })
    .range(startInclusive, endInclusive)
    .returns<SupportRequestRow[]>();

  if (error !== null) {
    throw new Error(
      `Failed to load support requests page ${startInclusive}-${endInclusive}: ${error.message}`
    );
  }

  return data;
};

const fetchSupportRequestRowsAsync = async (supabase: SupabaseClient): Promise<SupportRequestRow[]> => {
  let rows: SupportRequestRow[] = [];
  let startInclusive = 0;

  while (true) {
    const endInclusive = startInclusive + supportRequestsPageSize - 1;
    const page = await fetchSupportRequestRowsPageAsync(supabase, startInclusive, endInclusive);
    rows = [...rows, ...page];

    if (page.length < supportRequestsPageSize) {
      return rows;
    }

    startInclusive += supportRequestsPageSize;
  }
};

const fetchProfilesAsync = async (
  supabase: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, ProfileRow>> => {
  if (profileIds.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,primary_role,status")
    .in("id", profileIds)
    .returns<ProfileRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load support request profiles: ${error.message}`);
  }

  return new Map(data.map((profile) => [profile.id, profile]));
};

const fetchBusinessesAsync = async (
  supabase: SupabaseClient,
  businessIds: string[]
): Promise<Map<string, BusinessRow>> => {
  if (businessIds.length === 0) {
    return new Map<string, BusinessRow>();
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,city,status")
    .in("id", businessIds)
    .returns<BusinessRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load support request businesses: ${error.message}`);
  }

  return new Map(data.map((business) => [business.id, business]));
};

const fetchClubsAsync = async (
  supabase: SupabaseClient,
  clubIds: string[]
): Promise<Map<string, ClubRow>> => {
  if (clubIds.length === 0) {
    return new Map<string, ClubRow>();
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id,name,city,status")
    .in("id", clubIds)
    .returns<ClubRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load support request clubs: ${error.message}`);
  }

  return new Map(data.map((club) => [club.id, club]));
};

const createMissingRequester = (userId: string): SupportRequester => ({
  displayName: null,
  email: "Deleted or missing profile",
  id: userId,
  primaryRole: "UNKNOWN",
  status: "DELETED",
});

const mapRequester = (row: SupportRequestRow, profilesById: Map<string, ProfileRow>): SupportRequester => {
  const profile = profilesById.get(row.user_id);

  if (typeof profile === "undefined") {
    return createMissingRequester(row.user_id);
  }

  return {
    displayName: profile.display_name,
    email: profile.email,
    id: profile.id,
    primaryRole: profile.primary_role,
    status: profile.status,
  };
};

const mapTarget = (
  row: SupportRequestRow,
  businessesById: Map<string, BusinessRow>,
  clubsById: Map<string, ClubRow>
): SupportRequestTarget | null => {
  if (row.business_id !== null) {
    const business = businessesById.get(row.business_id);

    return {
      city: business?.city ?? null,
      id: row.business_id,
      name: business?.name ?? "Deleted or missing business",
      status: business?.status ?? "DELETED",
      type: "business",
    };
  }

  if (row.club_id !== null) {
    const club = clubsById.get(row.club_id);

    return {
      city: club?.city ?? null,
      id: row.club_id,
      name: club?.name ?? "Deleted or missing club",
      status: club?.status ?? "DELETED",
      type: "club",
    };
  }

  return null;
};

const mapSupportRequest = (
  row: SupportRequestRow,
  profilesById: Map<string, ProfileRow>,
  businessesById: Map<string, BusinessRow>,
  clubsById: Map<string, ClubRow>
): SupportRequestRecord => ({
  adminReply: row.admin_reply,
  area: row.area,
  businessId: row.business_id,
  clubId: row.club_id,
  createdAt: row.created_at,
  id: row.id,
  message: row.message,
  requester: mapRequester(row, profilesById),
  resolvedAt: row.resolved_at,
  status: row.status,
  subject: row.subject,
  target: mapTarget(row, businessesById, clubsById),
  updatedAt: row.updated_at,
});

export const fetchSupportRequestsSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<SupportRequestsSnapshot> => {
  const rows = await fetchSupportRequestRowsAsync(supabase);
  const [profilesById, businessesById, clubsById] = await Promise.all([
    fetchProfilesAsync(
      supabase,
      createUniqueValues(rows.map((row) => row.user_id))
    ),
    fetchBusinessesAsync(
      supabase,
      createUniqueValues(rows.map((row) => row.business_id))
    ),
    fetchClubsAsync(
      supabase,
      createUniqueValues(rows.map((row) => row.club_id))
    ),
  ]);

  return {
    counts: rows.reduce<SupportRequestCounts>(
      (counts, row) => incrementCounts(counts, row.status),
      buildEmptyCounts()
    ),
    records: rows.map((row) => mapSupportRequest(row, profilesById, businessesById, clubsById)),
  };
};
