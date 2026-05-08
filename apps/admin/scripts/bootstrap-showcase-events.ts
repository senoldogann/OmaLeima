import type { SupabaseClient } from "@supabase/supabase-js";

import { readProjectRef } from "./_shared/supabase-auth-config";
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

type DemoBusinessSeed = {
  address: string;
  city: string;
  contactEmail: string;
  coverImageUrl: string;
  id: string;
  instagramUrl: string;
  logoUrl: string;
  name: string;
  phone: string;
  slug: string;
  websiteUrl: string;
  yTunnus: string;
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
  status: "ACTIVE" | "COMPLETED" | "PUBLISHED";
  ticketUrl: string;
};

type ShowcaseRewardTierSeed = {
  claimInstructions: string;
  description: string;
  eventId: string;
  id: string;
  inventoryTotal: number;
  requiredStampCount: number;
  rewardType: "COUPON" | "ENTRY" | "HAALARIMERKKI" | "PATCH";
  title: string;
};

type ShowcaseAnnouncementSeed = {
  audience: "ALL" | "STUDENTS";
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  eventId: string | null;
  id: string;
  imageUrl: string;
  priority: number;
  title: string;
};

type CountRow = {
  name: string;
  value: number;
};

const productionProjectRef = "jwhdlcnfhrwdxptmoret";
const destructiveResetConfirmation = "RESET_SHOWCASE_DATA";
const productionResetConfirmation = "I_UNDERSTAND_THIS_DELETES_HOSTED_DATA";

const neverUuid = "00000000-0000-0000-0000-000000000000";
const neverText = "__omaleima_never__";

const imageBaseUrl = "https://omaleima.fi/images/public";
const logoImageUrl = "https://omaleima.fi/images/omaleima-logo-512.png";

const createIsoString = (hoursFromNow: number): string => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + hoursFromNow);

  return now.toISOString();
};

const createSeedUuid = (prefix: string, value: number): string =>
  `${prefix}000000-0000-0000-0000-${String(value).padStart(12, "0")}`;

const demoBusinesses: readonly DemoBusinessSeed[] = [
  {
    address: "Hameentie 13, 00530 Helsinki",
    city: "Helsinki",
    contactEmail: "kisko@example.com",
    coverImageUrl: `${imageBaseUrl}/scene-bar-qr-scan-hd.png`,
    id: "53000000-0000-0000-0000-000000000001",
    instagramUrl: "https://instagram.com/omaleima",
    logoUrl: logoImageUrl,
    name: "Bar Kisko",
    phone: "+358401234501",
    slug: "store-demo-bar-kisko",
    websiteUrl: "https://omaleima.fi",
    yTunnus: "1234567-1",
  },
  {
    address: "Otakaari 20, 02150 Espoo",
    city: "Espoo",
    contactEmail: "laituri@example.com",
    coverImageUrl: `${imageBaseUrl}/scene-promo-koko-ilta.png`,
    id: "53000000-0000-0000-0000-000000000002",
    instagramUrl: "https://instagram.com/omaleima",
    logoUrl: logoImageUrl,
    name: "Ravintola Laituri",
    phone: "+358401234502",
    slug: "store-demo-ravintola-laituri",
    websiteUrl: "https://omaleima.fi",
    yTunnus: "1234567-2",
  },
  {
    address: "Kaikukatu 6, 00530 Helsinki",
    city: "Helsinki",
    contactEmail: "kolo@example.com",
    coverImageUrl: `${imageBaseUrl}/scene-reward-haalarimerkki-hd.png`,
    id: "53000000-0000-0000-0000-000000000003",
    instagramUrl: "https://instagram.com/omaleima",
    logoUrl: logoImageUrl,
    name: "Karaoke Kolo",
    phone: "+358401234503",
    slug: "store-demo-karaoke-kolo",
    websiteUrl: "https://omaleima.fi",
    yTunnus: "1234567-3",
  },
  {
    address: "Aleksanterinkatu 52, 00100 Helsinki",
    city: "Helsinki",
    contactEmail: "soda@example.com",
    coverImageUrl: `${imageBaseUrl}/scene-promo-leimat-mukana.png`,
    id: "53000000-0000-0000-0000-000000000004",
    instagramUrl: "https://instagram.com/omaleima",
    logoUrl: logoImageUrl,
    name: "Sooda & Sillis",
    phone: "+358401234504",
    slug: "store-demo-sooda-sillis",
    websiteUrl: "https://omaleima.fi",
    yTunnus: "1234567-4",
  },
  {
    address: "Itsenaisyydenkatu 7, 33100 Tampere",
    city: "Tampere",
    contactEmail: "valo@example.com",
    coverImageUrl: `${imageBaseUrl}/scene-tapahtuma-hallussa-hd.png`,
    id: "53000000-0000-0000-0000-000000000005",
    instagramUrl: "https://instagram.com/omaleima",
    logoUrl: logoImageUrl,
    name: "Yokerho Valo",
    phone: "+358401234505",
    slug: "store-demo-yokerho-valo",
    websiteUrl: "https://omaleima.fi",
    yTunnus: "1234567-5",
  },
] as const;

