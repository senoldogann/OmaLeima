import { getBusinessApplicationHref } from "@/features/public-site/business-application-content";
import {
  getPublicLegalLinks,
  publicCompanyInfo,
  type PublicFooterLink,
  type PublicLocale,
} from "@/features/public-site/site-config";

export { publicSiteUrl, type PublicLocale } from "@/features/public-site/site-config";

export type PublicLandingContent = {
  applyHref: string;
  applyLabel: string;
  contactHref: string;
  contactLabel: string;
  description: string;
  eyebrow: string;
  footerAddressLabel: string;
  footerBusinessIdLabel: string;
  footerCompanyLabel: string;
  footerLegalLabel: string;
  footerLegalItems: ReadonlyArray<PublicFooterLink>;
  footerNote: string;
  footerPhoneLabel: string;
  footerPostalLabel: string;
  faqItems: ReadonlyArray<{
    answer: string;
    question: string;
  }>;
  heroTitle: string;
  interestHref: string;
  interestLabel: string;
  localeLabel: string;
  localeSwitchHref: string;
  localeSwitchLabel: string;
  metaDescription: string;
  navItems: ReadonlyArray<{
    href: string;
    label: string;
  }>;
  ogLocale: string;
  productTitle: string;
  sectionLabel: string;
  statItems: ReadonlyArray<{
    label: string;
    value: string;
  }>;
  storyItems: ReadonlyArray<{
    body: string;
    title: string;
  }>;
  supportItems: ReadonlyArray<{
    body: string;
    title: string;
  }>;
  timelineItems: ReadonlyArray<{
    body: string;
    step: string;
    title: string;
  }>;
};

const interestHref = publicCompanyInfo.instagramUrl;

