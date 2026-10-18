"use client";

// app/news/page.tsx — public News & Events page: a feed of school news and
// upcoming events, plus the admin-published notices.

import * as React from "react";
import { motion } from "motion/react";
import { FaCalendarDays, FaNewspaper, FaTag } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useLanguage } from "@/lib/language-context";

const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className={className}>
            {children}
        </motion.div>
    );
}

const news = [
    {
        tag: "Academic",
        date: "2026-09-15",
        title: "SSC 2026 Results — 100% Pass Rate",
        titleBn: "এসএসসি ২০২৬ ফলাফল — ১০০% উত্তীর্ণ",
        excerpt: "Congratulations to all SSC candidates. Guzia High School achieved a 100% pass rate with a record number of GPA-5.",
        excerptBn: "সকল এসএসসি পরীক্ষার্থীকে অভিনন্দন। গুজিয়া উচ্চ বিদ্যালয় রেকর্ড GPA-5 সহ ১০০% উত্তীর্ণ হয়েছে।",
    },
    {
        tag: "Event",
        date: "2026-08-20",
        title: "Annual Sports Day 2026",
        titleBn: "বার্ষিক ক্রীড়া দিবস ২০২৬",
        excerpt: "Our annual sports day will be held on the school field with track and field events for all classes.",
        excerptBn: "আমাদের বার্ষিক ক্রীড়া দিবস স্কুল মাঠে অনুষ্ঠিত হবে, সকল শ্রেণির জন্য ট্র্যাক ও ফিল্ড ইভেন্ট।",
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

interface PublicNotice { id: string; title: string; body: string; createdAt: string }

export default function NewsPage() {
    const { language, t } = useLanguage();
    const [notices, setNotices] = React.useState<PublicNotice[]>([]);

    React.useEffect(() => {
        fetch("/api/notices/public", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((p) => { if (Array.isArray(p?.data)) setNotices(p.data); })
            .catch(() => setNotices([]));
    }, []);

    // Real admin-published global notices first, then static highlights.
    const items = [
        ...notices.map((n) => ({
            key: n.id, tag: "Notice", date: n.createdAt,
            title: n.title, titleBn: n.title, excerpt: n.body, excerptBn: n.body,
        })),
        ...news.map((n) => ({ key: n.title, ...n })),
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <motion.div initial="hidden" animate="visible" variants={stagger}>
                            <motion.h1 variants={fadeIn} className="text-[clamp(2rem,5vw,3rem)] font-black tracking-tight text-foreground mb-3">
                                {t("News & Events", "সংবাদ ও অনুষ্ঠান")}
                            </motion.h1>
                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-2xl mx-auto">
                                {t("The latest updates, achievements, and upcoming events from our school.", "আমাদের স্কুল থেকে সর্বশেষ আপডেট, সাফল্য ও আসন্ন অনুষ্ঠান।")}
                            </motion.p>
                        </motion.div>
                    </div>
                </section>

                <section className="py-16 md:py-20">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="space-y-6">
                                {items.map((n) => (
                                    <motion.div key={n.key} variants={fadeIn}>
                                        <Card className="border-border/60 hover:border-primary/30 transition-colors">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-wider">
                                                        <FaTag className="mr-1" size={9} /> {n.tag}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <FaCalendarDays size={11} /> {new Date(n.date).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                                    </span>
                                                </div>
                                                <h2 className="text-xl font-black text-foreground mb-2 flex items-center gap-2">
                                                    <FaNewspaper className="text-primary shrink-0" size={16} />
                                                    {language === "bn" ? n.titleBn : n.title}
                                                </h2>
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {language === "bn" ? n.excerptBn : n.excerpt}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