const showcaseEvents: readonly ShowcaseEventSeed[] = [
  {
    city: "Helsinki",
    coverImageUrl: `${imageBaseUrl}/scene-haalarit-hero.png`,
    description:
      "Vedä haalarit päälle ja lähde kaveriporukalla kiertämään illan rasteja. OmaLeima näyttää livenä, montako leimaa on kasassa, missä palkinnot aukeaa ja ketkä kipuaa leaderboardin kärkeen. Ei paperikortteja, ei säätöä, pelkkä nopea QR ja ilta jatkuu.",
    endAt: createIsoString(6),
    id: "52000000-0000-0000-0000-000000000001",
    joinDeadlineAt: createIsoString(-6),
    minimumStampsRequired: 3,
    name: "Wappu Warmup Appro",
    slug: "wappu-warmup-appro",
    startAt: createIsoString(-1),
    status: "ACTIVE",
    ticketUrl: "https://kide.app/events/wappu-warmup-appro",
  },
  {
    city: "Espoo",
    coverImageUrl: `${imageBaseUrl}/omaleima-hero-haalarit-students.png`,
    description:
      "Otaniemen kiltakierros, jossa rastit vaihtuu nopeasti ja jatkot palkitsee aktiivisimmat. Tapahtuma sopii hyvin store-kuviin: tapahtumakortit, palkintopolku, yhteiso ja leaderboard nayttavat kaikki samassa paketissa.",
    endAt: createIsoString(56),
    id: "52000000-0000-0000-0000-000000000002",
    joinDeadlineAt: createIsoString(42),
    minimumStampsRequired: 2,
    name: "Kiltisilta Jatkoille",
    slug: "kiltisilta-jatkoille",
    startAt: createIsoString(48),
    status: "PUBLISHED",
    ticketUrl: "https://kide.app/events/kiltisilta-jatkoille",
  },
  {
    city: "Tampere",
    coverImageUrl: `${imageBaseUrl}/scene-palkinto-auki-hd.png`,
    description:
      "Valmis demoilta, jossa leimoja on jo keratty, palkintoja avattu ja leaderboardilla nakyy kunnon kisafiilis. Tata kaytetaan screenshotteihin, joissa halutaan nayttaa milta OmaLeima tuntuu tapahtuman jalkeen.",
    endAt: createIsoString(-84),
    id: "52000000-0000-0000-0000-000000000003",
    joinDeadlineAt: createIsoString(-96),
    minimumStampsRequired: 4,
    name: "Haalarimerkki Hunt",
    slug: "haalarimerkki-hunt",
    startAt: createIsoString(-90),
    status: "COMPLETED",
    ticketUrl: "https://kide.app/events/haalarimerkki-hunt",
  },
  {
    city: "Turku",
    coverImageUrl: `${imageBaseUrl}/scene-yksi-scan-hd.png`,
    description:
      "Sitsien jalkeinen kevyt rastikierros, jossa testataan scanneria, tiedotteita ja reward unlockia toisella aktiivisella tapahtumalla. Hyva testiin, kun halutaan varmistaa etta sama business voi olla mukana useassa tapahtumassa.",
    endAt: createIsoString(8),
    id: "52000000-0000-0000-0000-000000000004",
    joinDeadlineAt: createIsoString(-5),
    minimumStampsRequired: 2,
    name: "Sitsit Sillikselle",
    slug: "sitsit-sillikselle",
    startAt: createIsoString(-2),
    status: "ACTIVE",
    ticketUrl: "https://kide.app/events/sitsit-sillikselle",
  },
  {
    city: "Oulu",
    coverImageUrl: `${imageBaseUrl}/scene-organizer-hd.png`,
    description:
      "Fuksien rento ensikierros: kartta, QR, yhteison tiedotteet ja palkinnot nakyvat selkeasti ilman paperilappuja. Tama antaa store-kuviin pohjoisen opiskelijakaupungin fiilista.",
    endAt: createIsoString(104),
    id: "52000000-0000-0000-0000-000000000005",
    joinDeadlineAt: createIsoString(90),
    minimumStampsRequired: 3,
    name: "Fuksien Leimakierros",
    slug: "fuksien-leimakierros",
    startAt: createIsoString(96),
    status: "PUBLISHED",
    ticketUrl: "https://kide.app/events/fuksien-leimakierros",
  },
] as const;

