import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { defaultProjectRef, readProjectRef } from "./_shared/supabase-auth-config";
import { createAdminClient, readServiceRoleKey, readSupabaseUrl } from "./_shared/hosted-project-admin";

type ActiveStudentRow = {
  email: string;
  id: string;
};

type ClubMemberRow = {
  club_id: string;
  created_at: string;
  role: "OWNER" | "ORGANIZER" | "STAFF";
  status: "ACTIVE" | "DISABLED";
  user_id: string;
};

type BusinessStaffRow = {
  business_id: string;
  created_at: string;
  role: "OWNER" | "MANAGER" | "SCANNER";
  status: "ACTIVE" | "DISABLED";
  user_id: string;
};

type ShowcaseEventSeed = {
  city: string;
  coverImageUrl: string;
  description: string;
  endAt: string;
  id: string;
  joinDeadlineAt: string;
  minimumStampsRequired: number;
  name: string;
  slug: string;
  startAt: string;
  venueOrder: number;
};

type ShowcaseRewardTierSeed = {
  claimInstructions: string | null;
  description: string | null;
  eventId: string;
  id: string;
  inventoryTotal: number | null;
  requiredStampCount: number;
  rewardType: "COUPON" | "ENTRY" | "HAALARIMERKKI" | "OTHER" | "PATCH" | "PRODUCT";
  title: string;
};

const createIsoString = (hoursFromNow: number): string => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + hoursFromNow);

  return now.toISOString();
};

const showcaseEvents: readonly ShowcaseEventSeed[] = [
  {
    city: "Helsinki",
    coverImageUrl:
      "https://images.pexels.com/photos/27676345/pexels-photo-27676345.jpeg?cs=srgb&dl=pexels-anachronisticbody-27676345.jpg&fm=jpg",
    description: "A live preview event for checking the QR flow, reward surfaces, and event imagery in OmaLeima.",
    endAt: createIsoString(5),
    id: "51000000-0000-0000-0000-000000000001",
    joinDeadlineAt: createIsoString(-2),
    minimumStampsRequired: 3,
    name: "Showcase Neon Appro",
    slug: "showcase-neon-appro",
    startAt: createIsoString(-1),
    venueOrder: 1,
  },
  {
    city: "Tampere",
    coverImageUrl:
      "https://images.pexels.com/photos/5054661/pexels-photo-5054661.jpeg?cs=srgb&dl=pexels-ketut-subiyanto-5054661.jpg&fm=jpg",
    description: "A softer social-night preview card for event discovery and reward progression checks.",
    endAt: createIsoString(32),
    id: "51000000-0000-0000-0000-000000000002",
    joinDeadlineAt: createIsoString(20),
    minimumStampsRequired: 4,
    name: "Showcase Jatkot Night",
    slug: "showcase-jatkot-night",
    startAt: createIsoString(24),
    venueOrder: 1,
  },
  {
    city: "Espoo",
    coverImageUrl:
      "https://images.pexels.com/photos/15339009/pexels-photo-15339009.jpeg?cs=srgb&dl=pexels-samuel-waddington-437558324-15339009.jpg&fm=jpg",
    description: "A DJ-heavy showcase event for checking list rhythm, hero art, and detail hierarchy.",
    endAt: createIsoString(56),
    id: "51000000-0000-0000-0000-000000000003",
    joinDeadlineAt: createIsoString(44),
    minimumStampsRequired: 5,
    name: "Showcase Teekkari Beats",
    slug: "showcase-teekkari-beats",
    startAt: createIsoString(48),
    venueOrder: 1,
  },
] as const;

