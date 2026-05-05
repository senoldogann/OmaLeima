import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    host: "https://omaleima.fi",
    rules: [
      {
        allow: "/",
        disallow: ["/admin", "/api", "/auth", "/club", "/forbidden", "/login"],
        userAgent: "*",
      },
    ],
    sitemap: "https://omaleima.fi/sitemap.xml",
  };
}
