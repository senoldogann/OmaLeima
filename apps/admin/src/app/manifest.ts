import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#000000",
    description: "Digital leima pass for Finnish student overalls events.",
    display: "standalone",
    icons: [
      {
        sizes: "512x512",
        src: "/images/omaleima-logo-512.png",
        type: "image/png",
      },
      {
        sizes: "1024x1024",
        src: "/images/omaleima-logo.png",
        type: "image/png",
      },
    ],
    lang: "fi",
    name: "OmaLeima",
    short_name: "OmaLeima",
    start_url: "/",
    theme_color: "#c8ff47",
  };
}
