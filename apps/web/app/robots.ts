import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3004";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/teacher", "/student", "/parent", "/api"] }],
        sitemap: `${BASE}/sitemap.xml`,
    };
}
