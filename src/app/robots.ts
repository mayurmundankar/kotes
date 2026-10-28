import type { MetadataRoute } from "next";

const site = process.env.SITE_URL ?? "https://kotes.mayurmundankar.com";

// AI training crawlers, AI search/answer bots and bulk scrapers. robots.txt is
// a request, not a wall: well-behaved bots obey it, and Cloudflare's "Block AI
// bots" setting enforces it at the edge for the rest (see README → Security).
const AI_AND_SCRAPERS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "Google-Extended", "GoogleOther", "Applebot-Extended", "PerplexityBot", "Perplexity-User", "CCBot",
  "Bytespider", "Amazonbot", "meta-externalagent", "meta-externalfetcher", "FacebookBot", "cohere-ai",
  "cohere-training-data-crawler", "Diffbot", "ImagesiftBot", "Omgilibot", "Omgili", "YouBot", "MistralAI-User",
  "DuckAssistBot", "AI2Bot", "Ai2Bot-Dolma", "PetalBot", "Timpibot", "Kangaroo Bot", "img2dataset", "Scrapy",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_AND_SCRAPERS, disallow: "/" },
      // Everyone else: the landing page and privacy policy only.
      { userAgent: "*", allow: ["/$", "/privacy", "/og.png"], disallow: ["/api/", "/login", "/onboarding", "/feed", "/library", "/you"] },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
