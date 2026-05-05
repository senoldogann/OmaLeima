import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type { BusinessScanHistoryEntry } from "@/features/business/types";

export const RECENT_SCAN_LIMIT = 120;

type StampRow = {
  id: string;
  event_id: string;
  business_id: string;
  student_id: string;
  scanned_at: string;
  validation_status: "VALID" | "MANUAL_REVIEW" | "REVOKED";
  event: {
    name: string;
  } | null;
  business: {
    name: string;
  } | null;
};

type UseBusinessScanHistoryQueryParams = {
  userId: string;
  isEnabled: boolean;
};

export const businessScanHistoryQueryKey = (userId: string) => ["business-scan-history", userId] as const;

const formatStudentLabel = (studentId: string): string => `Student ...${studentId.slice(-4)}`;

const fetchRecentScansAsync = async (userId: string): Promise<StampRow[]> => {
  const { data, error } = await supabase
    .from("stamps")
    .select(
      `
      id,
      event_id,
      business_id,
      student_id,
      scanned_at,
      validation_status,
      event:events(name),
      business:businesses(name)
    `
    )
    .eq("scanner_user_id", userId)
    .order("scanned_at", { ascending: false })
    .limit(RECENT_SCAN_LIMIT)
    .returns<StampRow[]>();

  if (error !== null) {
    throw new Error("Failed to load scan history.", { cause: error });
  }

  return data;
};

const mapHistoryEntries = (rows: StampRow[]): BusinessScanHistoryEntry[] =>
  rows.map((row) => ({
    stampId: row.id,
    eventId: row.event_id,
    eventName: row.event?.name ?? "",
    businessId: row.business_id,
    businessName: row.business?.name ?? "",
    studentId: row.student_id,
    studentLabel: formatStudentLabel(row.student_id),
    scannedAt: row.scanned_at,
    validationStatus: row.validation_status,
  }));

export const fetchBusinessScanHistoryAsync = async (userId: string): Promise<BusinessScanHistoryEntry[]> => {
  const rows = await fetchRecentScansAsync(userId);
  return mapHistoryEntries(rows);
};

export const useBusinessScanHistoryQuery = ({
  userId,
  isEnabled,
}: UseBusinessScanHistoryQueryParams): UseQueryResult<BusinessScanHistoryEntry[], Error> =>
  useQuery({
    queryKey: businessScanHistoryQueryKey(userId),
    queryFn: async () => fetchBusinessScanHistoryAsync(userId),
    enabled: isEnabled,
  });
