export type OversightClubRecord = {
  city: string | null;
  contactEmail: string | null;
  createdAt: string;
  id: string;
  name: string;
  status: string;
  universityName: string | null;
};

export type OversightEventRecord = {
  city: string;
  clubName: string | null;
  endAt: string;
  id: string;
  name: string;
  startAt: string;
  status: string;
  visibility: string;
};

export type OversightAuditLogRecord = {
  action: string;
  actorEmail: string | null;
  createdAt: string;
  id: string;
  metadataSummary: string | null;
  resourceId: string | null;
  resourceType: string;
};

export type OversightFraudSignalRecord = {
  businessName: string | null;
  createdAt: string;
  description: string;
  eventName: string | null;
  id: string;
  metadataSummary: string | null;
  scannerEmail: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "REVIEWED" | "DISMISSED" | "CONFIRMED";
  type: string;
};

export type OversightSummary = {
  activeClubCount: number;
  latestAuditLimit: number;
  latestClubLimit: number;
  latestEventLimit: number;
  latestFraudLimit: number;
  openFraudSignalCount: number;
  operationalEventCount: number;
  recentAuditCount: number;
};

export type AdminOversightSnapshot = {
  auditLogs: OversightAuditLogRecord[];
  clubs: OversightClubRecord[];
  events: OversightEventRecord[];
  fraudSignals: OversightFraudSignalRecord[];
  summary: OversightSummary;
};

export type FraudReviewSnapshot = {
  fraudSignals: OversightFraudSignalRecord[];
  latestFraudLimit: number;
  openFraudSignalCount: number;
};
