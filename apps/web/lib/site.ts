// lib/site.ts — canonical site facts used by metadata, JSON-LD, robots and
// the sitemap, so the URL and description live in one place.
export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://guzia-high-school.vercel.app";

export const SITE_NAME = "Guzia Bilateral High School";

export const EIIN = "119825";

export const SITE_TITLE = "Guzia Bilateral High School, Bogura | EIIN: 119825";

export const SITE_DESCRIPTION =
    "Guzia Bilateral High School, Bogura (EIIN: 119825) — a government-recognised secondary school for Classes 6–10 since 1958. Admissions, results, notices and the school's AI teaching toolkit.";

export const SCHOOL = {
    name: SITE_NAME,
    alternateName: ["Guzia High School", "গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়", "গুজিয়া উচ্চ বিদ্যালয়"],
    founded: "1958",
    street: "Guzia, Shibganj",
    city: "Bogura",
    region: "Rajshahi",
    country: "BD",
    phone: "+8801945411140",
    eiin: EIIN,
    image: "/images/campus.jpg",
};

export const PUBLIC_ROUTES = [
    { path: "", title: SITE_NAME, priority: 1 },
    { path: "/about", title: "About the school", priority: 0.8 },
    { path: "/academics", title: "Academics", priority: 0.9 },
    { path: "/admission", title: "Admission", priority: 0.9 },
    { path: "/news", title: "News & events", priority: 0.8 },
    { path: "/gallery", title: "Gallery", priority: 0.5 },
    { path: "/contact", title: "Contact", priority: 0.6 },
];