const showcaseRewardTiers: readonly ShowcaseRewardTierSeed[] = [
  {
    claimInstructions: "Nayta avattu palkinto tiskilla. Henkilokunta kuittaa sen OmaLeimassa.",
    description: "Kun kolmas leima napsahtaa, illan Wappu Warmup -haalarimerkki aukeaa.",
    eventId: "52000000-0000-0000-0000-000000000001",
    id: "62000000-0000-0000-0000-000000000001",
    inventoryTotal: 250,
    requiredStampCount: 3,
    rewardType: "HAALARIMERKKI",
    title: "Wappu Warmup -haalarimerkki",
  },
  {
    claimInstructions: "Kysy jatkojen ovelta OmaLeima fast lane -merkintaa.",
    description: "Nelja leimaa tuo nopeamman sisaanpaasyn jatkoille.",
    eventId: "52000000-0000-0000-0000-000000000001",
    id: "62000000-0000-0000-0000-000000000002",
    inventoryTotal: 80,
    requiredStampCount: 4,
    rewardType: "ENTRY",
    title: "Jatkojen fast lane",
  },
  {
    claimInstructions: "Palkinto aukeaa tapahtumapaivana ensimmaisilla rasteilla.",
    description: "Kevyt starttipalkinto kiltakierroksen alkuun.",
    eventId: "52000000-0000-0000-0000-000000000002",
    id: "62000000-0000-0000-0000-000000000003",
    inventoryTotal: 120,
    requiredStampCount: 2,
    rewardType: "COUPON",
    title: "Kaveridiili tiskilta",
  },
  {
    claimInstructions: "Noudettu tapahtuman paatyttya jarjestajan pisteelta.",
    description: "Taman demotapahtuman paapalkinto on jo valmiiksi avattu store-kuvia varten.",
    eventId: "52000000-0000-0000-0000-000000000003",
    id: "62000000-0000-0000-0000-000000000004",
    inventoryTotal: 150,
    requiredStampCount: 4,
    rewardType: "PATCH",
    title: "Haalarimerkki Hunt -merkki",
  },
  {
    claimInstructions: "Avaa palkinto ja nayta se Sooda & Sillis -rastilla.",
    description: "Kahdella leimalla aukeaa pieni sillisetu seuraavaan pysakkiin.",
    eventId: "52000000-0000-0000-0000-000000000004",
    id: "62000000-0000-0000-0000-000000000005",
    inventoryTotal: 90,
    requiredStampCount: 2,
    rewardType: "COUPON",
    title: "Sillisetu kaverille",
  },
  {
    claimInstructions: "Tama palkinto aukeaa tapahtumapaivana, kun fuksikierros kaynnistyy.",
    description: "Fuksien ensimmainen OmaLeima-haalarimerkki.",
    eventId: "52000000-0000-0000-0000-000000000005",
    id: "62000000-0000-0000-0000-000000000006",
    inventoryTotal: 180,
    requiredStampCount: 3,
    rewardType: "HAALARIMERKKI",
    title: "Fuksikierros-merkki",
  },
] as const;

