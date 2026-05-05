export type PublicLocale = "en" | "fi";

export type PublicFooterLink = {
  href: string;
  label: string;
};

export const publicSiteUrl = "https://omaleima.fi";

export const publicCompanyInfo = {
  address: "Sarvivälkkeentie 3 C 27, 90240 Oulu",
  businessId: "3346878-5",
  email: "contact@omaleima.fi",
  instagramHandle: "@omaleima",
  instagramUrl: "https://www.instagram.com/omaleima/",
  mailingAddress: "Sarvivälkkeentie 3 C 27, 90240 Oulu",
  name: "T:mi Aslan Dogan Marketing",
  phone: "045 124 2459",
  phoneHref: "tel:+358451242459",
} as const;

export const getPublicHomeHref = (locale: PublicLocale): string =>
  locale === "fi" ? "/" : "/en";

export const getPublicPrivacyHref = (locale: PublicLocale): string =>
  locale === "fi" ? "/privacy" : "/en/privacy";

export const getPublicTermsHref = (locale: PublicLocale): string =>
  locale === "fi" ? "/terms" : "/en/terms";

export const getPublicLegalLinks = (locale: PublicLocale): ReadonlyArray<PublicFooterLink> => [
  {
    href: getPublicPrivacyHref(locale),
    label: locale === "fi" ? "Tietosuojaseloste" : "Privacy notice",
  },
  {
    href: getPublicTermsHref(locale),
    label: locale === "fi" ? "Käyttöehdot" : "Terms of use",
  },
];
