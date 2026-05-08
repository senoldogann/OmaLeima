import { cookies } from "next/headers";

import { dashboardLocaleCookieName } from "@/features/dashboard/locale-cookie";
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
      "/admin/support-requests": {
        subtitle: "Review mobile support requests from students, businesses, and organizers, then answer in-app.",
        title: "Mobile support",
      },
      "/admin/users": {
        subtitle: "Review student, business, organizer, and admin profiles, then activate or passivate accounts safely.",
        title: "Users",
      },
      "/admin/department-tags": {
        subtitle: "Merge duplicate department tags into canonical labels or block low-quality tags without leaving the admin area.",
        title: "Department tags",
      },
      "/admin/login-slides": {
        subtitle: "Update the admin login page slider images and text without a code deploy.",
        title: "Login slides",
      },
      "/admin/oversight": {
        subtitle: "Track platform-wide clubs, events, audit activity, and fraud signals from one operational surface.",
        title: "Platform oversight",
      },
      "/admin/rewards": {
        subtitle: "Manage reward tiers across platform events, including safe deletion that preserves claim history.",
        title: "Reward tiers",
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
      "/club/reports": {
        subtitle: "Review event performance, reward flow, and post-event re-engagement results from one organizer reporting surface.",
        title: "Reports",
      },
      "/club/profile": {
        subtitle: "Update public club contact details and organizer profile information shown across OmaLeima.",
        title: "Organizer profile",
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
        subtitle: "Valvo koko alustan toimintaa, käsittele yrityshakemukset ja seuraa tapahtumien tilaa yhdessä näkymässä.",
        title: "Kojelauta",
      },
      "/admin/announcements": {
        subtitle: "Julkaise sovelluksen sisäisiä tiedotteita kaikille käyttäjille.",
        title: "Tiedotteet",
      },
      "/admin/business-applications": {
        subtitle: "Tarkista ja hyväksy tai hylkää avoimet yrityshakemukset.",
        title: "Uudet hakemukset",
      },
      "/admin/contact-submissions": {
        subtitle: "Tarkista julkisen yhteydenottolomakkeen viestit, päivitä tila ja avaa yksityiset liitteet.",
        title: "Yhteydenotot",
      },
      "/admin/support-requests": {
        subtitle: "Tarkista opiskelijoiden, yritysten ja järjestäjien mobiilista lähettämät tukipyynnöt ja vastaa sovellukseen.",
        title: "Mobiilituki",
      },
      "/admin/users": {
        subtitle: "Tarkista opiskelija-, yritys-, järjestäjä- ja admin-profiilit sekä aktivoi tai passivoi käyttäjiä turvallisesti.",
        title: "Käyttäjät",
      },
      "/admin/department-tags": {
        subtitle: "Yhdistä päällekkäisiä opiskelualojen tunnisteita tai estä heikkolaatuiset tunnisteet tästä näkymästä.",
        title: "Opiskelualojen tunnisteet",
      },
      "/admin/login-slides": {
        subtitle: "Päivitä admin-login-sivun sliderin kuvat ja tekstit ilman koodijulkaisua.",
        title: "Login-slidet",
      },
      "/admin/oversight": {
        subtitle: "Seuraa klubeja, tapahtumia, valvontahistoriaa ja väärinkäyttösignaaleja yhdestä näkymästä.",
        title: "Alustan valvonta",
      },
      "/admin/rewards": {
        subtitle: "Hallinnoi tapahtumien palkintotasoja ja poista tasoja turvallisesti säilyttäen lunastushistoria.",
        title: "Palkintotasot",
      },
    },
    club: {
      "/club": {
        subtitle: "Hallinnoi klubin tapahtumia, palkintoja ja järjestäjän toimintoja yhdessä paikassa.",
        title: "Järjestäjän näkymä",
      },
      "/club/announcements": {
        subtitle: "Julkaise lyhyitä tiedotteita opiskelijoille ja klubin henkilökunnalle.",
        title: "Tiedotteet",
      },
      "/club/claims": {
        subtitle: "Vahvista palkinnon luovutus opiskelijoille, joiden leimaraja on täyttynyt.",
        title: "Palkintojen luovutus",
      },
      "/club/department-tags": {
        subtitle: "Julkaise viralliset opiskelualojen tunnisteet yhteisöllesi niin, että opiskelijat näkevät ne ensimmäisenä.",
        title: "Opiskelualojen tunnisteet",
      },
      "/club/events": {
        subtitle: "Luo tapahtumaluonnoksia aktiivisille klubeille ja jatka paikkoihin, palkintoihin ja tapahtumapäivän valmisteluun.",
        title: "Klubin tapahtumat",
      },
      "/club/fraud": {
        subtitle: "Tarkista tapahtumakohtaiset väärinkäyttöilmoitukset ja merkitse todelliset ongelmat tai virhehälytykset.",
        title: "Väärinkäyttötarkistus",
      },
      "/club/reports": {
        subtitle: "Seuraa tapahtumien tuloksia, palkintovirtaa ja tapahtuman jälkeisiä kutsuja yhdessä raporttinäkymässä.",
        title: "Raportit",
      },
      "/club/profile": {
        subtitle: "Päivitä OmaLeimassa näkyvät klubin julkiset yhteystiedot ja järjestäjäprofiili.",
        title: "Järjestäjän profiili",
      },
      "/club/rewards": {
        subtitle: "Hallinnoi tapahtumien palkintorajoja, varastomääriä ja luovutusohjeita.",
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
    "/admin/login-slides": "Login slides",
    "/admin/oversight": "Platform oversight",
    "/admin/rewards": "Reward tiers",
    "/admin/support-requests": "Mobile support",
    "/admin/users": "Users",
    "/club": "Dashboard",
    "/club/announcements": "Announcements",
    "/club/claims": "Reward claims",
    "/club/department-tags": "Department tags",
    "/club/events": "Club events",
    "/club/fraud": "Fraud review",
    "/club/profile": "Profile",
    "/club/reports": "Reports",
    "/club/rewards": "Reward tiers",
  },
  fi: {
    "/admin": "Kojelauta",
    "/admin/announcements": "Tiedotteet",
    "/admin/business-applications": "Hakemukset",
    "/admin/contact-submissions": "Yhteydenotot",
    "/admin/department-tags": "Opiskelualojen tunnisteet",
    "/admin/login-slides": "Login-slidet",
    "/admin/oversight": "Alustan valvonta",
    "/admin/rewards": "Palkintotasot",
    "/admin/support-requests": "Mobiilituki",
    "/admin/users": "Käyttäjät",
    "/club": "Kojelauta",
    "/club/announcements": "Tiedotteet",
    "/club/claims": "Palkintojen luovutus",
    "/club/department-tags": "Opiskelualojen tunnisteet",
    "/club/events": "Klubin tapahtumat",
    "/club/fraud": "Väärinkäyttötarkistus",
    "/club/profile": "Profiili",
    "/club/reports": "Raportit",
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
    sessionFallback: locale === "fi" ? "Kirjautunut käyttäjä" : "Authenticated session",
    subtitle: pageCopy?.subtitle ?? subtitle,
    title: pageCopy?.title ?? title,
  };
};
