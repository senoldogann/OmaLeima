import type { AppLanguage } from "@/features/i18n/translations";
import { supabase } from "@/lib/supabase";

export type MobileLoginSlideLocalizedCopy = {
  body: string;
  eyebrow: string;
  title: string;
};

export type MobileLoginSlideRecord = {
  id: string;
  imageUrl: string;
  localized: Record<AppLanguage, MobileLoginSlideLocalizedCopy>;
};

type LoginSlideRow = {
  body: string;
  body_en: string | null;
  body_fi: string | null;
  eyebrow: string;
  eyebrow_en: string | null;
  eyebrow_fi: string | null;
  id: string;
  image_url: string;
  title: string;
  title_en: string | null;
  title_fi: string | null;
};

const loginSlideSelect = [
  "id",
  "eyebrow",
  "title",
  "body",
  "image_url",
  "eyebrow_fi",
  "title_fi",
  "body_fi",
  "eyebrow_en",
  "title_en",
  "body_en",
].join(",");

const mapLoginSlideRow = (row: LoginSlideRow): MobileLoginSlideRecord => ({
  id: row.id,
  imageUrl: row.image_url,
  localized: {
    en: {
      body: row.body_en ?? row.body,
      eyebrow: row.eyebrow_en ?? row.eyebrow,
      title: row.title_en ?? row.title,
    },
    fi: {
      body: row.body_fi ?? row.body,
      eyebrow: row.eyebrow_fi ?? row.eyebrow,
      title: row.title_fi ?? row.title,
    },
  },
});

export const fetchActiveMobileLoginSlidesAsync = async (): Promise<MobileLoginSlideRecord[]> => {
  const { data, error } = await supabase
    .from("login_slides")
    .select(loginSlideSelect)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(8)
    .returns<LoginSlideRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load mobile login slides: ${error.message}`);
  }

  return data.map(mapLoginSlideRow);
};
