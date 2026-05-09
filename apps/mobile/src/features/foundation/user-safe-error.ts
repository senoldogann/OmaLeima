import type { AppLanguage } from "@/features/i18n/translations";

type UserSafeErrorContext =
  | "access"
  | "action"
  | "announcements"
  | "business"
  | "businessMedia"
  | "businessScanner"
  | "clubClaims"
  | "clubDashboard"
  | "clubMedia"
  | "eventDetail"
  | "events"
  | "legalConsent"
  | "map"
  | "profile"
  | "pushRegistration"
  | "qrContext"
  | "qrToken"
  | "reports"
  | "rewards";

const fallbackMessages: Record<UserSafeErrorContext, Record<AppLanguage, string>> = {
  access: {
    fi: "Pääsyoikeuksia ei voitu tarkistaa. Kirjaudu uudelleen tai yritä hetken päästä.",
    en: "Access could not be checked. Sign in again or try again in a moment.",
  },
  action: {
    fi: "Toiminto epäonnistui. Päivitä näkymä ja yritä uudelleen.",
    en: "The action failed. Refresh the view and try again.",
  },
  announcements: {
    fi: "Ilmoituksia ei voitu ladata. Yritä hetken päästä uudelleen.",
    en: "Announcements could not be loaded. Try again in a moment.",
  },
  business: {
    fi: "Yritysnäkymää ei voitu ladata. Päivitä näkymä ja yritä uudelleen.",
    en: "Business view could not be loaded. Refresh the view and try again.",
  },
  businessMedia: {
    fi: "Median tallennus epäonnistui. Tarkista tiedosto ja yritä uudelleen.",
    en: "Media upload failed. Check the file and try again.",
  },
  businessScanner: {
    fi: "Skanneri ei saanut valmista vastausta. Päivitä skanneri ja yritä uudelleen.",
    en: "Scanner could not complete the request. Refresh the scanner and try again.",
  },
  clubClaims: {
    fi: "Palkintojonoa ei voitu käsitellä. Päivitä näkymä ja yritä uudelleen.",
    en: "Reward handoff could not be processed. Refresh the view and try again.",
  },
  clubDashboard: {
    fi: "Klubinäkymää ei voitu ladata. Päivitä näkymä ja yritä uudelleen.",
    en: "Club view could not be loaded. Refresh the view and try again.",
  },
  clubMedia: {
    fi: "Median tallennus epäonnistui. Tarkista tiedosto ja yritä uudelleen.",
    en: "Media upload failed. Check the file and try again.",
  },
  eventDetail: {
    fi: "Tapahtuman tietoja ei voitu ladata. Päivitä näkymä ja yritä uudelleen.",
    en: "Event details could not be loaded. Refresh the view and try again.",
  },
  events: {
    fi: "Tapahtumia ei voitu ladata. Päivitä lista ja yritä uudelleen.",
    en: "Events could not be loaded. Refresh the list and try again.",
  },
  legalConsent: {
    fi: "Käyttöehtojen tilaa ei voitu ladata. Yritä hetken päästä uudelleen.",
    en: "Legal consent state could not be loaded. Try again in a moment.",
  },
  map: {
    fi: "Kartan lataaminen epäonnistui. Yritä hetken päästä uudelleen.",
    en: "Map could not be loaded. Try again in a moment.",
  },
  profile: {
    fi: "Profiilia ei voitu ladata. Päivitä näkymä ja yritä uudelleen.",
    en: "Profile could not be loaded. Refresh the view and try again.",
  },
  pushRegistration: {
    fi: "Ilmoitusasetusta ei voitu päivittää. Tarkista lupa-asetus ja yritä uudelleen.",
    en: "Notification setting could not be updated. Check permissions and try again.",
  },
  qrContext: {
    fi: "QR-tilannetta ei voitu ladata. Päivitä näkymä ja yritä uudelleen.",
    en: "QR context could not be loaded. Refresh the view and try again.",
  },
  qrToken: {
    fi: "QR-koodin lataus epäonnistui. Pidä näkymä auki ja yritä hetken päästä uudelleen.",
    en: "QR loading failed. Keep this screen open and try again in a moment.",
  },
  reports: {
    fi: "Raporttia ei voitu ladata. Päivitä näkymä ja yritä uudelleen.",
    en: "Report could not be loaded. Refresh the view and try again.",
  },
  rewards: {
    fi: "Palkintoja ei voitu ladata. Päivitä näkymä ja yritä uudelleen.",
    en: "Rewards could not be loaded. Refresh the view and try again.",
  },
};

const readErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message.trim() : "";

export const createUserSafeErrorMessage = (
  error: unknown,
  language: AppLanguage,
  context: UserSafeErrorContext,
): string => {
  const message = readErrorMessage(error);

  if (message.startsWith("QR_RATE_LIMITED:")) {
    return language === "fi"
      ? "QR päivittyy hetken päästä automaattisesti. Pidä tämä näkymä auki."
      : "QR will refresh automatically in a moment. Keep this screen open.";
  }

  if (message === "Network request failed" || message.toLowerCase().includes("network")) {
    return language === "fi"
      ? "Verkkoyhteys katkesi. Tarkista yhteys ja yritä uudelleen."
      : "Network connection failed. Check your connection and try again.";
  }

  return fallbackMessages[context][language];
};
