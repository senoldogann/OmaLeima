import type { DashboardLocale } from "@/features/dashboard/i18n";

export type LoginSlideLocalizedCopy = {
  body: string;
  eyebrow: string;
  imageAlt: string;
  title: string;
};

export type LoginSlideRecord = {
  createdAt: string;
  id: string;
  imageUrl: string;
  isActive: boolean;
  localized: Record<DashboardLocale, LoginSlideLocalizedCopy>;
  sortOrder: number;
  updatedAt: string;
};

export type LoginSlidePayload = {
  id: string | null;
  imageUrl: string;
  isActive: boolean;
  localized: Record<DashboardLocale, LoginSlideLocalizedCopy>;
  sortOrder: string;
};

export type LoginSlideMutationResponse = {
  message: string;
  status: string;
};

export const getLoginSlideLocalizedCopy = (
  slide: LoginSlideRecord,
  locale: DashboardLocale
): LoginSlideLocalizedCopy => slide.localized[locale];
