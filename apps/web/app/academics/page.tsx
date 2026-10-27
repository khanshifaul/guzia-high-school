"use client";

// app/academics/page.tsx — public Academics page: programs, subjects offered,
// and teaching approach. The programs and facilities grids come from
// GET /pages/academics; the intro reads the page title, so nothing here keeps
// its own copy of the streams.

import * as React from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { PageUnavailable } from "@/components/public/page-unavailable";
import { useLanguage } from "@/lib/language-context";
import { blockOf, usePage } from "@/lib/pages";
import { bodyFor, listOf, text, type BlockBody } from "@/lib/page-blocks";
import { resolveIcon } from "@/lib/icon-registry";

const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className={className}>
            {children}
        </motion.div>
    );
}

export default function AcademicsPage() {
    const { language, t } = useLanguage();
    const { page, loading } = usePage("academics");
    const tn = (en: string, bn: string) => t(en, bn);

    const body = (key: string): BlockBody | null => {
        const block = blockOf(page, key);
        return block ? bodyFor(block.kind, block.bodyEn, block.bodyBn, language) : null;
    };

    const programsBody = body("programs");
    const facilitiesBody = body("facilities");
    const unavailable = !loading && !page;

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <motion.div initial="hidden" animate="visible" variants={stagger}>
                            <motion.h1 variants={fadeIn} className="text-[clamp(2rem,5vw,3rem)] font-black tracking-tight text-foreground mb-3">
                                {page ? (language === "bn" ? page.titleBn || page.title : page.title) : tn("Academics", "একাডেমিক")}
                            </motion.h1>
                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-2xl mx-auto">
                                {tn("A structured national-curriculum education across three streams, grades 6 to 10.", "৬ষ্ঠ থেকে ১০ম শ্রেণি পর্যন্ত তিনটি স্ট্রিমে সংগঠিত জাতীয় পাঠ্যক্রম।")}
                            </motion.p>
                        </motion.div>
                    </div>
                </section>

                {unavailable ? (
                    <PageUnavailable />
                ) : (
                    <>
                        {/* Programs */}
                        {programsBody && (programsBody.items ?? []).length > 0 ? (
                            <section className="py-16 md:py-20">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-12">
                                            <motion.h2 variants={fadeIn} className="text-2xl font-black tracking-tight text-foreground mb-2">{text(programsBody.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">{text(programsBody.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {(programsBody.items ?? []).map((p, index) => {
                                                const Icon = resolveIcon(p.icon);
                                                return (
                                                    <motion.div key={`${text(p.title)}-${index}`} variants={fadeIn} className="relative group">
                                                        <div className="relative p-8 rounded-2xl border border-border/60 hover:border-primary/30 transition-colors">
                                                            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 mb-5 group-hover:bg-primary/20 transition-colors">
                                                                <Icon className="size-7 text-primary" />
                                                            </div>
                                                            <h3 className="text-xl font-black text-foreground mb-3">{text(p.title)}</h3>
                                                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{text(p.desc)}</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {listOf(p.subjects).map((s, subjectIndex) => (
                                                                    <Badge key={`${s}-${subjectIndex}`} className="bg-primary/10 text-primary border-primary/20 text-[9px]">{s}</Badge>
                                                                ))}
                                                            </div>
                                                            {text(programsBody.footnote) ? (
                                                                <div className="mt-6 pt-6 border-t border-border/40">
                                                                    <span className="text-xs font-bold text-primary uppercase tracking-widest">{text(programsBody.footnote)}</span>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                    </Reveal>
                                </div>
                            </section>
                        ) : null}

                        {/* Facilities / approach */}
                        {facilitiesBody && (facilitiesBody.items ?? []).length > 0 ? (
                            <section className="py-16 md:py-20 bg-primary/5 border-y border-border/60">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-12">
                                            <motion.h2 variants={fadeIn} className="text-2xl font-black tracking-tight text-foreground mb-2">{text(facilitiesBody.title)}</motion.h2>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {(facilitiesBody.items ?? []).map((f, index) => {
                                                const Icon = resolveIcon(f.icon);
                                                return (
                                                    <motion.div key={`${text(f.title)}-${index}`} variants={fadeIn}>
                                                        <Card className="h-full border-border/60 hover:border-primary/30 transition-colors">
                                                            <CardContent className="p-6 text-center">
                                                                <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary/10 mb-4 mx-auto">
                                                                    <Icon className="size-6 text-primary" />
                                                                </div>
                                                                <h3 className="font-bold text-foreground mb-1">{text(f.title)}</h3>
                                                                <p className="text-sm text-muted-foreground">{text(f.desc)}</p>
                                                            </CardContent>
                                                        </Card>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                    </Reveal>
                                </div>
                            </section>
                        ) : null}
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
}
