import type { MobileThemeMode } from "@/features/foundation/theme";

export type AppLanguage = "fi" | "en";

type CommonCopy = {
  retry: string;
  loading: string;
  error: string;
  standby: string;
  back: string;
  manage: string;
  remove: string;
  notifications: string;
  support: string;
  profile: string;
  events: string;
  rewards: string;
  leaderboard: string;
  myQr: string;
  business: string;
  student: string;
  signOut: string;
  signingOut: string;
  darkMode: string;
  lightMode: string;
  language: string;
  theme: string;
  finnish: string;
  english: string;
  active: string;
  official: string;
  custom: string;
  eventDetails: string;
};

type AuthCopy = {
  opening: string;
  openingMessage: string;
  continueEyebrow: string;
  studentSignIn: string;
  businessSignIn: string;
  studentHelper: string;
  businessHelper: string;
  googleButton: string;
  googleOpening: string;
  googlePreparing: string;
  googleReturning: string;
  googleRedirecting: string;
  businessEmail: string;
  businessPassword: string;
  businessEmailPlaceholder: string;
  businessPasswordPlaceholder: string;
  businessButton: string;
  businessSigningIn: string;
  businessCheckingAccess: string;
  callbackWaiting: string;
  callbackMissingCode: string;
  callbackRedirecting: string;
  callbackErrorTitle: string;
  callbackWarningTitle: string;
  callbackReadyTitle: string;
  callbackLoadingTitle: string;
  accessEyebrow: string;
  onboardingSlides: readonly {
    key: string;
    eyebrow: string;
    title: string;
    body: string;
  }[];
  swipeOrWait: string;
  brandHint: string;
};

type StudentCopy = {
  accessChecking: string;
  accessResolving: string;
  accessMissing: string;
  eventsTitle: string;
  eventsMeta: string;
  discoveryEyebrow: string;
  discoveryTitle: string;
  discoverySlides: readonly {
    key: string;
    title: string;
    body: string;
  }[];
  rewardsMeta: string;
  rewardTrail: string;
  noRewardProgress: string;
  browseEvents: string;
  leaderboardMeta: string;
  liveStandings: string;
  chooseEvent: string;
  profileMeta: string;
  departmentTags: string;
  notificationsMeta: string;
  eventDescription: string;
  eventDescriptionFallback: string;
  qrNoEventTitle: string;
  qrNoEventBody: string;
  qrOpenEvents: string;
};

type BusinessCopy = {
  accessChecking: string;
  accessResolving: string;
  accessMissing: string;
  homeMeta: string;
  eventsMeta: string;
  historyMeta: string;
  scannerMeta: string;
  profileMeta: string;
  live: string;
  upcoming: string;
  signedIn: string;
  openScanner: string;
  profileButton: string;
  scanHistory: string;
  manageEvents: string;
  joinedEvents: string;
  scannerQueue: string;
  joinedNext: string;
  availableToJoin: string;
  history: string;
  scanner: string;
  noActiveEvents: string;
};

type PreferencesCopy = {
  appearanceTitle: string;
  appearanceBody: string;
  languageTitle: string;
  languageBody: string;
};

export type MobileCopy = {
  common: CommonCopy;
  auth: AuthCopy;
  student: StudentCopy;
  business: BusinessCopy;
  preferences: PreferencesCopy;
};

