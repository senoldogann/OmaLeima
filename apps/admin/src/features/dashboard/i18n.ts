import { cookies } from "next/headers";

import type { DashboardNavItem } from "@/features/dashboard/types";

export type DashboardLocale = "en" | "fi";

export type DashboardShellCopy = {
  areaLabel: string;
  localeSwitchLabel: string;
  localeSwitchTitle: string;
  roleFallback: string;
  sessionFallback: string;
  subtitle: string;
  title: string;
};

type DashboardPageCopy = {
  subtitle: string;
  title: string;
};

const dashboardLocaleCookieName = "omaleima-dashboard-locale";

const pageCopyByLocale: Record<DashboardLocale, Record<"admin" | "club", Record<string, DashboardPageCopy>>> = {
  en: {
    admin: {
      "/admin": {
        subtitle: "Moderate platform-wide supply, review incoming business applications, and keep event integrity visible from one operational surface.",
        title: "Operations dashboard",
      },
      "/admin/announcements": {
        subtitle: "Publish platform-wide in-app messages before adding push fan-out and read receipts.",
        title: "Announcements",
      },
      "/admin/business-applications": {
        subtitle: "Review pending business applications through the same admin-owned approval flow used by the backend.",
        title: "Business applications",
      },
      "/admin/contact-submissions": {
        subtitle: "Review public contact form messages, update their status, and open private attachments.",
        title: "Contact submissions",
      },
      "/admin/department-tags": {
        subtitle: "Merge duplicate department tags into canonical labels or block low-quality tags without leaving the admin area.",
        title: "Department tags",
      },
      "/admin/oversight": {
        subtitle: "Track platform-wide clubs, events, audit activity, and fraud signals from one operational surface.",
        title: "Platform oversight",
      },
    },
    club: {
      "/club": {
        subtitle: "Configure club-owned events, track reward flow, and keep organizer-facing moderation surfaces in one place.",
        title: "Organizer dashboard",
      },
      "/club/announcements": {
        subtitle: "Publish short in-app updates for students and club staff.",
        title: "Announcements",
      },
      "/club/claims": {
        subtitle: "Confirm physical reward handoff for eligible students without exposing extra student profile data.",
        title: "Reward claims",
      },
      "/club/department-tags": {
        subtitle: "Publish official study labels for your community so students see canonical department tags before custom ones.",
        title: "Department tags",
      },
      "/club/events": {
        subtitle: "Create draft events for your active clubs, then continue with venues, rewards, and event-day preparation.",
        title: "Club events",
      },
      "/club/fraud": {
        subtitle: "Review event-scoped fraud warnings, confirm real issues, or dismiss false positives after checking the scan context.",
        title: "Fraud review",
      },
      "/club/rewards": {
        subtitle: "Manage event reward thresholds, stock visibility, and claim handoff instructions from one organizer surface.",
        title: "Reward tiers",
      },
    },
  },
  fi: {
    admin: {
      "/admin": {
        subtitle: "Valvo koko alustan tarjontaa, tarkista yrityshakemukset ja pidä tapahtumien eheys yhdessä näkymässä.",
        title: "Operointinäkymä",
      },
      "/admin/announcements": {
        subtitle: "Julkaise koko alustan sisäisiä viestejä ennen push-jakelun ja lukukuittausten laajennusta.",
        title: "Tiedotteet",
      },
      "/admin/business-applications": {
        subtitle: "Käsittele avoimet yrityshakemukset samalla admin-hyväksyntävirralla, jota backend käyttää.",
        title: "Yrityshakemukset",
      },
      "/admin/contact-submissions": {
        subtitle: "Tarkista julkisen yhteydenottolomakkeen viestit, päivitä tila ja avaa yksityiset liitteet.",
        title: "Yhteydenotot",
      },
      "/admin/department-tags": {
        subtitle: "Yhdistä päällekkäisiä opiskelualojen tageja tai estä heikkolaatuiset tagit admin-näkymästä.",
        title: "Opiskelualojen tagit",
      },
      "/admin/oversight": {
        subtitle: "Seuraa klubeja, tapahtumia, auditointia ja fraud-signaaleja yhdestä operointinäkymästä.",
        title: "Alustan valvonta",
      },
    },
    club: {
      "/club": {
        subtitle: "Hallinnoi klubin tapahtumia, palkintovirtaa ja järjestäjän moderointinäkymiä yhdessä paikassa.",
        title: "Järjestäjän näkymä",
      },
      "/club/announcements": {
        subtitle: "Julkaise lyhyitä sovelluksen sisäisiä päivityksiä opiskelijoille ja klubin henkilökunnalle.",
        title: "Tiedotteet",
      },
      "/club/claims": {
        subtitle: "Vahvista fyysinen palkinnon luovutus kelpoisille opiskelijoille paljastamatta ylimääräisiä profiilitietoja.",
        title: "Palkintojen luovutus",
      },
      "/club/department-tags": {
        subtitle: "Julkaise viralliset opiskelualojen tagit yhteisöllesi, jotta opiskelijat näkevät ensisijaiset nimet.",
        title: "Opiskelualojen tagit",
      },
      "/club/events": {
        subtitle: "Luo tapahtumaluonnoksia aktiivisille klubeille ja jatka paikkoihin, palkintoihin ja tapahtumapäivän valmisteluun.",
        title: "Klubin tapahtumat",
      },
      "/club/fraud": {
        subtitle: "Tarkista tapahtumakohtaiset fraud-varoitukset ja merkitse todelliset ongelmat tai virhehälytykset.",
        title: "Fraud-tarkistus",
      },
      "/club/rewards": {
        subtitle: "Hallinnoi tapahtumien palkintorajoja, varastosaatavuutta ja luovutusohjeita yhdestä järjestäjänäkymästä.",
        title: "Palkintotasot",
      },
    },
  },
};

