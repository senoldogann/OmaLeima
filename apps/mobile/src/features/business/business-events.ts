import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { businessHomeOverviewQueryKey } from "@/features/business/business-home";
import type { BusinessJoinEventResult, BusinessLeaveEventResult } from "@/features/business/types";

type JoinBusinessEventMutationParams = {
  eventId: string;
  businessId: string;
  staffUserId: string;
};

type LeaveBusinessEventMutationParams = {
  eventId: string;
  businessId: string;
  staffUserId: string;
};

export const joinBusinessEventAsync = async ({
  eventId,
  businessId,
  staffUserId,
}: JoinBusinessEventMutationParams): Promise<BusinessJoinEventResult> => {
  const { data, error } = await supabase.rpc("join_business_event_atomic", {
    p_event_id: eventId,
    p_business_id: businessId,
    p_staff_user_id: staffUserId,
  });

  if (error !== null) {
    throw new Error(`Failed to join event ${eventId} for business ${businessId}: ${error.message}`);
  }

  if (data === null) {
    throw new Error(`Business join RPC returned no data for event ${eventId} and business ${businessId}.`);
  }

  return data as BusinessJoinEventResult;
};

export const useJoinBusinessEventMutation = (
  userId: string
): UseMutationResult<BusinessJoinEventResult, Error, JoinBusinessEventMutationParams> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinBusinessEventAsync,
    onSuccess: async (result) => {
      if (result.status !== "SUCCESS" && result.status !== "ALREADY_JOINED") {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: businessHomeOverviewQueryKey(userId),
      });
    },
  });
};

export const leaveBusinessEventAsync = async ({
  eventId,
  businessId,
  staffUserId,
}: LeaveBusinessEventMutationParams): Promise<BusinessLeaveEventResult> => {
  const { data, error } = await supabase.rpc("leave_business_event_atomic", {
    p_event_id: eventId,
    p_business_id: businessId,
    p_staff_user_id: staffUserId,
  });

  if (error !== null) {
    throw new Error(`Failed to leave event ${eventId} for business ${businessId}: ${error.message}`);
  }

  if (data === null) {
    throw new Error(`Business leave RPC returned no data for event ${eventId} and business ${businessId}.`);
  }

  return data as BusinessLeaveEventResult;
};

export const useLeaveBusinessEventMutation = (
  userId: string
): UseMutationResult<BusinessLeaveEventResult, Error, LeaveBusinessEventMutationParams> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: leaveBusinessEventAsync,
    onSuccess: async (_result) => {
      await queryClient.invalidateQueries({
        queryKey: businessHomeOverviewQueryKey(userId),
      });
    },
  });
};