export const mobileTranslations: Record<AppLanguage, MobileCopy> = {
  fi: {
    common: {
      retry: "Yritä uudelleen",
      loading: "Ladataan",
      error: "Virhe",
      standby: "Valmiustila",
      back: "Takaisin",
      manage: "Hallitse",
      remove: "Poista",
      notifications: "Ilmoitukset",
      support: "Tuki",
      profile: "Profiili",
      events: "Tapahtumat",
      rewards: "Palkinnot",
      leaderboard: "Tulostaulu",
      myQr: "Oma QR",
      business: "Yritys",
      student: "Opiskelija",
      signOut: "Kirjaudu ulos",
      signingOut: "Kirjaudutaan ulos...",
      darkMode: "Tumma",
      lightMode: "Vaalea",
      language: "Kieli",
      theme: "Teema",
      finnish: "Suomi",
      english: "English",
      active: "Aktiivinen",
      official: "Virallinen",
      custom: "Oma",
      eventDetails: "Tapahtuman tiedot",
    },
    auth: {
      opening: "Avataan OmaLeimaa",
      openingMessage: "Tarkistetaan istunto ja avataan oikea näkymä.",
      continueEyebrow: "Jatka",
      studentSignIn: "Opiskelijan sisäänkirjautuminen",
      businessSignIn: "Yrityksen sisäänkirjautuminen",
      studentHelper: "Avaa opiskelijanäkymä Google-tilillä.",
      businessHelper: "Avaa skannerityökalut henkilökunnan tunnuksilla.",
      googleButton: "Jatka Googlella",
      googleOpening: "Avataan Google...",
      googlePreparing: "Valmistellaan Google-kirjautumista.",
      googleReturning: "Palataan OmaLeimaan",
      googleRedirecting: "Odotetaan, että OmaLeima vastaanottaa Google-palautuksen.",
      businessEmail: "Yrityksen sähköposti",
      businessPassword: "Salasana",
      businessEmailPlaceholder: "scanner@example.com",
      businessPasswordPlaceholder: "Syötä nykyinen henkilökunnan salasana",
      businessButton: "Kirjaudu sähköpostilla",
      businessSigningIn: "Kirjaudutaan sisään...",
      businessCheckingAccess: "Tarkistetaan henkilökunnan oikeudet ja avataan työkalut.",
      callbackWaiting: "Odotetaan Supabasen OAuth-palautusta.",
      callbackMissingCode: "Kirjautumisen palautus tuli ilman valtuutuskoodia.",
      callbackRedirecting: "Kirjautuminen onnistui. Siirrytään oikeaan näkymään.",
      callbackErrorTitle: "Kirjautuminen ei onnistunut",
      callbackWarningTitle: "Kirjautuminen vaatii huomiota",
      callbackReadyTitle: "Kirjautuminen valmis",
      callbackLoadingTitle: "Viimeistellään kirjautumista",
      accessEyebrow: "Pääsy",
      onboardingSlides: [
        {
          key: "student-night",
          eyebrow: "Opiskelijoille",
          title: "Yksi sovellus koko approlle",
          body: "Löydä seuraava opiskelijailta, liity mukaan ja pidä QR valmiina ennen kuin saavut paikalle.",
        },
        {
          key: "venue-flow",
          eyebrow: "Yrityksille",
          title: "Sujuva leimaus ilman paperisäätöä",
          body: "Jokainen piste skannaa kerran, lukitsee tuloksen ja pitää jonon liikkeessä.",
        },
        {
          key: "club-view",
          eyebrow: "Järjestäjille",
          title: "Selkeä tapahtumailta alusta palkintoon",
          body: "Klubit pitävät yön hallussa samalla kun opiskelijat keräävät leimoja ympäri kaupunkia.",
        },
      ],
      swipeOrWait: "Pyyhkäise tai odota",
      brandHint: "Opiskelijaillat, live-QR ja leimat samassa paikassa.",
    },
    student: {
      accessChecking: "Tarkistetaan opiskelijan istunto.",
      accessResolving: "Varmistetaan, että tämä tili kuuluu opiskelijanäkymään.",
      accessMissing: "Tällä tilillä ei ole pääsyä opiskelijan mobiilinäkymään.",
      eventsTitle: "Tapahtumat",
      eventsMeta: "Löydä illat, liity mukaan ja seuraa missä leimat odottavat.",
      discoveryEyebrow: "Tapahtumavinkit",
      discoveryTitle: "Seuraava ilta alkaa tästä",
      discoverySlides: [
        {
          key: "city-routes",
          title: "Kaupunki täynnä leimapisteitä",
          body: "Liity tapahtumaan, kierrä pisteet ja pidä leimavauhti kasassa koko illan.",
        },
        {
          key: "venue-energy",
          title: "Yksi QR, koko ilta mukana",
          body: "Sama opiskelijailta, useita pisteitä ja palkinnot auki sitä mukaa kun leimoja kertyy.",
        },
        {
          key: "reward-path",
          title: "Leimoista palkintoihin",
          body: "Näet heti missä mennään, mitä puuttuu ja mikä palkinto on jo lunastettavissa.",
        },
      ],
      rewardsMeta: "Seuraa kerättyjä leimoja ja näe mitä palkintoja voit jo lunastaa.",
      rewardTrail: "Palkintopolku",
      noRewardProgress: "Leimat ja palkinnot näkyvät täällä ensimmäisen liittymisen jälkeen.",
      browseEvents: "Selaa tapahtumia",
      leaderboardMeta: "Seuraa tapahtuman kärkitilannetta ja omaa sijoitustasi.",
      liveStandings: "Live-tilanne",
      chooseEvent: "Valitse tapahtuma",
      profileMeta: "Pidä oma profiili valmiina seuraavaa tapahtumaa varten.",
      departmentTags: "Ainejärjestötagit",
      notificationsMeta: "Ota ilmoitukset käyttöön, jotta palkinnot ja tapahtumapäivän viestit tavoittavat tämän laitteen.",
      eventDescription: "Kuvaus",
      eventDescriptionFallback: "Järjestäjä ei ole vielä lisännyt tapahtumalle kuvausta.",
      qrNoEventTitle: "QR ei ole vielä käytössä",
      qrNoEventBody: "Liity ensin tapahtumaan. Kun rekisteröity tapahtuma on käynnissä, tähän avautuu pyörivä QR-koodi.",
      qrOpenEvents: "Avaa tapahtumat",
    },
    business: {
      accessChecking: "Tarkistetaan yrityksen istunto.",
      accessResolving: "Varmistetaan henkilökunnan oikeudet yritysnäkymään.",
      accessMissing: "Tällä tilillä ei ole aktiivista yritysoikeutta.",
      homeMeta: "Skanneri, liittyneet tapahtumat ja tapahtumapäivän tila samasta näkymästä.",
      eventsMeta: "Liity tuleviin iltoihin ja avaa skanneri, kun tapahtuma menee liveksi.",
      historyMeta: "Katso viimeisimmät skannaukset nopeasti ilman kameraa.",
      scannerMeta: "Valitse käynnissä oleva tapahtuma, skannaa kerran ja jatka jonon mukana.",
      profileMeta: "Pidä asetukset, kieli ja tukipyynnöt samassa paikassa.",
      live: "Käynnissä",
      upcoming: "Tulossa",
      signedIn: "kirjautunut sisään",
      openScanner: "Avaa skanneri",
      profileButton: "Avaa profiili",
      scanHistory: "Skannaushistoria",
      manageEvents: "Hallitse tapahtumia",
      joinedEvents: "Liitytyt tapahtumat",
      scannerQueue: "Skanneri",
      joinedNext: "Seuraavaksi",
      availableToJoin: "Liityttävissä",
      history: "Historia",
      scanner: "Skanneri",
      noActiveEvents: "Yhtään käynnissä olevaa tapahtumaa ei ole juuri nyt.",
    },
    preferences: {
      appearanceTitle: "Ulkoasu",
      appearanceBody: "Vaihda vaalean ja tumman näkymän välillä.",
      languageTitle: "Kieli",
      languageBody: "Suomi on oletus. Voit vaihtaa näkymän tarvittaessa englanniksi.",
    },
  },
  en: {
    common: {
      retry: "Retry",
      loading: "Loading",
      error: "Error",
      standby: "Standby",
      back: "Back",
      manage: "Manage",
      remove: "Remove",
      notifications: "Notifications",
      support: "Support",
      profile: "Profile",
      events: "Events",
      rewards: "Rewards",
      leaderboard: "Leaderboard",
      myQr: "My QR",
      business: "Business",
      student: "Student",
      signOut: "Sign out",
      signingOut: "Signing out...",
      darkMode: "Dark",
      lightMode: "Light",
      language: "Language",
      theme: "Theme",
      finnish: "Finnish",
      english: "English",
      active: "Active",
      official: "Official",
      custom: "Custom",
      eventDetails: "Event details",
    },
    auth: {
      opening: "Opening OmaLeima",
      openingMessage: "Checking your session and opening the right view.",
      continueEyebrow: "Continue",
      studentSignIn: "Student sign-in",
      businessSignIn: "Business sign-in",
      studentHelper: "Open the student area with Google.",
      businessHelper: "Open the scanner tools with staff credentials.",
      googleButton: "Continue with Google",
      googleOpening: "Opening Google...",
      googlePreparing: "Preparing the Google sign-in flow.",
      googleReturning: "Returning to OmaLeima",
      googleRedirecting: "Waiting for OmaLeima to receive the Google redirect.",
      businessEmail: "Business email",
      businessPassword: "Password",
      businessEmailPlaceholder: "scanner@example.com",
      businessPasswordPlaceholder: "Enter the current staff password",
      businessButton: "Sign in with email",
      businessSigningIn: "Signing in...",
      businessCheckingAccess: "Checking staff access and opening the tools.",
      callbackWaiting: "Waiting for the Supabase OAuth callback.",
      callbackMissingCode: "OAuth callback returned without an authorization code.",
      callbackRedirecting: "Sign-in completed. Redirecting to the right view.",
      callbackErrorTitle: "Sign-in could not finish",
      callbackWarningTitle: "Sign-in needs attention",
      callbackReadyTitle: "Sign-in complete",
      callbackLoadingTitle: "Completing sign-in",
      accessEyebrow: "Access",
      onboardingSlides: [
        {
          key: "student-night",
          eyebrow: "For students",
          title: "One app for the whole appro",
          body: "Find the next student night, join the route, and keep your QR ready before you arrive.",
        },
        {
          key: "venue-flow",
          eyebrow: "For venues",
          title: "Fast scanning without paper chaos",
          body: "Each venue scans once, locks the result, and keeps the queue moving.",
        },
        {
          key: "club-view",
          eyebrow: "For organizers",
          title: "A cleaner night from start to reward",
          body: "Clubs keep the event readable while students collect leimas across the city.",
        },
      ],
      swipeOrWait: "Swipe or wait",
      brandHint: "Student nights, live QR, and venue stamps in one place.",
    },
    student: {
      accessChecking: "Checking the student session.",
      accessResolving: "Confirming that this account belongs in the student area.",
      accessMissing: "This account does not currently have access to the student mobile area.",
      eventsTitle: "Events",
      eventsMeta: "Find the next nights out, join in, and see where the leimas are waiting.",
      discoveryEyebrow: "Event discovery",
      discoveryTitle: "Your next night starts here",
      discoverySlides: [
        {
          key: "city-routes",
          title: "A city full of leima stops",
          body: "Join an event, move through the route, and keep your progress alive all night.",
        },
        {
          key: "venue-energy",
          title: "One QR for the whole night",
          body: "One student event, many venues, and rewards that open as your leimas stack up.",
        },
        {
          key: "reward-path",
          title: "From leimas to rewards",
          body: "See what you have earned, what is missing, and what is already ready to claim.",
        },
      ],
      rewardsMeta: "Track collected leimas and see which rewards are ready to claim.",
      rewardTrail: "Reward trail",
      noRewardProgress: "Leimas and rewards appear here after your first joined event.",
      browseEvents: "Browse events",
      leaderboardMeta: "Track the live top rankings and your current place.",
      liveStandings: "Live standings",
      chooseEvent: "Choose event",
      profileMeta: "Keep your profile ready for the next event night.",
      departmentTags: "Department tags",
      notificationsMeta: "Turn on notifications so reward unlocks and event-day updates can reach this device.",
      eventDescription: "Description",
      eventDescriptionFallback: "The organizer has not added a description for this event yet.",
      qrNoEventTitle: "QR is not ready yet",
      qrNoEventBody: "Join an event first. Once a registered event is live, this screen starts showing the rotating QR.",
      qrOpenEvents: "Open events",
    },
    business: {
      accessChecking: "Checking the business session.",
      accessResolving: "Confirming staff access for the business area.",
      accessMissing: "This account does not currently have active business access.",
      homeMeta: "Scanner, joined events, and event-day status in one place.",
      eventsMeta: "Join upcoming nights and open the scanner when one goes live.",
      historyMeta: "Review recent scans quickly without keeping the camera open.",
      scannerMeta: "Choose the live event, scan once, confirm, and keep the line moving.",
      profileMeta: "Keep settings, language, and support in one place.",
      live: "Live",
      upcoming: "Upcoming",
      signedIn: "signed in",
      openScanner: "Open scanner",
      profileButton: "Open profile",
      scanHistory: "Scan history",
      manageEvents: "Manage events",
      joinedEvents: "Joined events",
      scannerQueue: "Scanner queue",
      joinedNext: "Joined next",
      availableToJoin: "Available to join",
      history: "History",
      scanner: "Scanner",
      noActiveEvents: "No active event is live right now.",
    },
    preferences: {
      appearanceTitle: "Appearance",
      appearanceBody: "Switch between light and dark mode.",
      languageTitle: "Language",
      languageBody: "Finnish is the primary view, but you can switch to English when needed.",
    },
  },
};

export const detectPreferredLanguage = (locale: string): AppLanguage =>
  locale.toLowerCase().startsWith("fi") ? "fi" : "en";

export const getLocaleTag = (language: AppLanguage): string =>
  language === "fi" ? "fi-FI" : "en-GB";

export const getThemeLabel = (language: AppLanguage, mode: MobileThemeMode): string => {
  const common = mobileTranslations[language].common;

  return mode === "light" ? common.lightMode : common.darkMode;
};
