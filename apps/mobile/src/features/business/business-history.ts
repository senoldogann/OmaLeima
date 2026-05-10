import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type { BusinessScanHistoryEntry } from "@/features/business/types";

export const RECENT_SCAN_LIMIT = 120;

type StampRow = {
  stamp_id: string;
  event_id: string;
  event_name: string;
  business_id: string;
  business_name: string;
  student_id: string;
  scanned_at: string;
  validation_status: "VALID" | "MANUAL_REVIEW" | "REVOKED";
};

type UseBusinessScanHistoryQueryParams = {
  userId: string;
  isEnabled: boolean;
};

export const businessScanHistoryQueryKey = (userId: string) => ["business-scan-history", userId] as const;

const formatStudentLabel = (studentId: string): string => `Student ...${studentId.slice(-4)}`;

const fetchRecentScansAsync = async (): Promise<StampRow[]> => {
  const { data, error } = await supabase
    .rpc("get_business_scan_history", {
      p_limit: RECENT_SCAN_LIMIT,
    })
    .returns<StampRow[]>();

  if (error !== null) {
    throw new Error("Failed to load scan history.", { cause: error });
  }

  if (!Array.isArray(data)) {
    throw new Error("Business scan history RPC returned an invalid row set.");
  }

  return data as StampRow[];
};

const mapHistoryEntries = (rows: StampRow[]): BusinessScanHistoryEntry[] =>
  rows.map((row) => ({
    stampId: row.stamp_id,
    eventId: row.event_id,
    eventName: row.event_name ?? "",
    businessId: row.business_id,
    businessName: row.business_name ?? "",
    studentId: row.student_id,
    studentLabel: formatStudentLabel(row.student_id),
    scannedAt: row.scanned_at,
    validationStatus: row.validation_status,
  }));

export const fetchBusinessScanHistoryAsync = async (_userId: string): Promise<BusinessScanHistoryEntry[]> => {
  const rows = await fetchRecentScansAsync();
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
