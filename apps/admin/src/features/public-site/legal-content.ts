import type { PublicLocale } from "@/features/public-site/site-config";
import { publicCompanyInfo } from "@/features/public-site/site-config";

export type LegalDocumentType = "privacy" | "terms";

type LegalSection = {
  bullets?: ReadonlyArray<string>;
  paragraphs: ReadonlyArray<string>;
  title: string;
};

export type LegalDocumentContent = {
  intro: string;
  metaDescription: string;
  sections: ReadonlyArray<LegalSection>;
  title: string;
  updatedAt: string;
};

const updatedAtByLocale: Record<PublicLocale, string> = {
  en: "May 5, 2026",
  fi: "5.5.2026",
};

const privacyByLocale: Record<PublicLocale, LegalDocumentContent> = {
  en: {
    intro:
      "This privacy notice explains how OmaLeima and T:mi Aslan Dogan Marketing process personal data on the public website, during pilot enquiries, and in early business communications.",
    metaDescription:
      "Privacy notice for OmaLeima public website and pilot enquiries.",
    sections: [
      {
        bullets: [
          `Controller: ${publicCompanyInfo.name}`,
          `Business ID: ${publicCompanyInfo.businessId}`,
          `Email: ${publicCompanyInfo.email}`,
          `Phone: ${publicCompanyInfo.phone}`,
          `Business address: ${publicCompanyInfo.address}`,
          `Mailing address: ${publicCompanyInfo.mailingAddress}`,
        ],
        paragraphs: [
          "The controller for this public website and related pilot communications is the Finnish sole trader listed below.",
        ],
        title: "1. Controller",
      },
      {
        bullets: [
          "Basic technical request data such as IP address, browser request metadata, and server log timestamps when you visit the public website.",
          "Contact details and message content when you contact us by email or through social media.",
          "Business and event context details that you share voluntarily when asking about pilots, club rollouts, or partnerships.",
        ],
        paragraphs: [
          "We only describe processing that is visible from the current public website and our direct communication channels.",
        ],
        title: "2. What data we process",
      },
      {
        bullets: [
          "Legitimate interest: to keep the public website available, secure, and abuse-resistant.",
          "Pre-contractual steps or legitimate interest: to answer pilot, partnership, and product enquiries.",
          "Legal obligation: to retain records when accounting, tax, or other Finnish legal duties require it.",
        ],
        paragraphs: [
          "We process personal data only for defined purposes and on an appropriate legal basis under the GDPR.",
        ],
        title: "3. Purposes and legal bases",
      },
      {
        bullets: [
          "Directly from you when you email us or contact us through linked channels.",
          "Automatically from your browser and hosting infrastructure when you load the website.",
        ],
        paragraphs: [
          "We do not state or rely on additional hidden data sources here.",
        ],
        title: "4. Data sources",
      },
      {
        bullets: [
          "Website hosting and infrastructure providers acting on our behalf.",
          "Email and communications providers where needed to receive and reply to your messages.",
          "Professional advisers or authorities if required by law or to protect legal rights.",
        ],
        paragraphs: [
          "We limit access to parties that need the data for the stated purpose.",
        ],
        title: "5. Recipients of data",
      },
      {
        paragraphs: [
          "The public website is hosted on infrastructure that may involve processing outside Finland. When personal data is transferred outside the EEA, we rely on the lawful transfer mechanism used by the relevant service provider, such as an adequacy decision or standard contractual clauses.",
        ],
        title: "6. International transfers",
      },
      {
        bullets: [
          "Technical logs are kept only for as long as needed for security, troubleshooting, and service continuity.",
          "Enquiry and pilot communication records are kept only for as long as the conversation, onboarding, or related business follow-up requires.",
          "Data may be retained longer where Finnish law, tax rules, or defence of legal claims requires it.",
        ],
        paragraphs: [
          "We do not keep personal data longer than necessary for the purpose for which it was collected.",
        ],
        title: "7. Retention",
      },
      {
        bullets: [
          "Right of access",
          "Right to rectification",
          "Right to erasure where applicable",
          "Right to restriction of processing",
          "Right to object to processing based on legitimate interest",
          "Right to data portability where applicable",
          "Right to lodge a complaint with the Finnish Data Protection Ombudsman",
        ],
        paragraphs: [
          `You can use your rights by contacting ${publicCompanyInfo.email}. We may need to verify your identity before acting on a request.`,
        ],
        title: "8. Your rights",
      },
      {
        paragraphs: [
          "We use proportionate technical and organisational safeguards such as access controls, limited access, and service-level security controls from our infrastructure providers.",
          "The public website currently does not advertise a separate analytics or marketing-cookie layer. If that changes materially, this notice should be updated.",
        ],
        title: "9. Security and changes",
      },
    ],
    title: "Privacy notice",
    updatedAt: updatedAtByLocale.en,
  },
  fi: {
    intro:
      "Tämä tietosuojaseloste kertoo, miten OmaLeima ja T:mi Aslan Dogan Marketing käsittelevät henkilötietoja julkisella verkkosivulla, pilottiyhteydenotoissa ja alkuvaiheen yritysviestinnässä.",
    metaDescription:
      "OmaLeiman julkisen sivuston ja pilottiyhteydenottojen tietosuojaseloste.",
    sections: [
      {
        bullets: [
          `Rekisterinpitäjä: ${publicCompanyInfo.name}`,
          `Y-tunnus: ${publicCompanyInfo.businessId}`,
          `Sähköposti: ${publicCompanyInfo.email}`,
          `Puhelin: ${publicCompanyInfo.phone}`,
          `Toimipaikan osoite: ${publicCompanyInfo.address}`,
          `Postiosoite: ${publicCompanyInfo.mailingAddress}`,
        ],
        paragraphs: [
          "Tämän julkisen verkkosivun ja siihen liittyvän pilottiviestinnän rekisterinpitäjä on alla kuvattu suomalainen toiminimi.",
        ],
        title: "1. Rekisterinpitäjä",
      },
      {
        bullets: [
          "Perustason tekniset pyyntötiedot, kuten IP-osoite, selaimen pyyntömetadata ja palvelinlokien aikaleimat, kun vierailet julkisella sivulla.",
          "Yhteystiedot ja viestin sisältö, kun otat meihin yhteyttä sähköpostilla tai sosiaalisen median kautta.",
          "Liiketoiminta- ja tapahtumakonteksti, jonka jaat vapaaehtoisesti kysyessäsi piloteista, klubikäytöstä tai kumppanuuksista.",
        ],
        paragraphs: [
          "Seloste kuvaa vain tämänhetkisen julkisen sivuston ja suorien yhteydenottokanavien kautta näkyvän käsittelyn.",
        ],
        title: "2. Käsiteltävät tiedot",
      },
      {
        bullets: [
          "Oikeutettu etu: julkisen sivuston toimivuus, turvallisuus ja väärinkäytösten torjunta.",
          "Sopimusta edeltävät toimet tai oikeutettu etu: pilotteihin, kumppanuuksiin ja tuotekyselyihin vastaaminen.",
          "Lakivelvoite: tietojen säilyttäminen silloin, kun kirjanpito, verotus tai muu Suomen laki sitä edellyttää.",
        ],
        paragraphs: [
          "Henkilötietoja käsitellään vain määriteltyihin tarkoituksiin ja aina asianmukaisella GDPR:n mukaisella perusteella.",
        ],
        title: "3. Käsittelyn tarkoitukset ja perusteet",
      },
      {
        bullets: [
          "Suoraan sinulta, kun lähetät meille sähköpostia tai otat yhteyttä linkitetyissä kanavissa.",
          "Automaattisesti selaimeltasi ja hosting-infrastruktuurista, kun lataat verkkosivun.",
        ],
        paragraphs: [
          "Seloste ei perustu piilotettuihin tai oletettuihin lisälähteisiin.",
        ],
        title: "4. Tietolähteet",
      },
      {
        bullets: [
          "Verkkosivun hosting- ja infrastruktuuritoimittajat henkilötietojen käsittelijöinä.",
          "Sähköposti- ja viestintäpalvelut silloin, kun niitä tarvitaan viestien vastaanottamiseen ja niihin vastaamiseen.",
          "Asiantuntijat tai viranomaiset, jos laki sitä vaatii tai oikeuksien puolustaminen sitä edellyttää.",
        ],
        paragraphs: [
          "Pääsy tietoihin rajataan vain niihin tahoihin, jotka tarvitsevat tietoja ilmoitettuun tarkoitukseen.",
        ],
        title: "5. Tietojen vastaanottajat",
      },
      {
        paragraphs: [
          "Julkinen verkkosivu toimii infrastruktuurilla, jossa henkilötietojen käsittelyä voi tapahtua Suomen ulkopuolella. Jos tietoja siirretään ETA-alueen ulkopuolelle, siirto perustuu asianmukaiseen lailliseen siirtomekanismiin, kuten riittävyyspäätökseen tai mallisopimuslausekkeisiin.",
        ],
        title: "6. Kansainväliset siirrot",
      },
      {
        bullets: [
          "Teknisiä lokeja säilytetään vain niin kauan kuin turvallisuus, vianmääritys ja palvelun jatkuvuus sitä edellyttävät.",
          "Yhteydenotto- ja pilottiviestintää säilytetään vain niin kauan kuin keskustelu, käyttöönoton arviointi tai siihen liittyvä liiketoiminnallinen jatko sitä vaatii.",
          "Tietoja voidaan säilyttää pidempään, jos Suomen laki, verosäännöt tai oikeusvaateiden puolustaminen sitä edellyttävät.",
        ],
        paragraphs: [
          "Tietoja ei säilytetä pidempään kuin niiden alkuperäinen käyttötarkoitus vaatii.",
        ],
        title: "7. Säilytysajat",
      },
      {
        bullets: [
          "Oikeus saada pääsy tietoihin",
          "Oikeus oikaista tietoja",
          "Oikeus tietojen poistamiseen soveltuvin osin",
          "Oikeus käsittelyn rajoittamiseen",
          "Oikeus vastustaa oikeutettuun etuun perustuvaa käsittelyä",
          "Oikeus siirtää tiedot järjestelmästä toiseen soveltuvin osin",
          "Oikeus tehdä valitus tietosuojavaltuutetulle",
        ],
        paragraphs: [
          `Voit käyttää oikeuksiasi ottamalla yhteyttä osoitteeseen ${publicCompanyInfo.email}. Pyynnön käsittelyssä voidaan joutua varmistamaan henkilöllisyytesi.`,
        ],
        title: "8. Rekisteröidyn oikeudet",
      },
      {
        paragraphs: [
          "Käytämme suhteellisia teknisiä ja organisatorisia suojatoimia, kuten käyttöoikeuksien rajausta, vähimmän tarpeen mukaista pääsyä ja infrastruktuuritoimittajien suojausratkaisuja.",
          "Julkisella sivustolla ei tällä hetkellä kuvata erillistä analytiikka- tai markkinointievästekerrosta. Jos tämä muuttuu olennaisesti, seloste pitää päivittää.",
        ],
        title: "9. Tietoturva ja muutokset",
      },
    ],
    title: "Tietosuojaseloste",
    updatedAt: updatedAtByLocale.fi,
  },
};

