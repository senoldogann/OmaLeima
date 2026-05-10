import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { studentEventsQueryKey } from "@/features/events/student-events";
import { studentRewardOverviewQueryKey } from "@/features/rewards/student-rewards";
import type {
  EventRegistrationState,
  EventRegistrationStatus,
  EventRules,
  EventVenueSummary,
  CancelEventRegistrationResult,
  JoinEventResult,
  RewardTierSummary,
  StudentEventDetail,
} from "@/features/events/types";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  country: string;
  cover_image_url: string | null;
  start_at: string;
  end_at: string;
  join_deadline_at: string;
  status: "PUBLISHED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  ticket_url: string | null;
  max_participants: number | null;
  minimum_stamps_required: number;
  rules: EventRules;
};

type EventRegistrationRow = {
  status: EventRegistrationStatus;
};

type RewardTierRow = {
  id: string;
  title: string;
  description: string | null;
  required_stamp_count: number;
  reward_type: RewardTierSummary["rewardType"];
  inventory_total: number | null;
  inventory_claimed: number;
  claim_instructions: string | null;
};

type EventVenueRow = {
  id: string;
  business_id: string;
  venue_order: number | null;
  stamp_label: string | null;
  custom_instructions: string | null;
};

type BusinessRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
};

type StampRow = {
  business_id: string;
  scanned_at: string;
  validation_status: "VALID" | "MANUAL_REVIEW" | "REVOKED";
};

type VenueStampState = {
  collectedStampCount: number;
  stampedAt: string | null;
};

type UseStudentEventDetailQueryParams = {
  eventId: string;
  studentId: string;
  isEnabled: boolean;
};

type JoinEventMutationParams = {
  eventId: string;
  studentId: string;
};

type CancelEventRegistrationMutationParams = {
  eventId: string;
  studentId: string;
};

export const studentEventDetailQueryKey = (eventId: string, studentId: string) =>
  ["student-event-detail", eventId, studentId] as const;

const deriveRegistrationState = (registration: EventRegistrationRow | null): EventRegistrationState => {
  if (registration === null) {
    return "NOT_REGISTERED";
  }

  return registration.status;
};

const fetchEventAsync = async (eventId: string): Promise<EventRow> => {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,description,city,country,cover_image_url,start_at,end_at,join_deadline_at,status,visibility,max_participants,minimum_stamps_required,rules,ticket_url"
    )
    .eq("id", eventId)
    .single<EventRow>();

  if (error !== null) {
    throw new Error(`Failed to load event detail for ${eventId}: ${error.message}`);
  }

  return data;
};

const fetchStudentRegistrationAsync = async (
  eventId: string,
  studentId: string
): Promise<EventRegistrationRow | null> => {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("status")
    .eq("event_id", eventId)
    .eq("student_id", studentId)
    .maybeSingle<EventRegistrationRow>();

  if (error !== null) {
    throw new Error(`Failed to load student registration for ${eventId}: ${error.message}`);
  }

  return data;
};

const fetchRewardTiersAsync = async (eventId: string): Promise<RewardTierRow[]> => {
  const { data, error } = await supabase
    .from("reward_tiers")
    .select("id,title,description,required_stamp_count,reward_type,inventory_total,inventory_claimed,claim_instructions")
    .eq("event_id", eventId)
    .eq("status", "ACTIVE")
    .order("required_stamp_count", { ascending: true })
    .returns<RewardTierRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load reward tiers for ${eventId}: ${error.message}`);
  }

  return data;
};

const fetchEventVenueLinksAsync = async (eventId: string): Promise<EventVenueRow[]> => {
  const { data, error } = await supabase
    .from("event_venues")
    .select("id,business_id,venue_order,stamp_label,custom_instructions")
    .eq("event_id", eventId)
    .eq("status", "JOINED")
    .order("venue_order", { ascending: true })
    .returns<EventVenueRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load event venues for ${eventId}: ${error.message}`);
  }

  return data;
};

const fetchBusinessesAsync = async (businessIds: string[]): Promise<BusinessRow[]> => {
  if (businessIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,address,city,country,latitude,longitude,logo_url,cover_image_url")
    .in("id", businessIds)
    .returns<BusinessRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load businesses for event venues: ${error.message}`);
  }

  return data;
};

const fetchStudentVenueStampsAsync = async (eventId: string, studentId: string): Promise<StampRow[]> => {
  const { data, error } = await supabase
    .from("stamps")
    .select("business_id,scanned_at,validation_status")
    .eq("event_id", eventId)
    .eq("student_id", studentId)
    .in("validation_status", ["VALID", "MANUAL_REVIEW"])
    .returns<StampRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load venue stamp state for event ${eventId} and student ${studentId}: ${error.message}`);
  }

  return data;
};

const mapRewardTiers = (rows: RewardTierRow[]): RewardTierSummary[] =>
  rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    requiredStampCount: row.required_stamp_count,
    rewardType: row.reward_type,
    inventoryTotal: row.inventory_total,
    inventoryClaimed: row.inventory_claimed,
    claimInstructions: row.claim_instructions,
  }));

const createVenueStampStateByBusinessId = (stamps: StampRow[]): Map<string, VenueStampState> => {
  const stampStateByBusinessId = new Map<string, VenueStampState>();

  stamps.forEach((stamp) => {
    const currentState = stampStateByBusinessId.get(stamp.business_id) ?? {
      collectedStampCount: 0,
      stampedAt: null,
    };
    const currentStampedAtTime =
      currentState.stampedAt === null ? Number.NEGATIVE_INFINITY : new Date(currentState.stampedAt).getTime();
    const nextStampedAtTime = new Date(stamp.scanned_at).getTime();

    stampStateByBusinessId.set(stamp.business_id, {
      collectedStampCount: currentState.collectedStampCount + 1,
      stampedAt: nextStampedAtTime > currentStampedAtTime ? stamp.scanned_at : currentState.stampedAt,
    });
  });

  return stampStateByBusinessId;
};

