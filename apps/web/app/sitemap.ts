import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3004";

// Public, SEO-relevant routes only (portal pages require auth).
const routes = ["", "/about", "/academics", "/admission", "/news", "/gallery", "/contact", "/login", "/pages"];

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return routes.map((r) => ({
        url: `${BASE}${r}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: r === "" ? 1 : 0.7,
    }));
}
