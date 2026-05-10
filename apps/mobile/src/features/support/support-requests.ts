import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type {
  SupportRequestArea,
  SupportRequestDraft,
  SupportRequestSummary,
} from "@/features/support/types";

type SupportRequestRow = {
  id: string;
  area: SupportRequestArea;
  business_id: string | null;
  club_id: string | null;
  subject: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  business: {
    name: string;
  } | null;
  club: {
    name: string;
  } | null;
};

type UseSupportRequestsQueryParams = {
  userId: string;
  area: SupportRequestArea;
  isEnabled: boolean;
};

type SupportRequestRealtimeInvalidationParams = {
  area: SupportRequestArea;
  isEnabled: boolean;
  userId: string;
};

export const supportRequestsQueryKey = (userId: string, area: SupportRequestArea) =>
  ["support-requests", userId, area] as const;

const createSupportRealtimeInstanceId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const mapSupportRequests = (rows: SupportRequestRow[]): SupportRequestSummary[] =>
  rows.map((row) => ({
    id: row.id,
    area: row.area,
    businessId: row.business_id,
    businessName: row.business?.name ?? null,
    clubId: row.club_id,
    clubName: row.club?.name ?? null,
    subject: row.subject,
    message: row.message,
    status: row.status,
    adminReply: row.admin_reply,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));

const fetchSupportRequestsAsync = async (
  userId: string,
  area: SupportRequestArea
): Promise<SupportRequestSummary[]> => {
  const { data, error } = await supabase
    .from("support_requests")
    .select(
      `
      id,
      area,
      business_id,
      club_id,
      subject,
      message,
      status,
      admin_reply,
      created_at,
      updated_at,
      resolved_at,
      business:businesses(name),
      club:clubs(name)
    `
    )
    .eq("user_id", userId)
    .eq("area", area)
    .order("updated_at", { ascending: false })
    .limit(5)
    .returns<SupportRequestRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load support requests for ${area.toLowerCase()} ${userId}: ${error.message}`);
  }

  return mapSupportRequests(data);
};

const createSupportRequestAsync = async ({
  userId,
  area,
  businessId,
  clubId,
  subject,
  message,
}: SupportRequestDraft): Promise<SupportRequestSummary> => {
  const payload = {
    user_id: userId,
    area,
    business_id: businessId,
    club_id: clubId,
    subject: subject.trim(),
    message: message.trim(),
  };

  const { data, error } = await supabase
    .from("support_requests")
    .insert(payload)
    .select(
      `
      id,
      area,
      business_id,
      club_id,
      subject,
      message,
      status,
      admin_reply,
      created_at,
      updated_at,
      resolved_at,
      business:businesses(name),
      club:clubs(name)
    `
    )
    .single<SupportRequestRow>();

  if (error !== null) {
    throw new Error(
      `Failed to create support request for ${area.toLowerCase()} ${userId}: ${error.message}`
    );
  }

  const createdRequest = mapSupportRequests([data])[0];

  if (typeof createdRequest === "undefined") {
    throw new Error(`Support request insert for ${area.toLowerCase()} ${userId} returned no row.`);
  }

  return createdRequest;
};

export const useSupportRequestsQuery = ({
  userId,
  area,
  isEnabled,
}: UseSupportRequestsQueryParams): UseQueryResult<SupportRequestSummary[], Error> =>
  useQuery({
    queryKey: supportRequestsQueryKey(userId, area),
    queryFn: async () => fetchSupportRequestsAsync(userId, area),
    enabled: isEnabled,
  });

export const useSupportRequestRealtimeInvalidation = ({
  area,
  isEnabled,
  userId,
}: SupportRequestRealtimeInvalidationParams): void => {
  const queryClient = useQueryClient();
  const channelInstanceIdRef = useRef<string>(createSupportRealtimeInstanceId());

  useEffect(() => {
    if (!isEnabled || userId.length === 0) {
      return;
    }

    const channel = supabase
      .channel(`support-requests:${userId}:${area}:${channelInstanceIdRef.current}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `user_id=eq.${userId}`,
          schema: "public",
          table: "support_requests",
        },
        () => {
          void queryClient
            .invalidateQueries({
              queryKey: supportRequestsQueryKey(userId, area),
            })
            .catch((error: unknown) => {
              console.warn("support_request_realtime_invalidation_failed", {
                area,
                userId,
                message: error instanceof Error ? error.message : String(error),
              });
            });
        }
      )
      .subscribe((status, error) => {
        if (status !== "CHANNEL_ERROR" && status !== "TIMED_OUT") {
          return;
        }

        console.warn("support_request_realtime_channel_warning", {
          area,
          status,
          userId,
          message: error?.message ?? null,
        });
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [area, isEnabled, queryClient, userId]);
};

export const useCreateSupportRequestMutation = (): UseMutationResult<
  SupportRequestSummary,
  Error,
  SupportRequestDraft
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft) => createSupportRequestAsync(draft),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: supportRequestsQueryKey(variables.userId, variables.area),
      });
    },
  });
};
