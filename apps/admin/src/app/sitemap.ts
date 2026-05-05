import type { MetadataRoute } from "next";

const lastModified = new Date("2026-05-05T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      alternates: {
        languages: {
          en: "https://omaleima.fi/en",
          fi: "https://omaleima.fi",
        },
      },
      changeFrequency: "weekly",
      lastModified,
      priority: 1,
      url: "https://omaleima.fi",
    },
    {
      alternates: {
        languages: {
          en: "https://omaleima.fi/en",
          fi: "https://omaleima.fi",
        },
      },
      changeFrequency: "weekly",
      lastModified,
      priority: 0.8,
      url: "https://omaleima.fi/en",
    },
    {
      alternates: {
        languages: {
          en: "https://omaleima.fi/en/privacy",
          fi: "https://omaleima.fi/privacy",
        },
      },
      changeFrequency: "monthly",
      lastModified,
      priority: 0.5,
      url: "https://omaleima.fi/privacy",
    },
    {
      alternates: {
        languages: {
          en: "https://omaleima.fi/en/terms",
          fi: "https://omaleima.fi/terms",
        },
      },
      changeFrequency: "monthly",
      lastModified,
      priority: 0.5,
      url: "https://omaleima.fi/terms",
    },
    {
      alternates: {
        languages: {
          en: "https://omaleima.fi/en/privacy",
          fi: "https://omaleima.fi/privacy",
        },
      },
      changeFrequency: "monthly",
      lastModified,
      priority: 0.4,
      url: "https://omaleima.fi/en/privacy",
    },
    {
      alternates: {
        languages: {
          en: "https://omaleima.fi/en/terms",
          fi: "https://omaleima.fi/terms",
        },
      },
      changeFrequency: "monthly",
      lastModified,
      priority: 0.4,
      url: "https://omaleima.fi/en/terms",
    },
    {
      alternates: {
        languages: {
          en: "https://omaleima.fi/en/contact",
          fi: "https://omaleima.fi/contact",
        },
      },
      changeFrequency: "monthly",
      lastModified,
      priority: 0.7,
      url: "https://omaleima.fi/contact",
    },
    {
      alternates: {
        languages: {
          en: "https://omaleima.fi/en/contact",
          fi: "https://omaleima.fi/contact",
        },
      },
      changeFrequency: "monthly",
      lastModified,
      priority: 0.6,
      url: "https://omaleima.fi/en/contact",
    },
  ];
}
