import type { PublicLocale } from "@/features/public-site/site-config";

export type BusinessApplicationContent = {
  addressHint: string;
  addressLabel: string;
  cityHint: string;
  cityLabel: string;
  consentLabel: string;
  contactEmailHint: string;
  contactEmailLabel: string;
  contactNameHint: string;
  contactNameLabel: string;
  countryLabel: string;
  description: string;
  errorGeneric: string;
  errorVerification: string;
  eyebrow: string;
  instagramHint: string;
  instagramLabel: string;
  messageHint: string;
  messageLabel: string;
  metaDescription: string;
  metaTitle: string;
  nameHint: string;
  nameLabel: string;
  phoneHint: string;
  phoneLabel: string;
  protectionLabel: string;
  protectionUnavailable: string;
  requiredHint: string;
  submitLabel: string;
  submittingLabel: string;
  successBody: string;
  successTitle: string;
  title: string;
  websiteHint: string;
  websiteLabel: string;
};

const fiContent: BusinessApplicationContent = {
  addressHint: "Katuosoite tai tapahtumapaikan osoite.",
  addressLabel: "Osoite",
  cityHint: "Esim. Helsinki, Tampere, Oulu.",
  cityLabel: "Kaupunki",
  consentLabel: "Hyväksyn, että tiedot tallennetaan yrityshakemuksen käsittelyä varten.",
  contactEmailHint: "Tähän lähetämme jatko-ohjeet ja tunnusten toimituksen.",
  contactEmailLabel: "Yhteyshenkilön sähköposti",
  contactNameHint: "Henkilö, joka voi vahvistaa yrityksen osallistumisen.",
  contactNameLabel: "Yhteyshenkilö",
  countryLabel: "Maa",
  description:
    "Täytä paikan perustiedot. Hakemus tulee suoraan admin-paneelin Yrityshakemukset-jonoon, jossa tiimi hyväksyy tai hylkää sen.",
  errorGeneric: "Hakemuksen lähetys epäonnistui. Yritä hetken kuluttua uudelleen.",
  errorVerification: "Vahvistus epäonnistui. Päivitä sivu ja yritä uudelleen.",
  eyebrow: "Yrityksen hakemus",
  instagramHint: "Valinnainen. Esim. https://instagram.com/paikka",
  instagramLabel: "Instagram",
  messageHint: "Kerro lyhyesti millaisiin opiskelijatapahtumiin haluatte mukaan.",
  messageLabel: "Lisätiedot",
  metaDescription:
    "Hae OmaLeima-yrityskumppaniksi. Hakemus näkyy admin-paneelissa ja hyväksynnän jälkeen yritysprofiili voidaan luoda.",
  metaTitle: "Yrityksen hakemus — OmaLeima",
  nameHint: "Yrityksen tai tapahtumapaikan julkinen nimi.",
  nameLabel: "Yrityksen nimi",
  phoneHint: "Valinnainen.",
  phoneLabel: "Puhelin",
  protectionLabel: "Roskapostisuojaus",
  protectionUnavailable: "Hakemuksen suojausta ei ole määritetty. Ota yhteyttä suoraan sähköpostilla.",
  requiredHint: "Pakollinen kenttä",
  submitLabel: "Lähetä yrityshakemus",
  submittingLabel: "Lähetetään…",
  successBody:
    "Hakemus on nyt admin-jonossa. Hyväksynnän jälkeen luomme yritysprofiilin, scanner-tunnukset ja toimitamme käyttöönotto-ohjeet yhteyshenkilölle.",
  successTitle: "Hakemus lähetetty",
  title: "Liity OmaLeima-yrityskumppaniksi",
  websiteHint: "Valinnainen. Esim. https://yritys.fi",
  websiteLabel: "Verkkosivu",
};

const enContent: BusinessApplicationContent = {
  addressHint: "Street address or venue address.",
  addressLabel: "Address",
  cityHint: "For example Helsinki, Tampere, Oulu.",
  cityLabel: "City",
  consentLabel: "I agree that the details are stored for reviewing this business application.",
  contactEmailHint: "We use this for next steps and account delivery.",
  contactEmailLabel: "Contact email",
  contactNameHint: "The person who can confirm the venue participation.",
  contactNameLabel: "Contact person",
  countryLabel: "Country",
  description:
    "Add the venue basics. The application goes directly into the admin Business applications queue, where the team can approve or reject it.",
  errorGeneric: "Sending the application failed. Please try again in a moment.",
  errorVerification: "Verification failed. Refresh the page and try again.",
  eyebrow: "Business application",
  instagramHint: "Optional. For example https://instagram.com/venue",
  instagramLabel: "Instagram",
  messageHint: "Tell us briefly what kind of student events you want to join.",
  messageLabel: "Notes",
  metaDescription:
    "Apply to become an OmaLeima business partner. Applications appear in the admin panel and approval creates the business profile.",
  metaTitle: "Business application — OmaLeima",
  nameHint: "Public company or venue name.",
  nameLabel: "Business name",
  phoneHint: "Optional.",
  phoneLabel: "Phone",
  protectionLabel: "Spam protection",
  protectionUnavailable: "Application protection is not configured. Please contact us directly by email.",
  requiredHint: "Required field",
  submitLabel: "Send business application",
  submittingLabel: "Sending…",
  successBody:
    "The application is now in the admin queue. After approval we create the business profile, scanner accounts, and send onboarding instructions to the contact person.",
  successTitle: "Application sent",
  title: "Join OmaLeima as a business partner",
  websiteHint: "Optional. For example https://company.fi",
  websiteLabel: "Website",
};

export const getBusinessApplicationContent = (locale: PublicLocale): BusinessApplicationContent =>
  locale === "fi" ? fiContent : enContent;

export const getBusinessApplicationHref = (locale: PublicLocale): string =>
  locale === "fi" ? "/apply" : "/en/apply";