const showcaseRewardTiers: readonly ShowcaseRewardTierSeed[] = [
  {
    claimInstructions: "Show this in the active venue after your first full stamp round.",
    description: "A visible low-threshold reward for the active showcase event.",
    eventId: "51000000-0000-0000-0000-000000000001",
    id: "61000000-0000-0000-0000-000000000001",
    inventoryTotal: 40,
    requiredStampCount: 1,
    rewardType: "ENTRY",
    title: "Fast lane drink stamp",
  },
  {
    claimInstructions: "Claim from staff after the third leima.",
    description: "A more complete showcase milestone for the live event.",
    eventId: "51000000-0000-0000-0000-000000000001",
    id: "61000000-0000-0000-0000-000000000002",
    inventoryTotal: 25,
    requiredStampCount: 3,
    rewardType: "PATCH",
    title: "OmaLeima patch",
  },
  {
    claimInstructions: "Unlocks once the event starts getting close.",
    description: "Lets the rewards screen show future claim states too.",
    eventId: "51000000-0000-0000-0000-000000000002",
    id: "61000000-0000-0000-0000-000000000003",
    inventoryTotal: 30,
    requiredStampCount: 2,
    rewardType: "COUPON",
    title: "Late-night coupon",
  },
  {
    claimInstructions: null,
    description: "An upcoming event tier used for layout preview only.",
    eventId: "51000000-0000-0000-0000-000000000003",
    id: "61000000-0000-0000-0000-000000000004",
    inventoryTotal: null,
    requiredStampCount: 4,
    rewardType: "HAALARIMERKKI",
    title: "Showcase overallimerkki",
  },
] as const;

const showcaseEventIds = showcaseEvents.map((event) => event.id);

const assertNoError = (label: string, error: { message: string } | null): void => {
  if (error !== null) {
    throw new Error(`${label}: ${error.message}`);
  }
};

const pickOrganizerMembershipAsync = async (
  admin: SupabaseClient
): Promise<{ clubId: string; userId: string }> => {
  const { data, error } = await admin
    .from("club_members")
    .select("club_id,user_id,role,status,created_at")
    .eq("status", "ACTIVE")
    .in("role", ["OWNER", "ORGANIZER"])
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<ClubMemberRow[]>();

  assertNoError("Could not load active organizer membership", error);

  const memberships = data ?? [];
  const membership = memberships[0];

  if (membership === undefined) {
    throw new Error("Could not find an active hosted organizer membership for showcase event seeding.");
  }

  return {
    clubId: membership.club_id,
    userId: membership.user_id,
  };
};

const pickScannerAssignmentAsync = async (
  admin: SupabaseClient
): Promise<{ businessId: string; userId: string }> => {
  const { data, error } = await admin
    .from("business_staff")
    .select("business_id,user_id,role,status,created_at")
    .eq("status", "ACTIVE")
    .in("role", ["OWNER", "MANAGER", "SCANNER"])
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<BusinessStaffRow[]>();

  assertNoError("Could not load active scanner assignment", error);

  const assignments = data ?? [];
  const assignment = assignments[0];

  if (assignment === undefined) {
    throw new Error("Could not find an active hosted business staff assignment for showcase event seeding.");
  }

  return {
    businessId: assignment.business_id,
    userId: assignment.user_id,
  };
};

const readActiveStudentsAsync = async (admin: SupabaseClient): Promise<readonly ActiveStudentRow[]> => {
  const { data, error } = await admin
    .from("profiles")
    .select("id,email")
    .eq("primary_role", "STUDENT")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true })
    .returns<ActiveStudentRow[]>();

  assertNoError("Could not load active student profiles", error);

  const activeStudents = data ?? [];

  if (activeStudents.length === 0) {
    throw new Error("Could not find any active student profiles to register into showcase events.");
  }

  return activeStudents;
};

const cleanupShowcaseAsync = async (admin: SupabaseClient): Promise<void> => {
  const { error: rewardClaimDeleteError } = await admin
    .from("reward_claims")
    .delete()
    .in("event_id", showcaseEventIds);
  assertNoError("Could not delete showcase reward claims", rewardClaimDeleteError);

  const { error: stampDeleteError } = await admin
    .from("stamps")
    .delete()
    .in("event_id", showcaseEventIds);
  assertNoError("Could not delete showcase stamps", stampDeleteError);

  const { error: qrUseDeleteError } = await admin
    .from("qr_token_uses")
    .delete()
    .in("event_id", showcaseEventIds);
  assertNoError("Could not delete showcase QR token uses", qrUseDeleteError);

  const { error: registrationDeleteError } = await admin
    .from("event_registrations")
    .delete()
    .in("event_id", showcaseEventIds);
  assertNoError("Could not delete showcase registrations", registrationDeleteError);

  const { error: venueDeleteError } = await admin
    .from("event_venues")
    .delete()
    .in("event_id", showcaseEventIds);
  assertNoError("Could not delete showcase event venues", venueDeleteError);

  const { error: rewardTierDeleteError } = await admin
    .from("reward_tiers")
    .delete()
    .in("event_id", showcaseEventIds);
  assertNoError("Could not delete showcase reward tiers", rewardTierDeleteError);

  const { error: eventDeleteError } = await admin
    .from("events")
    .delete()
    .in("id", showcaseEventIds);
  assertNoError("Could not delete showcase events", eventDeleteError);
};

