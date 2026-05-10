import type { PublicLocale } from "@/features/public-site/site-config";

export type CookiePreferenceValue = "essential" | "all";

export type CookieConsentCopy = {
  acceptAllLabel: string;
  acceptEssentialLabel: string;
  analyticsBody: string;
  analyticsLabel: string;
  body: string;
  closeLabel: string;
  essentialBody: string;
  essentialLabel: string;
  footerSettingsLabel: string;
  manageLabel: string;
  privacyLabel: string;
  saveLabel: string;
  settingsBody: string;
  settingsTitle: string;
  termsLabel: string;
  title: string;
};

export const cookieConsentCookieName = "omaleima_cookie_consent";
export const cookieConsentVersion = "2026-05-06-v1";
export const cookieConsentChangedEventName = "omaleima-cookie-consent-open";

const cookieConsentCopyByLocale: Record<PublicLocale, CookieConsentCopy> = {
  en: {
    acceptAllLabel: "Accept all",
    acceptEssentialLabel: "Use essential only",
    analyticsBody:
      "OmaLeima does not currently load analytics or marketing cookies on the public website. If this changes, this switch controls whether optional measurement can run.",
    analyticsLabel: "Analytics and marketing",
    body:
      "We use essential cookies for security, authentication, language and form protection. Optional analytics or marketing cookies are not loaded unless you choose to allow them.",
    closeLabel: "Close cookie settings",
    essentialBody:
      "Required for secure sessions, dashboard login, language preference, spam protection and remembering this cookie choice.",
    essentialLabel: "Essential cookies",
    footerSettingsLabel: "Cookie settings",
    manageLabel: "Manage settings",
    privacyLabel: "Privacy notice",
    saveLabel: "Save choices",
    settingsBody:
      "You can change your choice any time. Essential cookies cannot be disabled because OmaLeima needs them to provide the requested service safely.",
    settingsTitle: "Cookie preferences",
    termsLabel: "Terms of use",
    title: "Cookie and privacy choices",
  },
  fi: {
    acceptAllLabel: "Hyväksy kaikki",
    acceptEssentialLabel: "Vain välttämättömät",
    analyticsBody:
      "OmaLeima ei tällä hetkellä lataa analytiikka- tai markkinointievästeitä julkisella sivustolla. Jos tämä muuttuu, tämä valinta ohjaa vapaaehtoista mittausta.",
    analyticsLabel: "Analytiikka ja markkinointi",
    body:
      "Käytämme välttämättömiä evästeitä turvallisuuteen, kirjautumiseen, kieleen ja lomakesuojaukseen. Vapaaehtoisia analytiikka- tai markkinointievästeitä ei ladata ilman valintaasi.",
    closeLabel: "Sulje evästeasetukset",
    essentialBody:
      "Tarvitaan turvallisiin istuntoihin, hallintapaneelin kirjautumiseen, kielivalintaan, roskapostisuojaukseen ja tämän evästevalinnan muistamiseen.",
    essentialLabel: "Välttämättömät evästeet",
    footerSettingsLabel: "Evästeasetukset",
    manageLabel: "Hallitse asetuksia",
    privacyLabel: "Tietosuojaseloste",
    saveLabel: "Tallenna valinnat",
    settingsBody:
      "Voit muuttaa valintaasi milloin tahansa. Välttämättömiä evästeitä ei voi poistaa käytöstä, koska OmaLeima tarvitsee niitä pyydetyn palvelun turvalliseen tarjoamiseen.",
    settingsTitle: "Evästeasetukset",
    termsLabel: "Käyttöehdot",
    title: "Eväste- ja tietosuojavalinnat",
  },
};

export const getCookieConsentCopy = (locale: PublicLocale): CookieConsentCopy =>
  cookieConsentCopyByLocale[locale];
