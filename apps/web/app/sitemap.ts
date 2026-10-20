import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return PUBLIC_ROUTES.map((route) => ({
        url: `${SITE_URL}${route.path}`,
        lastModified: now,
        changeFrequency: route.path === "" || route.path === "/news" ? "weekly" : "monthly",
        priority: route.priority,
    }));
}
