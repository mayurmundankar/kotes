import type { MetadataRoute } from "next";

const site = process.env.SITE_URL ?? "https://kotes.mayurmundankar.com";

// Only the public pages; everything else needs an account.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${site}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