const navLabelByLocale: Record<DashboardLocale, Record<string, string>> = {
  en: {
    "/admin": "Dashboard",
    "/admin/announcements": "Announcements",
    "/admin/business-applications": "Business applications",
    "/admin/contact-submissions": "Contact submissions",
    "/admin/department-tags": "Department tags",
    "/admin/oversight": "Platform oversight",
    "/club": "Dashboard",
    "/club/announcements": "Announcements",
    "/club/claims": "Reward claims",
    "/club/department-tags": "Department tags",
    "/club/events": "Club events",
    "/club/fraud": "Fraud review",
    "/club/rewards": "Reward tiers",
  },
  fi: {
    "/admin": "Etusivu",
    "/admin/announcements": "Tiedotteet",
    "/admin/business-applications": "Yrityshakemukset",
    "/admin/contact-submissions": "Yhteydenotot",
    "/admin/department-tags": "Opiskelualojen tagit",
    "/admin/oversight": "Alustan valvonta",
    "/club": "Etusivu",
    "/club/announcements": "Tiedotteet",
    "/club/claims": "Palkintojen luovutus",
    "/club/department-tags": "Opiskelualojen tagit",
    "/club/events": "Klubin tapahtumat",
    "/club/fraud": "Fraud-tarkistus",
    "/club/rewards": "Palkintotasot",
  },
};

export const isDashboardLocale = (value: string): value is DashboardLocale =>
  value === "en" || value === "fi";

export const getDashboardLocaleAsync = async (): Promise<DashboardLocale> => {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(dashboardLocaleCookieName)?.value;

  if (typeof rawLocale === "string" && isDashboardLocale(rawLocale)) {
    return rawLocale;
  }

  return "fi";
};

export const getDashboardLocaleCookieName = (): string => dashboardLocaleCookieName;

export const getAlternateDashboardLocale = (locale: DashboardLocale): DashboardLocale =>
  locale === "fi" ? "en" : "fi";

export const translateDashboardNavigationItems = (
  items: DashboardNavItem[],
  locale: DashboardLocale
): DashboardNavItem[] =>
  items.map((item) => ({
    ...item,
    label: navLabelByLocale[locale][item.href] ?? item.label,
  }));

export const getDashboardShellCopy = ({
  activeHref,
  areaLabel,
  locale,
  subtitle,
  title,
}: {
  activeHref: string;
  areaLabel: string;
  locale: DashboardLocale;
  subtitle: string;
  title: string;
}): DashboardShellCopy => {
  const area = activeHref.startsWith("/club") ? "club" : "admin";
  const pageCopy = pageCopyByLocale[locale][area][activeHref];

  return {
    areaLabel:
      locale === "fi"
        ? area === "club"
          ? "Järjestäjän työtila"
          : "Alustan admin"
        : areaLabel,
    localeSwitchLabel: locale === "fi" ? "In English" : "Suomeksi",
    localeSwitchTitle: locale === "fi" ? "Kieli" : "Language",
    roleFallback: locale === "fi" ? "Tuntematon rooli" : "Unknown role",
    sessionFallback: locale === "fi" ? "Kirjautunut sessio" : "Authenticated session",
    subtitle: pageCopy?.subtitle ?? subtitle,
    title: pageCopy?.title ?? title,
  };
};