const termsByLocale: Record<PublicLocale, LegalDocumentContent> = {
  en: {
    intro:
      "These terms govern the public OmaLeima website, early pilot enquiries, and other pre-contract information channels unless a separate written agreement is made with an organiser, club, or business partner.",
    metaDescription: "Terms of use for the OmaLeima public website and pilot enquiries.",
    sections: [
      {
        paragraphs: [
          "These terms apply to the public website located at omaleima.fi and to the informational, contact, and pilot-enquiry use of the OmaLeima service before any separate commercial agreement is signed.",
        ],
        title: "1. Scope",
      },
      {
        bullets: [
          publicCompanyInfo.name,
          `Business ID: ${publicCompanyInfo.businessId}`,
          `Email: ${publicCompanyInfo.email}`,
          `Phone: ${publicCompanyInfo.phone}`,
          `Address: ${publicCompanyInfo.address}`,
        ],
        paragraphs: [
          "The service provider of the public website is the Finnish sole trader listed below.",
        ],
        title: "2. Service provider",
      },
      {
        paragraphs: [
          "The public website describes OmaLeima, a digital leima-pass concept for Finnish student events, appro nights, venue checkpoints, and reward operations.",
          "The website itself does not currently provide a consumer checkout flow or paid end-user subscription on these public pages.",
        ],
        title: "3. Service description",
      },
      {
        bullets: [
          "Use the website lawfully and do not interfere with its security or availability.",
          "Provide accurate information when you contact us about pilots, partnerships, or demos.",
          "Do not copy, scrape, reverse engineer, or misuse the site or its content in a way that breaches law or our rights.",
        ],
        paragraphs: [
          "You are responsible for your own devices, connections, and any information that you choose to submit to us.",
        ],
        title: "4. Acceptable use",
      },
      {
        paragraphs: [
          "The OmaLeima name, brand elements, website copy, visuals, and other content are protected by intellectual property rights and may not be used beyond what law permits without prior permission.",
        ],
        title: "5. Intellectual property",
      },
      {
        paragraphs: [
          "We may update, suspend, or change the public website or its content at any time for operational, legal, or product reasons.",
          "We aim for a reliable service but do not promise uninterrupted availability of the public site.",
        ],
        title: "6. Availability and changes",
      },
      {
        paragraphs: [
          "The public website is provided on an information basis. To the extent permitted by mandatory law, we are not liable for indirect or consequential losses arising from use of the public website or reliance on its content.",
          "Nothing in these terms limits liability where such limitation would be unlawful under mandatory Finnish law.",
        ],
        title: "7. Liability",
      },
      {
        paragraphs: [
          "Processing of personal data is described in the OmaLeima privacy notice. If there is a conflict between privacy-specific wording and these terms, the privacy notice governs personal-data handling questions.",
        ],
        title: "8. Privacy",
      },
      {
        bullets: [
          "Finnish law applies.",
          "Please contact us first so that we can try to resolve any issue directly.",
          "If the matter concerns a consumer relationship, you may then contact Finnish Consumer Advisory Services and, if needed, the Consumer Disputes Board.",
          "The EU Online Dispute Resolution platform was discontinued on July 20, 2025 and is no longer available as a dispute channel.",
        ],
        paragraphs: [
          "Any mandatory consumer rights available under Finnish law remain unaffected.",
        ],
        title: "9. Governing law and disputes",
      },
    ],
    title: "Terms of use",
    updatedAt: updatedAtByLocale.en,
  },
  fi: {
    intro:
      "Nämä ehdot koskevat OmaLeiman julkista verkkosivua, varhaisen vaiheen pilottiyhteydenottoja ja muuta sopimusta edeltävää tiedonvaihtoa, ellei järjestäjän, klubin tai yrityskumppanin kanssa tehdä erillistä kirjallista sopimusta.",
    metaDescription: "OmaLeiman julkisen verkkosivun ja pilottiyhteydenottojen käyttöehdot.",
    sections: [
      {
        paragraphs: [
          "Ehdot koskevat julkista omaleima.fi-verkkosivua sekä OmaLeima-palvelun esittely-, yhteydenotto- ja pilotointikäyttöä ennen mahdollista erillistä kaupallista sopimusta.",
        ],
        title: "1. Soveltamisala",
      },
      {
        bullets: [
          publicCompanyInfo.name,
          `Y-tunnus: ${publicCompanyInfo.businessId}`,
          `Sähköposti: ${publicCompanyInfo.email}`,
          `Puhelin: ${publicCompanyInfo.phone}`,
          `Osoite: ${publicCompanyInfo.address}`,
        ],
        paragraphs: [
          "Julkisen verkkosivun palveluntarjoaja on alla kuvattu suomalainen toiminimi.",
        ],
        title: "2. Palveluntarjoaja",
      },
      {
        paragraphs: [
          "Julkinen verkkosivu esittelee OmaLeimaa, joka on digitaalinen leimapassikonsepti suomalaisiin opiskelijatapahtumiin, approihin, yrityscheckpointeihin ja palkintovirtoihin.",
          "Näillä julkisilla sivuilla ei tällä hetkellä ole kuluttajille suunnattua verkkokauppaa tai maksullista loppukäyttäjätilausta.",
        ],
        title: "3. Palvelun kuvaus",
      },
      {
        bullets: [
          "Käytä sivustoa lainmukaisesti äläkä häiritse sen turvallisuutta tai saatavuutta.",
          "Anna oikeat tiedot, jos otat meihin yhteyttä piloteista, kumppanuuksista tai demoista.",
          "Älä kopioi, kaavi, takaisinmallinna tai muuten käytä sivustoa tai sen sisältöä tavalla, joka rikkoo lakia tai oikeuksiamme.",
        ],
        paragraphs: [
          "Vastaat omista laitteistasi, yhteyksistäsi ja meille vapaaehtoisesti antamistasi tiedoista.",
        ],
        title: "4. Sallittu käyttö",
      },
      {
        paragraphs: [
          "OmaLeima-nimi, brändielementit, verkkosivun tekstit, visuaalit ja muu sisältö ovat immateriaalioikeuksien suojaamia, eikä niitä saa käyttää ilman lupaa muuten kuin lain sallimissa rajoissa.",
        ],
        title: "5. Immateriaalioikeudet",
      },
      {
        paragraphs: [
          "Voimme päivittää, keskeyttää tai muuttaa julkista verkkosivua tai sen sisältöä milloin tahansa operatiivisista, oikeudellisista tai tuotekehityksellisistä syistä.",
          "Tavoitteena on luotettava palvelu, mutta emme takaa julkisen sivuston keskeytyksetöntä saatavuutta.",
        ],
        title: "6. Saatavuus ja muutokset",
      },
      {
        paragraphs: [
          "Julkinen verkkosivu tarjotaan tiedollisessa tarkoituksessa. Pakottavan lainsäädännön sallimissa rajoissa emme vastaa julkisen verkkosivun käytöstä tai sen sisältöön luottamisesta aiheutuvista välillisistä tai epäsuorista vahingoista.",
          "Mikään näissä ehdoissa ei rajoita vastuuta tilanteessa, jossa rajoitus olisi pakottavan Suomen lain vastainen.",
        ],
        title: "7. Vastuunrajoitus",
      },
      {
        paragraphs: [
          "Henkilötietojen käsittely kuvataan OmaLeiman tietosuojaselosteessa. Jos tietosuojakysymyksessä on ristiriita tämän sivun ja tietosuojaselosteen välillä, tietosuojaselostetta sovelletaan henkilötietojen käsittelyyn.",
        ],
        title: "8. Tietosuoja",
      },
      {
        bullets: [
          "Sovellettava laki on Suomen laki.",
          "Ota ensin yhteyttä meihin, jotta voimme yrittää ratkaista asian suoraan.",
          "Jos asia liittyy kuluttajasuhteeseen, voit sen jälkeen olla yhteydessä Kuluttajaneuvontaan ja tarvittaessa Kuluttajariitalautakuntaan.",
          "EU:n verkkovälitteinen riidanratkaisufoorumi (ODR) poistui käytöstä 20.7.2025 eikä ole enää käytettävissä riitakanavana.",
        ],
        paragraphs: [
          "Pakottavan Suomen kuluttajansuojalainsäädännön mukaiset oikeudet säilyvät aina ennallaan.",
        ],
        title: "9. Sovellettava laki ja riidat",
      },
    ],
    title: "Käyttöehdot",
    updatedAt: updatedAtByLocale.fi,
  },
};

export const getLegalDocumentContent = (
  locale: PublicLocale,
  documentType: LegalDocumentType
): LegalDocumentContent => {
  if (documentType === "privacy") {
    return privacyByLocale[locale];
  }

  return termsByLocale[locale];
};
