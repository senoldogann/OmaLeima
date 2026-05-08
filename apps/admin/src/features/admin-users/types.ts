export type AdminUserRole =
  | "STUDENT"
  | "BUSINESS_OWNER"
  | "BUSINESS_STAFF"
  | "CLUB_ORGANIZER"
  | "CLUB_STAFF"
  | "PLATFORM_ADMIN";

export type AdminUserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export type AdminUserBusinessMembership = {
  businessCity: string | null;
  businessId: string;
  businessName: string;
  businessStatus: string;
  role: string;
  status: string;
};

export type AdminUserClubMembership = {
  clubCity: string | null;
  clubId: string;
  clubName: string;
  clubStatus: string;
  role: string;
  status: string;
};

export type AdminUserRecord = {
  businessMemberships: AdminUserBusinessMembership[];
  clubMemberships: AdminUserClubMembership[];
  createdAt: string;
  displayName: string | null;
  email: string;
  id: string;
  primaryRole: AdminUserRole;
  status: AdminUserStatus;
  updatedAt: string;
};

export type AdminUsersSnapshot = {
  activeCount: number;
  suspendedCount: number;
  deletedCount: number;
  users: AdminUserRecord[];
};
