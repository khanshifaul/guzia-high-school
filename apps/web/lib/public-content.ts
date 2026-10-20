// lib/public-content.ts — one source of truth for what the public site
// announces. The homepage "Upcoming Events", the /news feed and the notice
// ticker all read these lists, so they cannot drift apart.

export interface PublicEvent {
    type: "EXAM" | "MEETING" | "EVENT" | "HOLIDAY";
    title: string;
    date: string;
    color: string;
}

/** School calendar shown on the homepage and in /news. */
export const PUBLIC_EVENTS: PublicEvent[] = [
    {
        type: "MEETING",
        title: "Parent-Teacher Meeting",
        date: "2026-10-25",
        color: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    },
    {
        type: "EXAM",
        title: "Half-Yearly Examination",
        date: "2026-11-10",
        color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    {
        type: "EVENT",
        title: "Annual Science Fair",
        date: "2026-12-05",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    {
        type: "HOLIDAY",
        title: "Victory Day Holiday",
        date: "2026-12-16",
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
];

export interface PublicNewsItem {
    tag: "Academic" | "Event" | "Notice";
    date: string;
    title: string;
    titleBn: string;
    excerpt: string;
    excerptBn: string;
}

/** Editorial highlights below the live notices in /news. */
export const PUBLIC_NEWS: PublicNewsItem[] = [
    {
        tag: "Academic",
        date: "2026-09-15",
        title: "SSC 2026 Results — 100% Pass Rate",
        titleBn: "এসএসসি ২০২৬ ফলাফল — ১০০% উত্তীর্ণ",
        excerpt:
            "Congratulations to all SSC candidates. Guzia High School achieved a 100% pass rate with a record number of GPA-5.",
        excerptBn:
            "সকল এসএসসি পরীক্ষার্থীকে অভিনন্দন। গুজিয়া উচ্চ বিদ্যালয় রেকর্ড GPA-5 সহ ১০০% উত্তীর্ণ হয়েছে।",
    },
    {
        tag: "Event",
        date: "2026-08-20",
        title: "Annual Sports Day 2026",
        titleBn: "বার্ষিক ক্রীড়া দিবস ২০২৬",
        excerpt: "Our annual sports day was held on the school field with track and field events for all classes.",
        excerptBn: "আমাদের বার্ষিক ক্রীড়া দিবস স্কুল মাঠে অনুষ্ঠিত হয়েছে, সকল শ্রেণির জন্য ট্র্যাক ও ফিল্ড ইভেন্ট।",
    },
    {
        tag: "Notice",
        date: "2026-08-01",
        title: "Half-Yearly Examination Schedule Published",
        titleBn: "অর্ধবার্ষিক পরীক্ষার রুটিন প্রকাশিত",
        excerpt: "The half-yearly examination routine for classes 6–10 is now available. Check the notices section for details.",
        excerptBn: "৬ষ্ঠ থেকে ১০ম শ্রেণির অর্ধবার্ষিক পরীক্ষার রুটিন এখন পাওয়া যাচ্ছে। বিস্তারিত জানতে বিজ্ঞপ্তি দেখুন।",
    },
    {
        tag: "Event",
        date: "2026-07-10",
        title: "Science Fair & Exhibition",
        titleBn: "বিজ্ঞান মেলা ও প্রদর্শনী",
        excerpt: "Students showcased working models in physics, chemistry, and biology at our annual science fair.",
        excerptBn: "শিক্ষার্থীরা বার্ষিক বিজ্ঞান মেলায় পদার্থবিজ্ঞান, রসায়ন ও জীববিজ্ঞানের কার্যকর মডেল উপস্থাপন করেছে।",
    },
];

/** The nearest event that has not passed yet (falls back to the first). */
export function nextEvent(reference: Date = new Date()): PublicEvent {
    const sorted = [...PUBLIC_EVENTS].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.find((event) => new Date(event.date) >= reference) ?? sorted[0];
}
