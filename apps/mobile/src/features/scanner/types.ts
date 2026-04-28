export type BusinessScanStatus =
  | "SUCCESS"
  | "QR_ALREADY_USED_OR_REPLAYED"
  | "ALREADY_STAMPED"
  | "INVALID_QR"
  | "QR_EXPIRED"
  | "VENUE_NOT_IN_EVENT"
  | "EVENT_NOT_ACTIVE"
  | "STUDENT_NOT_REGISTERED"
  | "VENUE_JOINED_TOO_LATE"
  | "BUSINESS_STAFF_NOT_ALLOWED";

export type ScannerResultTone = "success" | "warning" | "danger" | "neutral";

export type ScannerAttemptResult = {
  status: BusinessScanStatus | "NETWORK_TIMEOUT";
  message: string;
  tone: ScannerResultTone;
  stampId?: string;
  stampCount?: number;
};

export type ScanQrResponse = {
  status: BusinessScanStatus;
  message: string;
  stampId?: string;
  stampCount?: number;
};
