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
    mapEmbedUrl: string;
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
    mapEmbedUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14458.072901505664!2d89.30680657310677!3d25.05041884841201!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39fcfc81607202cf%3A0x3ebf373552deaa97!2sGuzia%20High%20School!5e0!3m2!1sen!2sbd!4v1792265333406!5m2!1sen!2sbd",
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