const seedEventsAsync = async (
  admin: SupabaseClient,
  clubId: string,
  organizerUserId: string
): Promise<void> => {
  const { error } = await admin.from("events").insert(
    showcaseEvents.map((event) => ({
      city: event.city,
      club_id: clubId,
      country: "Finland",
      cover_image_url: event.coverImageUrl,
      created_by: organizerUserId,
      description: event.description,
      end_at: event.endAt,
      id: event.id,
      join_deadline_at: event.joinDeadlineAt,
      minimum_stamps_required: event.minimumStampsRequired,
      name: event.name,
      slug: event.slug,
      start_at: event.startAt,
      status: new Date(event.startAt).getTime() <= Date.now() ? "ACTIVE" : "PUBLISHED",
      visibility: "PUBLIC",
    }))
  );

  assertNoError("Could not insert showcase events", error);
};

const seedEventVenuesAsync = async (
  admin: SupabaseClient,
  businessId: string,
  scannerUserId: string
): Promise<void> => {
  const { error } = await admin.from("event_venues").insert(
    showcaseEvents.map((event) => ({
      business_id: businessId,
      custom_instructions: "Showcase preview venue for QR and stamp flow checks.",
      event_id: event.id,
      joined_at: new Date().toISOString(),
      joined_by: scannerUserId,
      stamp_label: "Showcase leima",
      status: "JOINED",
      venue_order: event.venueOrder,
    }))
  );

  assertNoError("Could not insert showcase event venues", error);
};

const seedEventRegistrationsAsync = async (
  admin: SupabaseClient,
  activeStudents: readonly ActiveStudentRow[]
): Promise<void> => {
  const registrations = activeStudents.flatMap((student) =>
    showcaseEvents.map((event) => ({
      event_id: event.id,
      id: randomUUID(),
      student_id: student.id,
      status: "REGISTERED" as const,
    }))
  );

  const { error } = await admin.from("event_registrations").insert(registrations);
  assertNoError("Could not insert showcase registrations", error);
};

const seedRewardTiersAsync = async (admin: SupabaseClient): Promise<void> => {
  const { error } = await admin.from("reward_tiers").insert(
    showcaseRewardTiers.map((tier) => ({
      claim_instructions: tier.claimInstructions,
      description: tier.description,
      event_id: tier.eventId,
      id: tier.id,
      inventory_total: tier.inventoryTotal,
      required_stamp_count: tier.requiredStampCount,
      reward_type: tier.rewardType,
      title: tier.title,
    }))
  );

  assertNoError("Could not insert showcase reward tiers", error);
};

const run = async (): Promise<void> => {
  const projectRef = readProjectRef("SHOWCASE_EVENTS_PROJECT_REF");
  const supabaseUrl = readSupabaseUrl(projectRef, "SHOWCASE_EVENTS_SUPABASE_URL");
  const serviceRoleKey = readServiceRoleKey(projectRef, "SHOWCASE_EVENTS_SERVICE_ROLE_KEY");
  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  const organizerMembership = await pickOrganizerMembershipAsync(admin);
  const scannerAssignment = await pickScannerAssignmentAsync(admin);
  const activeStudents = await readActiveStudentsAsync(admin);

  await cleanupShowcaseAsync(admin);
  await seedEventsAsync(admin, organizerMembership.clubId, organizerMembership.userId);
  await seedEventVenuesAsync(admin, scannerAssignment.businessId, scannerAssignment.userId);
  await seedEventRegistrationsAsync(admin, activeStudents);
  await seedRewardTiersAsync(admin);

  const output = [
    "showcase-events:READY",
    `project:${projectRef ?? defaultProjectRef}`,
    `events:${showcaseEvents.length}`,
    `active-event:${showcaseEvents[0].slug}`,
    `students-registered:${activeStudents.length}`,
    "next:open-student-events-student-rewards-and-student-active-event",
  ];

  console.log(output.join("|"));
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown showcase bootstrap error.";
  console.error(message);
  process.exitCode = 1;
});
