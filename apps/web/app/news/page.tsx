"use client";

// app/news/page.tsx — public News & Events page: a feed of school news and
// upcoming events, plus the admin-published notices.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FaCalendarDays, FaNewspaper, FaTag } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useLanguage } from "@/lib/language-context";
import { PUBLIC_EVENTS, PUBLIC_NEWS, type PublicEvent } from "@/lib/public-content";

const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className={className}>
            {children}
        </motion.div>
    );
}

const EVENT_TYPE_BN: Record<PublicEvent["type"], string> = {
    EXAM: "পরীক্ষা",
    MEETING: "সভা",
    EVENT: "অনুষ্ঠান",
    HOLIDAY: "ছুটি",
};

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
    interface FeedItem {
        key: string;
        tag: string;
        date: string;
        title: string;
        titleBn: string;
        excerpt: string;
        excerptBn: string;
        href?: string;
    }
    const items: FeedItem[] = [
        ...notices.map((n) => ({
            key: n.id, tag: "Notice", date: n.createdAt,
            title: n.title, titleBn: n.title, excerpt: n.body, excerptBn: n.body,
            href: `/news/${n.id}`,
        })),
        ...PUBLIC_EVENTS.map((e) => ({
            key: `event-${e.title}`,
            tag: "Event" as const,
            date: e.date,
            title: e.title,
            titleBn: e.title,
            excerpt: `School calendar — ${e.type.toLowerCase()} on ${new Date(e.date).toLocaleDateString("en-GB")}.`,
            excerptBn: `স্কুল ক্যালেন্ডার — ${new Date(e.date).toLocaleDateString("bn-BD")} তারিখে ${EVENT_TYPE_BN[e.type]}।`,
            href: "/news",
        })),
        ...PUBLIC_NEWS.map((n) => ({ key: n.title, ...n })),
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
                                {items.map((n) => {
                                    const card = (
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
                                                {n.href ? (
                                                    <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-primary">Read notice →</p>
                                                ) : null}
                                            </CardContent>
                                        </Card>
                                    );
                                    return (
                                        <motion.div key={n.key} variants={fadeIn}>
                                            {n.href ? (
                                                <Link href={n.href} className="block">
                                                    {card}
                                                </Link>
                                            ) : (
                                                card
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
