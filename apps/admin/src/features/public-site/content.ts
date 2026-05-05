import {
  getPublicLegalLinks,
  publicCompanyInfo,
  type PublicFooterLink,
  type PublicLocale,
} from "@/features/public-site/site-config";

export { publicSiteUrl, type PublicLocale } from "@/features/public-site/site-config";

export type PublicLandingContent = {
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
  growthModelFootnote: string;
  growthModelItems: ReadonlyArray<{
    body: string;
    eyebrow: string;
    title: string;
  }>;
  growthModelSubtitle: string;
  growthModelTitle: string;
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
    contactHref: "/en/contact",
    contactLabel: "Contact us",
    description:
      "OmaLeima turns Finnish student event stamp cards into a secure digital flow: QR checkpoints, reward progress, and calm event-day operations for organizers, clubs, venues, and students.",
    eyebrow: "Digital leima pass",
    footerAddressLabel: "Business address",
    footerBusinessIdLabel: "Business ID",
    footerCompanyLabel: "Company details",
    footerLegalItems: getPublicLegalLinks("en"),
    footerLegalLabel: "Legal",
    footerNote: "Built for Finnish student culture. Early pilot conversations are open.",
    footerPhoneLabel: "Phone",
    footerPostalLabel: "Mailing address",
    growthModelFootnote:
      "Pilot recommendation: keep the student app and organizer core free, then charge venues and sponsors for verified traffic, offer redemption, and post-event reporting.",
    growthModelItems: [
      {
        body: "Students get a reason to open the app before, during, and after the night: no lost stamp card, live progress, rewards, leaderboard, venue map, and timely announcements.",
        eyebrow: "Students",
        title: "Use it because the night is easier",
      },
      {
        body: "Clubs can run the paperless flow for free in the pilot, then use sponsor proof, venue performance, fraud control, and announcement reach to fund the event.",
        eyebrow: "Organizers",
        title: "Free core, sponsor-ready operations",
      },
      {
        body: "Venues pay for measurable student footfall: event participation, promoted reward slots, verified offer redemptions, and a clean report after the event.",
        eyebrow: "Businesses",
        title: "Revenue from verified student traffic",
      },
    ],
    growthModelSubtitle:
      "Students and clubs should not feel like the product is another cost. The business model works when OmaLeima proves attention, movement, and redemptions to venues.",
    growthModelTitle: "A pilot package that makes sense for Finland.",
    heroTitle: "Leimas and rewards in one system.",
    interestHref,
    interestLabel: "Follow @omaleima",
    localeLabel: "EN",
    localeSwitchHref: "/",
    localeSwitchLabel: "Suomeksi",
    metaDescription:
      "OmaLeima is a digital leima pass for Finnish student events, appro nights, QR checkpoints, rewards, and organizer operations.",
    navItems: [
      { href: "#culture", label: "Culture" },
      { href: "#flow", label: "Flow" },
      { href: "#model", label: "Model" },
      { href: "#event-day", label: "Event day" },
      { href: "/en/contact", label: "Contact" },
    ],
    ogLocale: "en_US",
    productTitle: "Built for appro nights, venues, and reward moments.",
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
        body: "Venues scan quickly, avoid duplicate stamps, and keep the line moving without confusing manual checks.",
        title: "Scanning stays operational",
      },
      {
        body: "Organizers follow reward progress, announcements, and checkpoints from one consistent control surface.",
        title: "Clubs stay in control",
      },
    ],
    supportItems: [
      {
        body: "Invite clubs, student unions, and venue partners into one event-day system without building custom ops each time.",
        title: "Organizer setup",
      },
      {
        body: "Reward milestones, venue participation, and event communication stay visible across the full event window.",
        title: "Reward visibility",
      },
    ],
    timelineItems: [
      {
        body: "Students join an event and receive a dynamic QR that represents the active event context.",
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
    contactHref: "/contact",
    contactLabel: "Ota yhteyttä",
    description:
      "OmaLeima muuttaa opiskelijatapahtumien leimakortit turvalliseksi digitaaliseksi virraksi: QR-tarkistukset, palkintojen eteneminen ja rauhallinen tapahtumapäivän operointi yhdessä paketissa.",
    eyebrow: "Digitaalinen leimapassi",
    footerAddressLabel: "Toimipaikan osoite",
    footerBusinessIdLabel: "Y-tunnus",
    footerCompanyLabel: "Yritystiedot",
    footerLegalItems: getPublicLegalLinks("fi"),
    footerLegalLabel: "Yleiset sivut",
    footerNote: "Rakennettu suomalaiseen opiskelijakulttuuriin. Pilottikeskustelut ovat avoinna.",
    footerPhoneLabel: "Puhelin",
    footerPostalLabel: "Postiosoite",
    growthModelFootnote:
      "Pilottisuositus: opiskelijasovellus ja järjestäjän peruskäyttö pidetään ilmaisena, ja tulot haetaan yrityksiltä sekä sponsoreilta mitattavan kävijävirran, lunastusten ja raportoinnin kautta.",
    growthModelItems: [
      {
        body: "Opiskelijalle syy avata sovellus syntyy illan aikana: ei kadonnutta paperikorttia, reaaliaikainen eteneminen, palkinnot, leaderboard, kartta ja tiedotteet.",
        eyebrow: "Opiskelijat",
        title: "Käyttö helpottaa iltaa",
      },
      {
        body: "Klubi voi ajaa paperittoman pilotin ilman perusmaksua ja näyttää sponsoreille yrityskohtaiset leimat, osallistujavirran, viestinnän ja väärinkäytön eston.",
        eyebrow: "Järjestäjät",
        title: "Ilmainen perusmalli, sponsorivalmis data",
      },
      {
        body: "Yritys maksaa mitattavasta opiskelijavirrasta: tapahtumapaikasta, näkyvästä palkintopaikasta, kuponkilunastuksista ja tapahtuman jälkiraportista.",
        eyebrow: "Yritykset",
        title: "Tulot todennetusta opiskelijaliikenteestä",
      },
    ],
    growthModelSubtitle:
      "Opiskelijoille ja klubeille tuotteen ei pidä tuntua uudelta kululta. Malli toimii, kun OmaLeima todistaa yrityksille huomion, liikkeen ja lunastukset.",
    growthModelTitle: "Suomeen sopiva pilottipaketti.",
    heroTitle: "Leimat ja palkinnot yhdessä.",
    interestHref,
    interestLabel: "Seuraa @omaleima",
    localeLabel: "FI",
    localeSwitchHref: "/en",
    localeSwitchLabel: "In English",
    metaDescription:
      "OmaLeima on digitaalinen leimapassi suomalaisiin opiskelijatapahtumiin, approihin, QR-tarkistuksiin, palkintoihin ja järjestäjien operointiin.",
    navItems: [
      { href: "#culture", label: "Kulttuuri" },
      { href: "#flow", label: "Toiminta" },
      { href: "#model", label: "Malli" },
      { href: "#event-day", label: "Tapahtumapäivä" },
      { href: "/contact", label: "Yhteys" },
    ],
    ogLocale: "fi_FI",
    productTitle: "Rakennettu approihin, yrityksiin ja palkintohetkiin.",
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
        body: "Kutsu klubit, opiskelijajärjestöt ja yrityskumppanit samaan tapahtumapäivän järjestelmään ilman erillisiä ad hoc -prosesseja.",
        title: "Järjestäjän käyttöönotto",
      },
      {
        body: "Palkintorajojen eteneminen, yritysten osallistuminen ja tapahtumaviestintä pysyvät näkyvillä koko tapahtuman ajan.",
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
