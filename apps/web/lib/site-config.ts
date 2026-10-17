"use client";

// lib/site-config.ts — fetch the public site settings (name, EIIN, board,
// contact, socials, important links) once and share across header/footer.

import * as React from "react";

export interface ImportantLink {
    label: string;
    labelBn?: string;
    href: string;
}

export interface SiteConfig {
    schoolName: string;
    schoolNameBn: string;
    phone: string;
    hotline: string;
    email: string;
    eiin: string;
    board: string;
    address: string;
    addressBn: string;
    established: string;
    tagline: string;
    taglineBn: string;
    developedBy: string;
    developedByUrl: string;
    facebookUrl: string;
    twitterUrl: string;
    instagramUrl: string;
    youtubeUrl: string;
    linkedinUrl: string;
    websiteUrl: string;
    importantLinks: ImportantLink[];
}

const FALLBACK: SiteConfig = {
    schoolName: "Guzia High School",
    schoolNameBn: "গুজিয়া উচ্চ বিদ্যালয়",
    phone: "+880 1711-000000",
    hotline: "",
    email: "info@guziahs.edu",
    eiin: "123456",
    board: "Rajshahi Education Board",
    address: "Guzia, Bangladesh",
    addressBn: "গুজিয়া, বাংলাদেশ",
    established: "1958",
    tagline: "Excellence in Education Since 1958",
    taglineBn: "শিক্ষায় উৎকর্ষ ১৯৫৮ সাল থেকে",
    developedBy: "Shifaul Islam",
    developedByUrl: "https://shifaul.dev",
    facebookUrl: "",
    twitterUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    linkedinUrl: "",
    websiteUrl: "",
    importantLinks: [],
};

let cache: SiteConfig | null = null;
let inflight: Promise<SiteConfig> | null = null;

export async function getSiteConfig(): Promise<SiteConfig> {
    if (cache) return cache;
    if (!inflight) {
        inflight = fetch("/api/site-settings", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : FALLBACK))
            .then((d) => ({ ...FALLBACK, ...d }) as SiteConfig)
            .catch(() => FALLBACK)
            .finally(() => {
                inflight = null;
            });
    }
    const cfg = await inflight;
    cache = cfg;
    return cfg;
}

export function useSiteConfig(): SiteConfig {
    const [cfg, setCfg] = React.useState<SiteConfig>(FALLBACK);
    React.useEffect(() => {
        getSiteConfig().then(setCfg);
    }, []);
    return cfg;
}
