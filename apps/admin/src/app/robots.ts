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
      {
        allow: "/",
        disallow: ["/admin", "/api", "/auth", "/club", "/forbidden", "/login"],
        userAgent: ["GPTBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "Bingbot"],
      },
    ],
    sitemap: "https://omaleima.fi/sitemap.xml",
  };
}
