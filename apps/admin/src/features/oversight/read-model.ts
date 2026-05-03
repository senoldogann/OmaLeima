import type { SupabaseClient } from "@supabase/supabase-js";

import {
  formatOversightAuditMeta,
  formatOversightFraudMeta,
} from "@/features/oversight/format";
import type {
  AdminOversightSnapshot,
  FraudReviewSnapshot,
  OversightAuditLogRecord,
  OversightClubRecord,
  OversightEventRecord,
  OversightFraudSignalRecord,
} from "@/features/oversight/types";

const latestClubLimit = 6;
const latestEventLimit = 6;
const latestAuditLimit = 8;
const latestFraudLimit = 8;
const getCurrentTimestamp = (): string => new Date().toISOString();

type ClubRow = {
  city: string | null;
  contact_email: string | null;
  created_at: string;
  id: string;
  name: string;
  status: string;
  university_name: string | null;
};

type EventRow = {
  city: string;
  club_id: string;
  end_at: string;
  id: string;
  name: string;
  start_at: string;
  status: string;
  visibility: string;
};

type AuditLogRow = {
  action: string;
  actor_user_id: string | null;
  created_at: string;
  id: string;
  metadata: Record<string, unknown>;
  resource_id: string | null;
  resource_type: string;
};

type FraudSignalRow = {
  business_id: string | null;
  created_at: string;
  description: string;
  event_id: string | null;
  id: string;
  metadata: Record<string, unknown>;
  scanner_user_id: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "REVIEWED" | "DISMISSED" | "CONFIRMED";
  type: string;
};

type ProfileRow = {
  email: string;
  id: string;
};

type BusinessRow = {
  id: string;
  name: string;
};

const mapClubRecord = (row: ClubRow): OversightClubRecord => ({
  city: row.city,
  contactEmail: row.contact_email,
  createdAt: row.created_at,
  id: row.id,
  name: row.name,
  status: row.status,
  universityName: row.university_name,
});

const fetchLatestClubsAsync = async (supabase: SupabaseClient): Promise<OversightClubRecord[]> => {
  const { data, error } = await supabase
    .from("clubs")
    .select("id,name,city,university_name,contact_email,status,created_at")
    .order("created_at", {
      ascending: false,
    })
    .limit(latestClubLimit)
    .returns<ClubRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load latest clubs: ${error.message}`);
  }

  return data.map(mapClubRecord);
};

const fetchOperationalEventsAsync = async (supabase: SupabaseClient): Promise<EventRow[]> => {
  const threshold = getCurrentTimestamp();
  const { data, error } = await supabase
    .from("events")
    .select("id,club_id,name,city,status,visibility,start_at,end_at")
    .in("status", ["DRAFT", "PUBLISHED", "ACTIVE"])
    .gte("end_at", threshold)
    .order("start_at", {
      ascending: true,
    })
    .limit(latestEventLimit)
    .returns<EventRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load operational events: ${error.message}`);
  }

  return data;
};

const fetchProfilesByIdsAsync = async (supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email")
    .in("id", ids)
    .returns<ProfileRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load oversight profiles: ${error.message}`);
  }

  return new Map<string, string>(data.map((row) => [row.id, row.email]));
};

const fetchClubNamesByIdsAsync = async (supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id,name")
    .in("id", ids)
    .returns<Array<Pick<ClubRow, "id" | "name">>>();

  if (error !== null) {
    throw new Error(`Failed to load oversight club names: ${error.message}`);
  }

  return new Map<string, string>(data.map((row) => [row.id, row.name]));
};

const fetchBusinessNamesByIdsAsync = async (supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id,name")
    .in("id", ids)
    .returns<BusinessRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load oversight business names: ${error.message}`);
  }

  return new Map<string, string>(data.map((row) => [row.id, row.name]));
};