const showcaseAnnouncements: readonly ShowcaseAnnouncementSeed[] = [
  {
    audience: "STUDENTS",
    body:
      "Rastit aukeaa klo 18.00. Ota haalarit, henkkarit ja OmaLeima valmiiksi. QR vaihtuu automaattisesti, eli nayta aina appin omaa koodia.",
    ctaLabel: "Avaa tapahtuma",
    ctaUrl: "https://omaleima.fi",
    eventId: "52000000-0000-0000-0000-000000000001",
    id: "72000000-0000-0000-0000-000000000001",
    imageUrl: `${imageBaseUrl}/scene-event-in-hand.png`,
    priority: 10,
    title: "Wappu Warmup alkaa kohta",
  },
  {
    audience: "STUDENTS",
    body:
      "Palkintopiste loytyy jatkojen sisaanmenolta. Kun leimat on kasassa, avaa palkinto ja nayta se henkilokunnalle.",
    ctaLabel: "Katso palkinnot",
    ctaUrl: "https://omaleima.fi",
    eventId: "52000000-0000-0000-0000-000000000001",
    id: "72000000-0000-0000-0000-000000000002",
    imageUrl: `${imageBaseUrl}/scene-reward-haalarimerkki.png`,
    priority: 8,
    title: "Palkintopiste on auki",
  },
  {
    audience: "ALL",
    body:
      "Demo on nyt siistitty store-kuvia varten: tapahtumat, leimat, palkinnot, leaderboard ja yhteison tiedotteet ovat valmiina testiin.",
    ctaLabel: null,
    ctaUrl: null,
    eventId: null,
    id: "72000000-0000-0000-0000-000000000003",
    imageUrl: `${imageBaseUrl}/omaleima-organizer-operations.png`,
    priority: 5,
    title: "OmaLeima demo on valmis",
  },
  {
    audience: "STUDENTS",
    body:
      "Toinen live-testi on auki Turussa. Jos haluat kokeilla useampaa aktiivista tapahtumaa samalla business scannerilla, valitse Sitsit Sillikselle ja nayta uusi QR.",
    ctaLabel: "Kokeile toista eventtia",
    ctaUrl: "https://omaleima.fi",
    eventId: "52000000-0000-0000-0000-000000000004",
    id: "72000000-0000-0000-0000-000000000004",
    imageUrl: `${imageBaseUrl}/scene-yksi-scan-hd.png`,
    priority: 9,
    title: "Toinen live-event testiin",
  },
] as const;

const assertNoError = (label: string, error: { message: string } | null): void => {
  if (error !== null) {
    throw new Error(`${label}: ${error.message}`);
  }
};

const assertDestructiveResetAllowed = (projectRef: string): void => {
  const resetConfirmation = process.env.SHOWCASE_EVENTS_CONFIRM_DESTRUCTIVE_RESET;

  if (resetConfirmation !== destructiveResetConfirmation) {
    throw new Error(
      `Refusing to reset showcase data for project ${projectRef}. Set SHOWCASE_EVENTS_CONFIRM_DESTRUCTIVE_RESET=${destructiveResetConfirmation} to confirm this destructive seed.`
    );
  }

  if (projectRef !== productionProjectRef) {
    return;
  }

  const productionConfirmation = process.env.SHOWCASE_EVENTS_ALLOW_PRODUCTION_RESET;

  if (productionConfirmation !== productionResetConfirmation) {
    throw new Error(
      `Refusing to reset showcase data on hosted production project ${projectRef}. Set SHOWCASE_EVENTS_ALLOW_PRODUCTION_RESET=${productionResetConfirmation} only for an approved demo reset window.`
    );
  }
};

