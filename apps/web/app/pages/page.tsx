"use client";

// app/pages/page.tsx — legal & sitemap page: privacy policy, terms, and a
// sitemap of public routes.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FaShieldHalved, FaFileLines, FaSitemap } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useLanguage } from "@/lib/language-context";
import { useSiteConfig } from "@/lib/site-config";
import { blockOf, usePage } from "@/lib/pages";
import { bodyFor, text } from "@/lib/page-blocks";

const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };

export default function PagesPage() {
    const { language, t } = useLanguage();
    const cfg = useSiteConfig();
    const { page } = usePage("global");
    const sitemapBlock = blockOf(page, "sitemap-links");
    const sitemap = sitemapBlock
        ? bodyFor(sitemapBlock.kind, sitemapBlock.bodyEn, sitemapBlock.bodyBn, language)
        : null;
    const sitemapItems = sitemap?.items ?? [];

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <motion.div initial="hidden" animate="visible" variants={stagger}>
                            <motion.h1 variants={fadeIn} className="text-[clamp(2rem,5vw,3rem)] font-black tracking-tight text-foreground mb-3">
                                {t("Legal & Sitemap", "আইনি ও সাইটম্যাপ")}
                            </motion.h1>
                        </motion.div>
                    </div>
                </section>

                <section className="py-16 md:py-20">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                        {/* Privacy */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                            <Card className="border-border/60">
                                <CardContent className="p-6">
                                    <h2 className="font-black text-lg text-foreground mb-3 flex items-center gap-2">
                                        <FaShieldHalved className="text-primary" /> {t("Privacy Policy", "গোপনীয়তা নীতি")}
                                    </h2>
                                    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                                        <p>
                                            {t(
                                                `${cfg.schoolName} collects only the information needed to process admissions, manage student records, and respond to enquiries. Personal data is stored securely and never sold to third parties.`,
                                                `${cfg.schoolNameBn} শুধুমাত্র ভর্তি প্রক্রিয়া, শিক্ষার্থী রেকর্ড ব্যবস্থাপনা ও অনুসন্ধানের জন্য প্রয়োজনীয় তথ্য সংগ্রহ করে। ব্যক্তিগত তথ্য নিরাপদে সংরক্ষিত হয় এবং তৃতীয় পক্ষের কাছে বিক্রি করা হয় না।`,
                                            )}
                                        </p>
                                        <p>
                                            {t(
                                                "Students and guardians may request access to or correction of their records by contacting the school office.",
                                                "শিক্ষার্থী ও অভিভাবকরা স্কুল অফিসে যোগাযোগ করে তাদের রেকর্ড দেখতে বা সংশোধন করতে পারবেন।",
                                            )}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Terms */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                            <Card className="border-border/60">
                                <CardContent className="p-6">
                                    <h2 className="font-black text-lg text-foreground mb-3 flex items-center gap-2">
                                        <FaFileLines className="text-primary" /> {t("Terms of Use", "ব্যবহারের শর্ত")}
                                    </h2>
                                    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                                        <p>
                                            {t(
                                                "Information on this site is provided for general guidance. While we strive for accuracy, the school is not liable for decisions made solely on the basis of website content. Official records and notices prevail.",
                                                "এই ওয়েবসাইটের তথ্য সাধারণ নির্দেশনার জন্য প্রদত্ত। যথাযথ নির্ভুলতা থাকা সত্ত্বেও কেবল ওয়েবসাইটের উপর ভিত্তি করে সিদ্ধান্তের জন্য বিদ্যালয় দায়ী নয়। সরকারি রেকর্ড ও বিজ্ঞপ্তিই চূড়ান্ত।",
                                            )}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Sitemap */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                            <Card className="border-border/60">
                                <CardContent className="p-6">
                                    <h2 className="font-black text-lg text-foreground mb-3 flex items-center gap-2">
                                        <FaSitemap className="text-primary" /> {text(sitemap?.title, t("Sitemap", "সাইটম্যাপ"))}
                                    </h2>
                                    {sitemapItems.length > 0 ? (
                                        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                                            {sitemapItems.map((s, index) => (
                                                <li key={`${text(s.href)}-${index}`}>
                                                    <Link href={text(s.href, "/")} className="text-muted-foreground hover:text-primary transition-colors font-semibold">
                                                        {text(s.label)}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            {t("The sitemap is not published.", "সাইটম্যাপ প্রকাশিত হয়নি।")}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
