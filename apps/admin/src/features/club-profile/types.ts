export type ClubProfileEditableRole = "OWNER" | "ORGANIZER" | "STAFF";

export type ClubProfileRecord = {
  address: string | null;
  announcement: string | null;
  canEditProfile: boolean;
  city: string | null;
  clubId: string;
  clubName: string;
  contactEmail: string | null;
  instagramUrl: string | null;
  membershipRole: ClubProfileEditableRole;
  phone: string | null;
  universityName: string | null;
  websiteUrl: string | null;
};

export type ClubProfileSnapshot = {
  clubs: ClubProfileRecord[];
};

export type ClubProfileUpdatePayload = {
  address: string;
  announcement: string;
  clubId: string;
  contactEmail: string;
  instagramUrl: string;
  phone: string;
  websiteUrl: string;
};

export type ClubProfileUpdateResponse = {
  club: ClubProfileRecord;
  message: string;
  status: "SUCCESS";
};