const deleteAllRowsAsync = async (
  admin: SupabaseClient,
  tableName: string,
  filterColumn: string,
  neverValue: string
): Promise<void> => {
  const { error } = await admin.from(tableName).delete().neq(filterColumn, neverValue);
  assertNoError(`Could not delete ${tableName}`, error);
};

const readTableCountAsync = async (admin: SupabaseClient, tableName: string): Promise<CountRow> => {
  const { count, error } = await admin.from(tableName).select("*", { count: "exact", head: true });
  assertNoError(`Could not count ${tableName}`, error);

  return {
    name: tableName,
    value: count ?? 0,
  };
};

const readDemoCountsAsync = async (admin: SupabaseClient): Promise<readonly CountRow[]> =>
  Promise.all(
    [
      "events",
      "event_registrations",
      "event_venues",
      "qr_token_uses",
      "stamps",
      "leaderboard_scores",
      "leaderboard_updates",
      "reward_tiers",
      "reward_claims",
      "announcements",
      "notifications",
    ].map((tableName) => readTableCountAsync(admin, tableName))
  );

const formatCounts = (counts: readonly CountRow[]): string =>
  counts.map((countRow) => `${countRow.name}:${countRow.value}`).join(",");

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

  const membership = (data ?? [])[0];

  if (membership === undefined) {
    throw new Error("Could not find an active hosted organizer membership for screenshot demo seeding.");
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

  const assignment = (data ?? [])[0];

  if (assignment === undefined) {
    throw new Error("Could not find an active hosted business staff assignment for screenshot demo seeding.");
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
    throw new Error("Could not find any active student profiles to register into screenshot demo events.");
  }

  return activeStudents;
};

const resetEventWorldAsync = async (admin: SupabaseClient): Promise<void> => {
  await deleteAllRowsAsync(admin, "announcement_impressions", "announcement_id", neverUuid);
  await deleteAllRowsAsync(admin, "announcement_acknowledgements", "announcement_id", neverUuid);
  await deleteAllRowsAsync(admin, "notifications", "id", neverUuid);
  await deleteAllRowsAsync(admin, "fraud_signals", "id", neverUuid);
  await deleteAllRowsAsync(admin, "reward_claims", "id", neverUuid);
  await deleteAllRowsAsync(admin, "stamps", "id", neverUuid);
  await deleteAllRowsAsync(admin, "qr_token_uses", "jti", neverText);
  await deleteAllRowsAsync(admin, "leaderboard_scores", "id", neverUuid);
  await deleteAllRowsAsync(admin, "leaderboard_updates", "id", neverUuid);
  await deleteAllRowsAsync(admin, "event_registrations", "id", neverUuid);
  await deleteAllRowsAsync(admin, "event_venues", "id", neverUuid);
  await deleteAllRowsAsync(admin, "reward_tiers", "id", neverUuid);
  await deleteAllRowsAsync(admin, "promotions", "id", neverUuid);
  await deleteAllRowsAsync(admin, "announcements", "id", neverUuid);
  await deleteAllRowsAsync(admin, "events", "id", neverUuid);
};

