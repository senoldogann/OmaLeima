import type { PublicLocale } from "@/features/public-site/site-config";

export type ContactSubjectValue =
    | "business_signup"
    | "collaboration"
    | "pilot"
    | "press"
    | "other";

export type ContactSubjectOption = {
    description: string;
    label: string;
    value: ContactSubjectValue;
};

export type ContactPageContent = {
    attachmentHint: string;
    attachmentLabel: string;
    consentLabel: string;
    consentLinkLabel: string;
    description: string;
    emailHint: string;
    emailLabel: string;
    errorGeneric: string;
    errorRateLimit: string;
    errorValidation: string;
    eyebrow: string;
    honeypotLabel: string;
    intro: string;
    messageHint: string;
    messageLabel: string;
    metaDescription: string;
    metaTitle: string;
    nameHint: string;
    nameLabel: string;
    organizationHint: string;
    organizationLabel: string;
    privacyHref: string;
    removeAttachmentLabel: string;
    requiredHint: string;
    submitLabel: string;
    submittingLabel: string;
    subjectHint: string;
    subjectLabel: string;
    subjectOptions: ReadonlyArray<ContactSubjectOption>;
    successBody: string;
    successTitle: string;
    title: string;
};

const fiContent: ContactPageContent = {
    attachmentHint: "Valinnainen. JPG, PNG tai WebP, enintään 5 MB.",
    attachmentLabel: "Liite (kuva)",
    consentLabel: "Hyväksyn, että lomakkeen tiedot tallennetaan yhteydenottoa varten.",
    consentLinkLabel: "tietosuojaselosteen",
    description: "Kerro lyhyesti kuka olet ja mitä mietit. Vastaamme yleensä saman päivän aikana.",
    emailHint: "Käytämme tätä vain vastataksemme sinulle.",
    emailLabel: "Sähköposti",
    errorGeneric: "Lomakkeen lähetys epäonnistui. Yritä hetken kuluttua uudelleen.",
    errorRateLimit: "Olet lähettänyt lomakkeen liian usein. Odota hetki ja yritä uudelleen.",
    errorValidation: "Tarkista lomakkeen kentät ja yritä uudelleen.",
    eyebrow: "Yhteydenotto",
    honeypotLabel: "Älä täytä tätä kenttää",
    intro: "Yritys, klubi tai opiskelijajärjestö — kerro mitä haluat järjestää, niin etsimme yhdessä toimivimman tavan.",
    messageHint: "Vähintään 10 merkkiä.",
    messageLabel: "Viesti",
    metaDescription:
        "Ota yhteyttä OmaLeiman tiimiin. Kerro tapahtumasi tai yrityksesi tarpeesta ja vastaamme nopeasti.",
    metaTitle: "Ota yhteyttä — OmaLeima",
    nameHint: "Etu- ja sukunimi.",
    nameLabel: "Nimi",
    organizationHint: "Valinnainen. Yrityksen, klubin tai järjestön nimi.",
    organizationLabel: "Organisaatio",
    privacyHref: "/privacy",
    removeAttachmentLabel: "Poista liite",
    requiredHint: "Pakollinen kenttä",
    submitLabel: "Lähetä viesti",
    submittingLabel: "Lähetetään…",
    subjectHint: "Valitse aihe, joka kuvaa parhaiten yhteydenottoasi.",
    subjectLabel: "Aihe",
    subjectOptions: [
        {
            description: "Olemme yritys ja haluamme liittyä tarkistuspisteeksi tai kumppaniksi.",
            label: "Yrityksen rekisteröityminen",
            value: "business_signup",
        },
        {
            description: "Yhteistyö, kumppanuus tai sponsorointi opiskelijatapahtumassa.",
            label: "Yhteistyö / kumppanuus",
            value: "collaboration",
        },
        {
            description: "Kiinnostunut OmaLeiman pilotoinnista omalle tapahtumallesi.",
            label: "Pilotti tai testaus",
            value: "pilot",
        },
        {
            description: "Lehdistökyselyt ja viestintä.",
            label: "Lehdistö",
            value: "press",
        },
        {
            description: "Muu aihe — kerro viestissä lisää.",
            label: "Muu",
            value: "other",
        },
    ],
    successBody:
        "Kiitos yhteydenotosta! Saimme viestisi ja vastaamme yleensä saman päivän aikana sähköpostilla.",
    successTitle: "Viesti lähetetty",
    title: "Ota yhteyttä",
};

const enContent: ContactPageContent = {
    attachmentHint: "Optional. JPG, PNG or WebP, max 5 MB.",
    attachmentLabel: "Attachment (image)",
    consentLabel: "I agree that the form details are stored to handle this contact request.",
    consentLinkLabel: "privacy notice",
    description: "Tell us briefly who you are and what you have in mind. We usually reply the same day.",
    emailHint: "We only use this to reply to you.",
    emailLabel: "Email",
    errorGeneric: "Sending failed. Please try again in a moment.",
    errorRateLimit: "You sent the form too many times. Please wait a moment and try again.",
    errorValidation: "Please check the form fields and try again.",
    eyebrow: "Contact",
    honeypotLabel: "Do not fill in this field",
    intro: "Business, club or student association — tell us what you want to run and we will find the best fit together.",
    messageHint: "At least 10 characters.",
    messageLabel: "Message",
    metaDescription:
        "Get in touch with the OmaLeima team. Tell us about your event or business need and we reply quickly.",
    metaTitle: "Contact — OmaLeima",
    nameHint: "First and last name.",
    nameLabel: "Name",
    organizationHint: "Optional. Company, club or association name.",
    organizationLabel: "Organisation",
    privacyHref: "/en/privacy",
    removeAttachmentLabel: "Remove attachment",
    requiredHint: "Required field",
    submitLabel: "Send message",
    submittingLabel: "Sending…",
    subjectHint: "Select the topic that best fits your request.",
    subjectLabel: "Topic",
    subjectOptions: [
        {
            description: "We are a business and want to join as a checkpoint or partner.",
            label: "Business sign-up",
            value: "business_signup",
        },
        {
            description: "Collaboration, partnership or sponsorship for a student event.",
            label: "Collaboration / partnership",
            value: "collaboration",
        },
        {
            description: "Interested in piloting OmaLeima for your event.",
            label: "Pilot or test run",
            value: "pilot",
        },
        {
            description: "Press inquiries and communications.",
            label: "Press",
            value: "press",
        },
        {
            description: "Something else — tell us in the message.",
            label: "Other",
            value: "other",
        },
    ],
    successBody:
        "Thanks for reaching out! Your message arrived and we usually reply the same day by email.",
    successTitle: "Message sent",
    title: "Contact us",
};

export const contactSubjectValues: ReadonlyArray<ContactSubjectValue> = [
    "business_signup",
    "collaboration",
    "pilot",
    "press",
    "other",
] as const;

export const getContactPageContent = (locale: PublicLocale): ContactPageContent =>
    locale === "fi" ? fiContent : enContent;

export const getContactPageHref = (locale: PublicLocale): string =>
    locale === "fi" ? "/contact" : "/en/contact";