const mapVenues = (
  rows: EventVenueRow[],
  businesses: BusinessRow[],
  stamps: StampRow[]
): EventVenueSummary[] => {
  const businessById = new Map(businesses.map((business) => [business.id, business]));
  const stampStateByBusinessId = createVenueStampStateByBusinessId(stamps);

  return rows.flatMap((row) => {
    const business = businessById.get(row.business_id);
    const stampState = stampStateByBusinessId.get(row.business_id) ?? null;

    if (typeof business === "undefined") {
      return [];
    }

    return [
      {
        id: row.id,
        businessId: row.business_id,
        name: business.name,
        address: business.address,
        city: business.city,
        country: business.country,
        latitude: business.latitude,
        longitude: business.longitude,
        logoUrl: business.logo_url,
        coverImageUrl: business.cover_image_url,
        venueOrder: row.venue_order,
        stampLabel: row.stamp_label,
        customInstructions: row.custom_instructions,
        stampStatus: stampState === null ? "PENDING" : "COLLECTED",
        collectedStampCount: stampState?.collectedStampCount ?? 0,
        stampedAt: stampState?.stampedAt ?? null,
      },
    ];
  });
};

export const fetchStudentEventDetailAsync = async (
  eventId: string,
  studentId: string
): Promise<StudentEventDetail> => {
  const [event, registration, rewardTiers, eventVenueLinks] = await Promise.all([
    fetchEventAsync(eventId),
    fetchStudentRegistrationAsync(eventId, studentId),
    fetchRewardTiersAsync(eventId),
    fetchEventVenueLinksAsync(eventId),
  ]);

  const businessIds = Array.from(new Set(eventVenueLinks.map((row) => row.business_id)));
  const [businesses, stamps] = await Promise.all([
    fetchBusinessesAsync(businessIds),
    fetchStudentVenueStampsAsync(eventId, studentId),
  ]);

  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description,
    city: event.city,
    country: event.country,
    startAt: event.start_at,
    endAt: event.end_at,
    joinDeadlineAt: event.join_deadline_at,
    ticketUrl: event.ticket_url,
    status: event.status,
    visibility: event.visibility,
    coverImageUrl: event.cover_image_url,
    maxParticipants: event.max_participants,
    minimumStampsRequired: event.minimum_stamps_required,
    rules: event.rules,
    registrationState: deriveRegistrationState(registration),
    venues: mapVenues(eventVenueLinks, businesses, stamps),
    rewardTiers: mapRewardTiers(rewardTiers),
  };
};

export const useStudentEventDetailQuery = ({
  eventId,
  studentId,
  isEnabled,
}: UseStudentEventDetailQueryParams): UseQueryResult<StudentEventDetail, Error> =>
  useQuery({
    queryKey: studentEventDetailQueryKey(eventId, studentId),
    queryFn: async () => fetchStudentEventDetailAsync(eventId, studentId),
    enabled: isEnabled,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
  });

export const joinEventAsync = async ({ eventId, studentId }: JoinEventMutationParams): Promise<JoinEventResult> => {
  const { data, error } = await supabase.rpc("register_event_atomic", {
    p_event_id: eventId,
    p_student_id: studentId,
  });

  if (error !== null) {
    throw new Error(`Failed to join event ${eventId} for ${studentId}: ${error.message}`);
  }

  if (data === null) {
    throw new Error(`Join event RPC returned no data for ${eventId}.`);
  }

  return data as JoinEventResult;
};

const invalidateStudentEventQueriesAsync = async (
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string,
  studentId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: studentEventsQueryKey(studentId),
    }),
    queryClient.invalidateQueries({
      queryKey: studentRewardOverviewQueryKey(studentId),
    }),
    queryClient.invalidateQueries({
      queryKey: studentEventDetailQueryKey(eventId, studentId),
    }),
  ]);
};

export const cancelEventRegistrationAsync = async ({
  eventId,
  studentId,
}: CancelEventRegistrationMutationParams): Promise<CancelEventRegistrationResult> => {
  const { data, error } = await supabase.rpc("cancel_event_registration_atomic", {
    p_event_id: eventId,
    p_student_id: studentId,
  });

  if (error !== null) {
    throw new Error(`Failed to cancel event registration ${eventId} for ${studentId}: ${error.message}`);
  }

  if (data === null) {
    throw new Error(`Cancel event registration RPC returned no data for ${eventId}.`);
  }

  return data as CancelEventRegistrationResult;
};

export const useJoinEventMutation = (): UseMutationResult<JoinEventResult, Error, JoinEventMutationParams> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinEventAsync,
    onSuccess: async (result, variables) => {
      if (result.status !== "SUCCESS" && result.status !== "ALREADY_REGISTERED") {
        return;
      }

      await invalidateStudentEventQueriesAsync(queryClient, variables.eventId, variables.studentId);
    },
  });
};

export const useCancelEventRegistrationMutation = (): UseMutationResult<
  CancelEventRegistrationResult,
  Error,
  CancelEventRegistrationMutationParams
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelEventRegistrationAsync,
    onSuccess: async (result, variables) => {
      if (result.status !== "SUCCESS" && result.status !== "ALREADY_CANCELLED") {
        return;
      }

      await invalidateStudentEventQueriesAsync(queryClient, variables.eventId, variables.studentId);
    },
  });
};