const seedDemoBusinessesAsync = async (admin: SupabaseClient, scannerBusinessId: string): Promise<void> => {
  const { error: deleteError } = await admin.from("businesses").delete().in(
    "id",
    demoBusinesses.map((business) => business.id)
  );
  assertNoError("Could not delete previous store demo businesses", deleteError);

  const { error: currentBusinessError } = await admin
    .from("businesses")
    .update({
      announcement: "OmaLeima demo valmis. Skannaa opiskelijan QR ja nayta miten yksi onnistunut leima tuntuu.",
      contact_email: "partner@example.com",
      contact_person_name: "Demo Partner",
      cover_image_url: `${imageBaseUrl}/omaleima-bar-qr-scan.png`,
      logo_url: logoImageUrl,
      name: "OmaLeima Partner Bar",
      opening_hours: "Pe-la 18.00-02.00",
      phone: "+358401234500",
      website_url: "https://omaleima.fi",
      y_tunnus: "1234567-0",
    })
    .eq("id", scannerBusinessId);
  assertNoError("Could not polish existing scanner business", currentBusinessError);

  const { error: insertError } = await admin.from("businesses").insert(
    demoBusinesses.map((business) => ({
      address: business.address,
      city: business.city,
      contact_email: business.contactEmail,
      cover_image_url: business.coverImageUrl,
      country: "Finland",
      id: business.id,
      instagram_url: business.instagramUrl,
      logo_url: business.logoUrl,
      name: business.name,
      phone: business.phone,
      slug: business.slug,
      status: "ACTIVE",
      website_url: business.websiteUrl,
      y_tunnus: business.yTunnus,
    }))
  );
  assertNoError("Could not insert store demo businesses", insertError);
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
      max_participants: 450,
      minimum_stamps_required: event.minimumStampsRequired,
      name: event.name,
      rules: {
        screenshotMode: true,
        stampPolicy: {
          perBusinessLimit: 1,
        },
      },
      slug: event.slug,
      start_at: event.startAt,
      status: event.status,
      ticket_url: event.ticketUrl,
      visibility: "PUBLIC",
    }))
  );

  assertNoError("Could not insert screenshot demo events", error);
};

const createVenueRows = (scannerBusinessId: string, scannerUserId: string) => {
  const venueBusinessIds = [scannerBusinessId, ...demoBusinesses.map((business) => business.id)];

  return showcaseEvents.flatMap((event, eventIndex) =>
    venueBusinessIds.map((businessId, businessIndex) => ({
      business_id: businessId,
      custom_instructions:
        businessIndex === 0
          ? "Tama on nykyinen testiskannerin paikka. Kayta tata QR-testissa."
          : "Demo-rasti store-kuvien leaderboardia ja tapahtumakarttaa varten.",
      event_id: event.id,
      id: createSeedUuid("54", eventIndex * 10 + businessIndex + 1),
      joined_at: createIsoString(event.status === "PUBLISHED" ? 1 : -96),
      joined_by: scannerUserId,
      stamp_label: businessIndex === 0 ? "Partner Bar -leima" : "Rastileima",
      status: "JOINED" as const,
      venue_order: businessIndex + 1,
    }))
  );
};

const seedEventVenuesAsync = async (
  admin: SupabaseClient,
  scannerBusinessId: string,
  scannerUserId: string
): Promise<void> => {
  const { error } = await admin.from("event_venues").insert(createVenueRows(scannerBusinessId, scannerUserId));
  assertNoError("Could not insert screenshot demo event venues", error);
};

const seedEventRegistrationsAsync = async (
  admin: SupabaseClient,
  activeStudents: readonly ActiveStudentRow[]
): Promise<void> => {
  const registrations = activeStudents.flatMap((student, studentIndex) =>
    showcaseEvents.map((event, eventIndex) => ({
      completed_at: event.status === "COMPLETED" ? event.endAt : null,
      event_id: event.id,
      id: createSeedUuid("55", studentIndex * 10 + eventIndex + 1),
      registered_at: event.status === "PUBLISHED" ? createIsoString(-6) : createIsoString(-120),
      student_id: student.id,
      status: "REGISTERED" as const,
    }))
  );

  const { error } = await admin.from("event_registrations").insert(registrations);
  assertNoError("Could not insert screenshot demo registrations", error);
};

