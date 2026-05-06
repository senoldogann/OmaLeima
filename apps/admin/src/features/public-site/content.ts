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
      "OmaLeima muuttaa opiskelijatapahtumien leimakortit yhdeksi rauhalliseksi digitaaliseksi virraksi: QR-tarkistukset, palkintojen eteneminen ja selkeä tapahtumapäivän operointi.",
    eyebrow: "Digitaalinen leimapassi",
    footerAddressLabel: "Toimipaikan osoite",
    footerBusinessIdLabel: "Y-tunnus",
    footerCompanyLabel: "Yritystiedot",
    footerLegalItems: getPublicLegalLinks("fi"),
    footerLegalLabel: "Yleiset sivut",
    footerNote: "Rakennettu suomalaiseen opiskelijakulttuuriin. Pilottikeskustelut ovat avoinna.",
    footerPhoneLabel: "Puhelin",
    footerPostalLabel: "Postiosoite",
    heroTitle: "Leimat ja palkinnot yhdessä selkeässä virrassa.",
    interestHref,
    interestLabel: "Seuraa @omaleima",
    localeLabel: "FI",
    localeSwitchHref: "/en",
    localeSwitchLabel: "In English",
    metaDescription:
      "OmaLeima on digitaalinen leimapassi suomalaisiin opiskelijatapahtumiin, approihin, QR-tarkistuksiin, palkintoihin ja järjestäjien operointiin.",
    navItems: [
      { href: "#flow", label: "Toiminta" },
      { href: "#culture", label: "Kulttuuri" },
      { href: "#event-day", label: "Tapahtumapäivä" },
      { href: "/contact", label: "Yhteys" },
      { href: "/apply", label: "Hae mukaan" },
    ],
    ogLocale: "fi_FI",
    productTitle: "Rakennettu approihin, yrityspisteisiin ja palkintohetkiin, joiden pitäisi tuntua puhelimessa kevyiltä.",
    sectionLabel: "Rakennettu suomalaiseen opiskelijakulttuuriin",
    statItems: [
      { label: "QR-varmistetut checkpointit", value: "Live" },
      { label: "Paperiton tapahtumavirta", value: "Ilman kortteja" },
      { label: "Opiskelijalähtöiset palkinnot", value: "Palkinnot" },
    ],
    storyItems: [
      {
        body: "Opiskelijat kiertävät tapahtumaa aikarajatulla QR-koodilla ilman helposti rikkoutuvaa paperikorttia.",
        title: "Tapahtumailta tuntuu kevyemmältä",
      },
      {
        body: "Yritykset skannaavat nopeasti, välttävät tuplaleimat ja pitävät jonon liikkeessä ilman sekavia manuaalitarkistuksia.",
        title: "Skannaus pysyy sujuvana",
      },
      {
        body: "Järjestäjät näkevät palkintojen etenemisen, tiedotteet ja checkpointit yhdestä selkeästä hallintapinnasta.",
        title: "Klubi pysyy ohjaksissa",
      },
    ],
    supportItems: [
      {
        body: "Tuo klubit, opiskelijajärjestöt ja yrityskumppanit samaan tapahtumapäivän järjestelmään ilman irrallisia ad hoc -prosesseja.",
        title: "Järjestäjän käyttöönotto",
      },
      {
        body: "Palkintorajojen eteneminen, yritysten osallistuminen ja tiedotteet pysyvät näkyvillä koko tapahtuman ajan.",
        title: "Palkintojen näkyvyys",
      },
    ],
    timelineItems: [
      {
        body: "Opiskelija liittyy tapahtumaan ja saa dynaamisen QR-koodin, joka vastaa aktiivista tapahtumakontekstia.",
        step: "01",
        title: "Liity tapahtumaan",
      },
      {
        body: "Yrityksen henkilökunta skannaa QR-koodin, ja backend tarkistaa ajan, säännöt ja tuplaleimasuojan.",
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
