import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BusinessApplicationRecord,
  BusinessApplicationsReviewQueue,
  BusinessApplicationStatus,
} from "@/features/business-applications/types";
import { normalizeExternalReviewUrl } from "@/features/business-applications/validation";

const pendingPageSize = 20;

type BusinessApplicationRow = {
  id: string;
  address: string | null;
  business_name: string;
  city: string;
  contact_email: string;
  contact_name: string;
  country: string;
  created_at: string;
  instagram_url: string | null;
  message: string | null;
  phone: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  status: BusinessApplicationStatus;
  website_url: string | null;
};

const mapBusinessApplicationRecord = (row: BusinessApplicationRow): BusinessApplicationRecord => ({
  id: row.id,
  address: row.address,
  businessName: row.business_name,
  city: row.city,
  contactEmail: row.contact_email,
  contactName: row.contact_name,
  country: row.country,
  createdAt: row.created_at,
  instagramUrl: normalizeExternalReviewUrl(row.instagram_url),
  message: row.message,
  phone: row.phone,
  rejectionReason: row.rejection_reason,
  reviewedAt: row.reviewed_at,
  status: row.status,
  websiteUrl: normalizeExternalReviewUrl(row.website_url),
});

const businessApplicationSelect =
  "id,business_name,contact_name,contact_email,phone,address,city,country,website_url,instagram_url,message,status,rejection_reason,created_at,reviewed_at";

const fetchPagedPendingApplicationsAsync = async (
  supabase: SupabaseClient,
  pageNumber: number
): Promise<BusinessApplicationRecord[]> => {
  const rangeStart = (pageNumber - 1) * pendingPageSize;
  const rangeEnd = rangeStart + pendingPageSize - 1;
  const { data, error } = await supabase
    .from("business_applications")
    .select(businessApplicationSelect)
    .eq("status", "PENDING")
    .order("created_at", {
      ascending: true,
    })
    .range(rangeStart, rangeEnd)
    .returns<BusinessApplicationRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load pending business applications: ${error.message}`);
  }

  return data.map(mapBusinessApplicationRecord);
};

const fetchRecentlyReviewedApplicationsAsync = async (supabase: SupabaseClient): Promise<BusinessApplicationRecord[]> => {
  const { data, error } = await supabase
    .from("business_applications")
    .select(businessApplicationSelect)
    .in("status", ["APPROVED", "REJECTED"])
    .order("reviewed_at", {
      ascending: false,
    })
    .limit(8)
    .returns<BusinessApplicationRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load reviewed business applications: ${error.message}`);
  }

  return data.map(mapBusinessApplicationRecord);
};

const fetchPendingApplicationCountAsync = async (supabase: SupabaseClient): Promise<number> => {
  const { count, error } = await supabase
    .from("business_applications")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "PENDING");

  if (error !== null) {
    throw new Error(`Failed to count pending business applications: ${error.message}`);
  }

  return count ?? 0;
};

const fetchOldestPendingApplicationCreatedAtAsync = async (supabase: SupabaseClient): Promise<string | null> => {
  const { data, error } = await supabase
    .from("business_applications")
    .select("created_at")
    .eq("status", "PENDING")
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle<{ created_at: string }>();

  if (error !== null) {
    throw new Error(`Failed to load oldest pending business application timestamp: ${error.message}`);
  }

  return data?.created_at ?? null;
};

export const fetchBusinessApplicationsReviewQueueAsync = async (
  supabase: SupabaseClient,
  requestedPageNumber: number
): Promise<BusinessApplicationsReviewQueue> => {
  const [oldestPendingCreatedAt, pendingCount, recentlyReviewedApplications] = await Promise.all([
    fetchOldestPendingApplicationCreatedAtAsync(supabase),
    fetchPendingApplicationCountAsync(supabase),
    fetchRecentlyReviewedApplicationsAsync(supabase),
  ]);
  const pendingPageCount = pendingCount === 0 ? 1 : Math.ceil(pendingCount / pendingPageSize);
  const currentPage = Math.min(Math.max(requestedPageNumber, 1), pendingPageCount);
  const pendingApplications = await fetchPagedPendingApplicationsAsync(supabase, currentPage);
  const pendingVisibleStart = pendingApplications.length === 0 ? 0 : (currentPage - 1) * pendingPageSize + 1;
  const pendingVisibleEnd =
    pendingApplications.length === 0 ? 0 : pendingVisibleStart + pendingApplications.length - 1;

  return {
    pendingApplications,
    recentlyReviewedApplications,
    summary: {
      currentPage,
      hasNextPage: currentPage < pendingPageCount,
      hasPreviousPage: currentPage > 1,
      oldestPendingCreatedAt,
      pendingPageCount,
      pendingPageSize,
      pendingCount,
      pendingVisibleEnd,
      pendingVisibleStart,
      recentlyReviewedCount: recentlyReviewedApplications.length,
    },
  };
};