const mapEventRecords = (rows: EventRow[], clubNames: Map<string, string>): OversightEventRecord[] =>
  rows.map((row) => ({
    city: row.city,
    clubName: clubNames.get(row.club_id) ?? null,
    endAt: row.end_at,
    id: row.id,
    name: row.name,
    startAt: row.start_at,
    status: row.status,
    visibility: row.visibility,
  }));

const fetchLatestAuditLogsAsync = async (supabase: SupabaseClient): Promise<AuditLogRow[]> => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,actor_user_id,action,resource_type,resource_id,metadata,created_at")
    .order("created_at", {
      ascending: false,
    })
    .limit(latestAuditLimit)
    .returns<AuditLogRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load audit logs: ${error.message}`);
  }

  return data;
};

const fetchLatestFraudSignalsAsync = async (supabase: SupabaseClient): Promise<FraudSignalRow[]> => {
  const { data, error } = await supabase
    .from("fraud_signals")
    .select("id,event_id,business_id,scanner_user_id,type,severity,description,metadata,status,created_at")
    .eq("status", "OPEN")
    .order("created_at", {
      ascending: false,
    })
    .limit(latestFraudLimit)
    .returns<FraudSignalRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load fraud signals: ${error.message}`);
  }

  return data;
};

const mapAuditLogRecords = (
  rows: AuditLogRow[],
  actorEmails: Map<string, string>
): OversightAuditLogRecord[] =>
  rows.map((row) => ({
    action: row.action,
    actorEmail: row.actor_user_id !== null ? actorEmails.get(row.actor_user_id) ?? null : null,
    createdAt: row.created_at,
    id: row.id,
    metadataSummary: formatOversightAuditMeta(row.metadata),
    resourceId: row.resource_id,
    resourceType: row.resource_type,
  }));

const mapFraudSignalRecords = (
  rows: FraudSignalRow[],
  eventNames: Map<string, string>,
  businessNames: Map<string, string>,
  scannerEmails: Map<string, string>
): OversightFraudSignalRecord[] =>
  rows.map((row) => ({
    businessName: row.business_id !== null ? businessNames.get(row.business_id) ?? null : null,
    createdAt: row.created_at,
    description: row.description,
    eventName: row.event_id !== null ? eventNames.get(row.event_id) ?? null : null,
    id: row.id,
    metadataSummary: formatOversightFraudMeta(row.metadata),
    scannerEmail: row.scanner_user_id !== null ? scannerEmails.get(row.scanner_user_id) ?? null : null,
    severity: row.severity,
    status: row.status,
    type: row.type,
  }));

const fetchActiveClubCountAsync = async (supabase: SupabaseClient): Promise<number> => {
  const { count, error } = await supabase
    .from("clubs")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "ACTIVE");

  if (error !== null) {
    throw new Error(`Failed to count active clubs: ${error.message}`);
  }

  return count ?? 0;
};

const fetchOperationalEventCountAsync = async (supabase: SupabaseClient): Promise<number> => {
  const threshold = getCurrentTimestamp();
  const { count, error } = await supabase
    .from("events")
    .select("id", {
      count: "exact",
      head: true,
    })
    .in("status", ["DRAFT", "PUBLISHED", "ACTIVE"])
    .gte("end_at", threshold);

  if (error !== null) {
    throw new Error(`Failed to count operational events: ${error.message}`);
  }

  return count ?? 0;
};

const fetchOpenFraudSignalCountAsync = async (supabase: SupabaseClient): Promise<number> => {
  const { count, error } = await supabase
    .from("fraud_signals")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "OPEN");

  if (error !== null) {
    throw new Error(`Failed to count open fraud signals: ${error.message}`);
  }

  return count ?? 0;
};

const fetchRecentAuditCountAsync = async (supabase: SupabaseClient): Promise<number> => {
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("audit_logs")
    .select("id", {
      count: "exact",
      head: true,
    })
    .gte("created_at", threshold);

  if (error !== null) {
    throw new Error(`Failed to count recent audit logs: ${error.message}`);
  }

  return count ?? 0;
};

