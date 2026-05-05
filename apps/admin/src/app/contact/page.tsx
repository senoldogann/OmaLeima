import type { Metadata } from "next";

import {
    getContactPageContent,
    getContactPageHref,
} from "@/features/public-site/contact-content";
import { PublicContactPage } from "@/features/public-site/contact-page";
import { publicSiteUrl } from "@/features/public-site/site-config";

const locale = "fi";
const content = getContactPageContent(locale);

export const metadata: Metadata = {
    alternates: {
        canonical: getContactPageHref(locale),
        languages: {
            en: getContactPageHref("en"),
            fi: getContactPageHref("fi"),
        },
    },
    description: content.metaDescription,
    openGraph: {
        description: content.metaDescription,
        locale: "fi_FI",
        title: content.metaTitle,
        type: "website",
        url: `${publicSiteUrl}${getContactPageHref(locale)}`,
    },
    robots: {
        follow: true,
        index: true,
    },
    title: content.metaTitle,
    twitter: {
        card: "summary_large_image",
        description: content.metaDescription,
        title: content.metaTitle,
    },
};

export default function ContactPageFi() {
    return <PublicContactPage locale={locale} />;
}