export const publicLandingContentByLocale: Record<PublicLocale, PublicLandingContent> = {
  en: {
    applyHref: getBusinessApplicationHref("en"),
    applyLabel: "Apply as a partner",
    contactHref: "/en/contact",
    contactLabel: "Contact us",
    description:
      "OmaLeima turns Finnish student event stamp cards into one calm digital flow: QR checkpoints, reward progress, and clearer event-day operations for organizers, venues, clubs, and students.",
    eyebrow: "Digital leima pass",
    footerAddressLabel: "Business address",
    footerBusinessIdLabel: "Business ID",
    footerCompanyLabel: "Company details",
    footerLegalItems: getPublicLegalLinks("en"),
    footerLegalLabel: "Legal",
    footerNote: "Built for Finnish student culture. Pilot conversations are open.",
    footerPhoneLabel: "Phone",
    footerPostalLabel: "Mailing address",
    faqItems: [
      {
        answer:
          "OmaLeima is a digital leima pass for Finnish student events. Students collect QR-verified stamps on their phones, venues scan checkpoints from any device, and organizers monitor everything in one dashboard — no paper cards or manual tracking needed.",
        question: "What is OmaLeima?",
      },
      {
        answer:
          "Apply on the website or reach out directly. Onboarding is fast: register your venue, add a checkpoint, and activate your scanner access. Most partners are ready for their first event within the same week.",
        question: "How does a venue or business join?",
      },
      {
        answer:
          "The organizer creates the event in the app, adds venue partners as checkpoints, and sets reward thresholds. Students can see the event immediately and join from their phones.",
        question: "How does an organizer set up an event?",
      },
      {
        answer:
          "The scanner requires a live connection because every stamp is verified in real-time on the backend. This is what prevents duplicate stamps and screenshot abuse.",
        question: "Does scanning work without internet?",
      },
      {
        answer:
          "Any smartphone or tablet is enough. The venue logs in via browser or app and can start scanning QR codes immediately — no special hardware required.",
        question: "What devices does a scanning venue need?",
      },
      {
        answer:
          "During the pilot phase, onboarding is free for partner venues. Long-term pricing is agreed on in the pilot discussion — get in touch and we will walk you through it.",
        question: "Is the service free?",
      },
    ],
    heroTitle: "Leimas and rewards in one clean system.",
    interestHref,
    interestLabel: "Follow @omaleima",
    localeLabel: "EN",
    localeSwitchHref: "/",
    localeSwitchLabel: "Suomeksi",
    metaDescription:
      "OmaLeima is a digital leima pass for Finnish student events, appro nights, QR checkpoints, rewards, and organizer operations.",
    navItems: [
      { href: "#flow", label: "Flow" },
      { href: "#culture", label: "Culture" },
      { href: "#event-day", label: "Event day" },
      { href: "/en/contact", label: "Contact" },
      { href: "/en/apply", label: "Apply" },
    ],
    ogLocale: "en_US",
    productTitle: "Built for appro nights, venue checkpoints, and reward moments that should feel simple on the phone.",
    sectionLabel: "Built for Finnish student culture",
    statItems: [
      { label: "QR-secured checkpoints", value: "Live" },
      { label: "Paper-free event flow", value: "No paper" },
      { label: "Student-first rewards", value: "Rewards" },
    ],
    storyItems: [
      {
        body: "Students move from venue to venue with a time-limited QR instead of a fragile paper card.",
        title: "Event nights feel lighter",
      },
      {
        body: "Venue staff scan quickly, avoid duplicate stamps, and keep the line moving without confusing manual checks.",
        title: "Scanning stays operational",
      },
      {
        body: "Organizers follow reward progress, announcements, and checkpoints from one consistent control surface.",
        title: "Clubs stay in control",
      },
    ],
    supportItems: [
      {
        body: "Bring clubs, student unions, and venue partners into one event-day system without building custom ops every time.",
        title: "Organizer setup",
      },
      {
        body: "Reward milestones, venue participation, and announcements stay visible across the full event window.",
        title: "Reward visibility",
      },
      {
        body: "Dynamic QR codes update continuously, preventing screenshots and shared passes from cheating the system.",
        title: "Fraud prevention",
      },
      {
        body: "Track active venues, total scans, and student participation in real-time throughout the night.",
        title: "Live analytics",
      },
    ],
    timelineItems: [
      {
        body: "Students join an event and receive a dynamic QR bound to the active event context.",
        step: "01",
        title: "Join the event",
      },
      {
        body: "Venue staff scan the QR, and the backend checks timing, venue rules, and duplicate protection.",
        step: "02",
        title: "Collect leimas",
      },
      {
        body: "Students unlock patches, badges, or other organizer rewards once the leima threshold is reached.",
        step: "03",
        title: "Claim the reward",
      },
    ],
  },
  fi: {
    applyHref: getBusinessApplicationHref("fi"),
    applyLabel: "Hae kumppaniksi",
    contactHref: "/contact",
    contactLabel: "Ota yhteyttä",
    description:
      "OmaLeima tekee paperisista leimakorteista digitaalisen leimapassin: QR-rastit, palkintojen eteneminen ja selkeä tapahtumapäivän hallinta yhdessä sovelluksessa.",
    eyebrow: "Digitaalinen leimapassi",
    footerAddressLabel: "Toimipaikan osoite",
    footerBusinessIdLabel: "Y-tunnus",
    footerCompanyLabel: "Yrityksen tiedot",
    footerLegalItems: getPublicLegalLinks("fi"),
    footerLegalLabel: "Yleiset sivut",
    footerNote: "Rakennettu suomalaiseen opiskelijakulttuuriin. Pilottikeskustelut ovat avoinna.",
    footerPhoneLabel: "Puhelin",
    footerPostalLabel: "Postiosoite",
    faqItems: [
      {
        answer:
          "OmaLeima on digitaalinen leimapassi opiskelijatapahtumiin. Opiskelija kerää QR-varmistettuja leimoja puhelimellaan, yritys skannaa rasteja omalta laitteeltaan ja järjestäjä seuraa kaikkea yhdestä näkymästä – ilman paperikortteja tai manuaalista seurantaa.",
        question: "Mikä OmaLeima oikein on?",
      },
      {
        answer:
          "Hae kumppaniksi sivustolta tai ota suoraan yhteyttä. Käyttöönotto käy nopeasti: rekisteröi yritys, lisää rastipiste ja aktivoi skannerivaltuutus. Useimmat kumppanit ovat valmiita ensimmäiseen tapahtumaan saman viikon sisällä.",
        question: "Miten yritys tai ravintola pääsee mukaan?",
      },
      {
        answer:
          "Järjestäjä luo tapahtuman sovelluksessa, lisää yrityskumppanit rasteiksi ja asettaa palkintorajat. Opiskelijat näkevät tapahtuman heti ja voivat liittyä mukaan omalla puhelimellaan.",
        question: "Miten järjestäjä perustaa tapahtuman?",
      },
      {
        answer:
          "Skanneri tarvitsee verkkoyhteyden, koska jokainen leima tarkistetaan reaaliajassa taustajärjestelmästä. Näin tuplaleimat ja kuvakaappaukset eivät pääse läpi.",
        question: "Toimiiko skannaus ilman nettiyhteyttä?",
      },
      {
        answer:
          "Mikä tahansa älypuhelin tai tabletti riittää. Yritys kirjautuu selaimella tai sovelluksella ja voi skannata QR-koodeja heti – erillistä laitehankintaa ei tarvita.",
        question: "Mitä laitteita yritys tarvitsee skannaukseen?",
      },
      {
        answer:
          "Pilotin aikana käyttöönotto on kumppaniyrityksille maksuton. Jatkosta sovitaan yhdessä pilottikeskustelussa – ota yhteyttä niin käydään se läpi.",
        question: "Onko palvelu maksullinen?",
      },
    ],
    heroTitle: "Leimat ja palkinnot yhdessä digitaalisessa passissa.",
    interestHref,
    interestLabel: "Seuraa @omaleima",
    localeLabel: "FI",
    localeSwitchHref: "/en",
    localeSwitchLabel: "In English",
    metaDescription:
      "OmaLeima on digitaalinen leimapassi opiskelijatapahtumiin, approihin, QR-rastituksiin, palkintoihin ja tapahtumien järjestämiseen.",
    navItems: [
      { href: "#flow", label: "Toiminta" },
      { href: "#culture", label: "Kulttuuri" },
      { href: "#event-day", label: "Tapahtumapäivä" },
      { href: "/contact", label: "Yhteys" },
      { href: "/apply", label: "Hae mukaan" },
    ],
    ogLocale: "fi_FI",
    productTitle: "Tehty approihin, rastipisteisiin ja palkintohetkiin – kaiken pitää sujua kevyesti puhelimessa.",
    sectionLabel: "Tehty opiskelijakulttuuria varten",
    statItems: [
      { label: "QR-varmistetut rastit", value: "Live" },
      { label: "Paperiton tapahtumavirta", value: "Ilman kortteja" },
      { label: "Opiskelijalähtöiset palkinnot", value: "Palkinnot" },
    ],
    storyItems: [
      {
        body: "Opiskelijat kiertävät rasteja aikarajatulla QR-koodilla ilman helposti katoavaa tai kastuvaa paperikorttia.",
        title: "Ilta sujuu kevyemmin",
      },
      {
        body: "Yritykset skannaavat nopeasti, välttävät tuplaleimat ja pitävät jonon liikkeessä ilman manuaalisia tarkistuksia.",
        title: "Skannaus pysyy sujuvana",
      },
      {
        body: "Järjestäjät näkevät palkintojen etenemisen, tiedotteet ja rastit yhdestä selkeästä näkymästä.",
        title: "Klubi pysyy hallinnassa",
      },
    ],
    supportItems: [
      {
        body: "Tuo klubit, opiskelijajärjestöt ja yrityskumppanit samaan tapahtumapäivän järjestelmään ilman erillisiä ratkaisuja.",
        title: "Helppo käyttöönotto",
      },
      {
        body: "Palkintorajojen eteneminen, yritysten osallistuminen ja tiedotteet pysyvät näkyvillä koko tapahtuman ajan.",
        title: "Palkinnot näkyvillä",
      },
      {
        body: "Dynaamiset QR-koodit päivittyvät jatkuvasti, mikä estää kuvakaappausten ja jaettujen passien käytön.",
        title: "Väärinkäytösten esto",
      },
      {
        body: "Seuraa aktiivisia yrityksiä, kokonaisskannauksia ja opiskelijoiden osallistumista livenä koko illan ajan.",
        title: "Reaaliaikainen seuranta",
      },
    ],
    timelineItems: [
      {
        body: "Opiskelija liittyy tapahtumaan ja saa dynaamisen QR-koodin, joka on sidottu kyseiseen tapahtumaan.",
        step: "01",
        title: "Liity tapahtumaan",
      },
      {
        body: "Yrityksen henkilökunta skannaa QR-koodin, ja järjestelmä tarkistaa ajan, säännöt ja tuplaleimasuojan.",
        step: "02",
        title: "Kerää leimoja",
      },
      {
        body: "Opiskelija avaa merkin, haalarimerkin tai muun palkinnon, kun leimaraja täyttyy.",
        step: "03",
        title: "Lunasta palkinto",
      },
    ],
  },
};

export const getPublicLandingContent = (locale: PublicLocale): PublicLandingContent =>
  publicLandingContentByLocale[locale];