export const fetchAdminOversightSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<AdminOversightSnapshot> => {
  const [
    latestClubs,
    eventRows,
    auditLogRows,
    fraudSignalRows,
    activeClubCount,
    operationalEventCount,
    openFraudSignalCount,
    recentAuditCount,
  ] = await Promise.all([
    fetchLatestClubsAsync(supabase),
    fetchOperationalEventsAsync(supabase),
    fetchLatestAuditLogsAsync(supabase),
    fetchLatestFraudSignalsAsync(supabase),
    fetchActiveClubCountAsync(supabase),
    fetchOperationalEventCountAsync(supabase),
    fetchOpenFraudSignalCountAsync(supabase),
    fetchRecentAuditCountAsync(supabase),
  ]);

  const [clubNames, actorEmails, businessNames, eventNames, scannerEmails] = await Promise.all([
    fetchClubNamesByIdsAsync(
      supabase,
      Array.from(new Set<string>(eventRows.map((row) => row.club_id)))
    ),
    fetchProfilesByIdsAsync(
      supabase,
      Array.from(new Set<string>(auditLogRows.flatMap((row) => (row.actor_user_id === null ? [] : [row.actor_user_id]))))
    ),
    fetchBusinessNamesByIdsAsync(
      supabase,
      Array.from(new Set<string>(fraudSignalRows.flatMap((row) => (row.business_id === null ? [] : [row.business_id]))))
    ),
    fetchEventNamesByIdsAsync(
      supabase,
      Array.from(new Set<string>(fraudSignalRows.flatMap((row) => (row.event_id === null ? [] : [row.event_id]))))
    ),
    fetchProfilesByIdsAsync(
      supabase,
      Array.from(new Set<string>(fraudSignalRows.flatMap((row) => (row.scanner_user_id === null ? [] : [row.scanner_user_id]))))
    ),
  ]);

  return {
    auditLogs: mapAuditLogRecords(auditLogRows, actorEmails),
    clubs: latestClubs,
    events: mapEventRecords(eventRows, clubNames),
    fraudSignals: mapFraudSignalRecords(fraudSignalRows, eventNames, businessNames, scannerEmails),
    summary: {
      activeClubCount,
      latestAuditLimit,
      latestClubLimit,
      latestEventLimit,
      latestFraudLimit,
      openFraudSignalCount,
      operationalEventCount,
      recentAuditCount,
    },
  };
};

export const fetchFraudReviewSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<FraudReviewSnapshot> => {
  const [fraudSignalRows, openFraudSignalCount] = await Promise.all([
    fetchLatestFraudSignalsAsync(supabase),
    fetchOpenFraudSignalCountAsync(supabase),
  ]);
  const [businessNames, eventNames, scannerEmails] = await Promise.all([
    fetchBusinessNamesByIdsAsync(
      supabase,
      Array.from(new Set<string>(fraudSignalRows.flatMap((row) => (row.business_id === null ? [] : [row.business_id]))))
    ),
    fetchEventNamesByIdsAsync(
      supabase,
      Array.from(new Set<string>(fraudSignalRows.flatMap((row) => (row.event_id === null ? [] : [row.event_id]))))
    ),
    fetchProfilesByIdsAsync(
      supabase,
      Array.from(new Set<string>(fraudSignalRows.flatMap((row) => (row.scanner_user_id === null ? [] : [row.scanner_user_id]))))
    ),
  ]);

  return {
    fraudSignals: mapFraudSignalRecords(fraudSignalRows, eventNames, businessNames, scannerEmails),
    latestFraudLimit,
    openFraudSignalCount,
  };
};

const fetchEventNamesByIdsAsync = async (supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> => {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("events")
    .select("id,name")
    .in("id", ids)
    .returns<Array<Pick<EventRow, "id" | "name">>>();

  if (error !== null) {
    throw new Error(`Failed to load oversight event names: ${error.message}`);
  }

  return new Map<string, string>(data.map((row) => [row.id, row.name]));
};