const seedRewardTiersAsync = async (admin: SupabaseClient): Promise<void> => {
  const { error } = await admin.from("reward_tiers").insert(
    showcaseRewardTiers.map((tier) => ({
      claim_instructions: tier.claimInstructions,
      description: tier.description,
      event_id: tier.eventId,
      id: tier.id,
      inventory_claimed: tier.eventId === showcaseEvents[2].id ? 6 : 0,
      inventory_total: tier.inventoryTotal,
      required_stamp_count: tier.requiredStampCount,
      reward_type: tier.rewardType,
      status: "ACTIVE",
      title: tier.title,
    }))
  );

  assertNoError("Could not insert screenshot demo reward tiers", error);
};

const createStampRows = (
  activeStudents: readonly ActiveStudentRow[],
  scannerBusinessId: string,
  scannerUserId: string
) => {
  const activeEvents = showcaseEvents.filter((event) => event.status === "ACTIVE");
  const completedEvents = showcaseEvents.filter((event) => event.status === "COMPLETED");
  const activeVenueBusinesses = demoBusinesses.slice(0, 3).map((business) => business.id);
  const completedVenueBusinesses = [scannerBusinessId, ...demoBusinesses.map((business) => business.id)];
  const eventVenueRows = createVenueRows(scannerBusinessId, scannerUserId);

  return activeStudents.flatMap((student, studentIndex) => {
    const activeStampRows = activeEvents.flatMap((event, eventIndex) =>
      activeVenueBusinesses.map((businessId, businessIndex) => ({
        businessId,
        eventId: event.id,
        eventVenueId:
          eventVenueRows.find((venue) => venue.event_id === event.id && venue.business_id === businessId)?.id ?? null,
        scannedAt: createIsoString(-2 + eventIndex + businessIndex),
        seedIndex: studentIndex * 1_000 + eventIndex * 100 + businessIndex + 1,
        studentId: student.id,
      }))
    );

    const completedStampRows = completedEvents.flatMap((event, eventIndex) =>
      completedVenueBusinesses.map((businessId, businessIndex) => ({
        businessId,
        eventId: event.id,
        eventVenueId:
          eventVenueRows.find((venue) => venue.event_id === event.id && venue.business_id === businessId)?.id ?? null,
        scannedAt: createIsoString(-88 + eventIndex + businessIndex),
        seedIndex: studentIndex * 1_000 + eventIndex * 100 + businessIndex + 501,
        studentId: student.id,
      }))
    );

    return [...activeStampRows, ...completedStampRows];
  });
};

const seedStampsAsync = async (
  admin: SupabaseClient,
  activeStudents: readonly ActiveStudentRow[],
  scannerBusinessId: string,
  scannerUserId: string
): Promise<void> => {
  const stampRows = createStampRows(activeStudents, scannerBusinessId, scannerUserId);

  const { error: qrUseError } = await admin.from("qr_token_uses").insert(
    stampRows.map((row) => ({
      business_id: row.businessId,
      event_id: row.eventId,
      jti: `store-demo-${row.eventId}-${row.studentId}-${row.businessId}`,
      scanner_user_id: scannerUserId,
      student_id: row.studentId,
      used_at: row.scannedAt,
      user_agent: "omaleima-store-demo-seed",
    }))
  );
  assertNoError("Could not insert screenshot demo QR token uses", qrUseError);

  const { error: stampError } = await admin.from("stamps").insert(
    stampRows.map((row) => ({
      business_id: row.businessId,
      event_id: row.eventId,
      event_venue_id: row.eventVenueId,
      id: createSeedUuid("56", row.seedIndex),
      qr_jti: `store-demo-${row.eventId}-${row.studentId}-${row.businessId}`,
      scanned_at: row.scannedAt,
      scanner_user_id: scannerUserId,
      student_id: row.studentId,
      validation_status: "VALID",
    }))
  );
  assertNoError("Could not insert screenshot demo stamps", stampError);
};

