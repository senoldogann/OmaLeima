import type { SupabaseClient } from "@supabase/supabase-js";

import type { LoginSlideRecord } from "@/features/login-slides/types";

type LoginSlideRow = {
  body: string;
  body_en: string | null;
  body_fi: string | null;
  created_at: string;
  eyebrow: string;
  eyebrow_en: string | null;
  eyebrow_fi: string | null;
  id: string;
  image_alt: string;
  image_alt_en: string | null;
  image_alt_fi: string | null;
  image_url: string;
  is_active: boolean;
  sort_order: number;
  title: string;
  title_en: string | null;
  title_fi: string | null;
  updated_at: string;
};

const mapLoginSlideRow = (row: LoginSlideRow): LoginSlideRecord => ({
  createdAt: row.created_at,
  id: row.id,
  imageUrl: row.image_url,
  isActive: row.is_active,
  localized: {
    en: {
      body: row.body_en ?? row.body,
      eyebrow: row.eyebrow_en ?? row.eyebrow,
      imageAlt: row.image_alt_en ?? row.image_alt,
      title: row.title_en ?? row.title,
    },
    fi: {
      body: row.body_fi ?? row.body,
      eyebrow: row.eyebrow_fi ?? row.eyebrow,
      imageAlt: row.image_alt_fi ?? row.image_alt,
      title: row.title_fi ?? row.title,
    },
  },
  sortOrder: row.sort_order,
  updatedAt: row.updated_at,
});

export const loginSlideFallbackRecords: LoginSlideRecord[] = [
  {
    createdAt: new Date(0).toISOString(),
    id: "fallback-operations",
    imageUrl: "/images/omaleima-ops-hero.png",
    isActive: true,
    localized: {
      en: {
        body: "Events, leimat and reward handoffs in one clean operator panel.",
        eyebrow: "OmaLeima",
        imageAlt: "OmaLeima operations dashboard visual",
        title: "Operations",
      },
      fi: {
        body: "Tapahtumat, leimat ja palkintojen luovutus yhdessä selkeässä hallintapaneelissa.",
        eyebrow: "OmaLeima",
        imageAlt: "OmaLeiman hallintapaneelin kuvitus",
        title: "Hallinta",
      },
    },
    sortOrder: 0,
    updatedAt: new Date(0).toISOString(),
  },
];

const loginSlideSelect = [
  "id",
  "eyebrow",
  "title",
  "body",
  "image_url",
  "image_alt",
  "eyebrow_fi",
  "title_fi",
  "body_fi",
  "image_alt_fi",
  "eyebrow_en",
  "title_en",
  "body_en",
  "image_alt_en",
  "sort_order",
  "is_active",
  "created_at",
  "updated_at",
].join(",");

export const fetchActiveLoginSlidesAsync = async (
  supabase: SupabaseClient
): Promise<LoginSlideRecord[]> => {
  const { data, error } = await supabase
    .from("login_slides")
    .select(loginSlideSelect)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(8)
    .returns<LoginSlideRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load active login slides: ${error.message}`);
  }

  return data.length === 0 ? loginSlideFallbackRecords : data.map(mapLoginSlideRow);
};

export const fetchAdminLoginSlidesAsync = async (
  supabase: SupabaseClient
): Promise<LoginSlideRecord[]> => {
  const { data, error } = await supabase
    .from("login_slides")
    .select(loginSlideSelect)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<LoginSlideRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load admin login slides: ${error.message}`);
  }

  return data.map(mapLoginSlideRow);
};