const seedRewardClaimsAsync = async (
  admin: SupabaseClient,
  activeStudents: readonly ActiveStudentRow[],
  scannerUserId: string
): Promise<void> => {
  const completedRewardTier = showcaseRewardTiers.find((tier) => tier.eventId === showcaseEvents[2].id);

  if (completedRewardTier === undefined) {
    throw new Error("Completed screenshot demo reward tier is missing.");
  }

  const { error } = await admin.from("reward_claims").insert(
    activeStudents.map((student, studentIndex) => ({
      claimed_at: createIsoString(-82 + studentIndex),
      claimed_by: scannerUserId,
      event_id: showcaseEvents[2].id,
      id: createSeedUuid("57", studentIndex + 1),
      notes: "Store demo claim",
      reward_tier_id: completedRewardTier.id,
      status: "CLAIMED",
      student_id: student.id,
    }))
  );
  assertNoError("Could not insert screenshot demo reward claims", error);
};

const seedAnnouncementsAsync = async (
  admin: SupabaseClient,
  clubId: string,
  organizerUserId: string
): Promise<void> => {
  const { error } = await admin.from("announcements").insert(
    showcaseAnnouncements.map((announcement) => ({
      audience: announcement.audience,
      body: announcement.body,
      club_id: announcement.eventId === null ? null : clubId,
      created_by: organizerUserId,
      cta_label: announcement.ctaLabel,
      cta_url: announcement.ctaUrl,
      event_id: announcement.eventId,
      id: announcement.id,
      image_url: announcement.imageUrl,
      priority: announcement.priority,
      show_as_popup: true,
      starts_at: createIsoString(-1),
      status: "PUBLISHED",
      title: announcement.title,
    }))
  );
  assertNoError("Could not insert screenshot demo announcements", error);
};

const refreshLeaderboardsAsync = async (admin: SupabaseClient): Promise<void> => {
  for (const eventId of showcaseEvents.filter((event) => event.status !== "PUBLISHED").map((event) => event.id)) {
    const { error } = await admin.rpc("update_event_leaderboard", {
      p_event_id: eventId,
    });
    assertNoError(`Could not refresh leaderboard for ${eventId}`, error);
  }
};

const run = async (): Promise<void> => {
  const projectRef = readProjectRef("SHOWCASE_EVENTS_PROJECT_REF");
  assertDestructiveResetAllowed(projectRef);
  const supabaseUrl = readSupabaseUrl(projectRef, "SHOWCASE_EVENTS_SUPABASE_URL");
  const serviceRoleKey = readServiceRoleKey(projectRef, "SHOWCASE_EVENTS_SERVICE_ROLE_KEY");
  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  const organizerMembership = await pickOrganizerMembershipAsync(admin);
  const scannerAssignment = await pickScannerAssignmentAsync(admin);
  const activeStudents = await readActiveStudentsAsync(admin);
  const beforeCounts = await readDemoCountsAsync(admin);

  await resetEventWorldAsync(admin);
  await seedDemoBusinessesAsync(admin, scannerAssignment.businessId);
  await seedEventsAsync(admin, organizerMembership.clubId, organizerMembership.userId);
  await seedEventVenuesAsync(admin, scannerAssignment.businessId, scannerAssignment.userId);
  await seedEventRegistrationsAsync(admin, activeStudents);
  await seedRewardTiersAsync(admin);
  await seedStampsAsync(admin, activeStudents, scannerAssignment.businessId, scannerAssignment.userId);
  await seedRewardClaimsAsync(admin, activeStudents, scannerAssignment.userId);
  await seedAnnouncementsAsync(admin, organizerMembership.clubId, organizerMembership.userId);
  await refreshLeaderboardsAsync(admin);

  const afterCounts = await readDemoCountsAsync(admin);

  const output = [
    "showcase-events:READY",
    `project:${projectRef}`,
    `before:${formatCounts(beforeCounts)}`,
    `after:${formatCounts(afterCounts)}`,
    `active-event:${showcaseEvents[0].slug}`,
    `scanner-business:${scannerAssignment.businessId}`,
    `students-registered:${activeStudents.length}`,
    "qr-test-note:active event already has demo venue stamps, current scanner business is intentionally left unscanned",
  ];

  console.log(output.join("|"));
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown showcase bootstrap error.";
  console.error(message);
  process.exitCode = 1;
});
