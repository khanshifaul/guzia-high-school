"use client";

// app/academics/page.tsx — public Academics page: programs, subjects offered,
// and teaching approach. Content mirrors the landing #programs section with
// more depth.

import * as React from "react";
import { motion } from "motion/react";
import { FaMicroscope, FaLaptopCode, FaBookOpen, FaChalkboardUser, FaFlask, FaCalendarCheck } from "react-icons/fa6";
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

const programs = [
    { icon: FaMicroscope, title: "Science", titleBn: "বিজ্ঞান", desc: "Science, ICT & advanced Mathematics for future scientists and engineers.", subjects: ["Physics", "Chemistry", "Biology", "Mathematics", "ICT"] },
    { icon: FaLaptopCode, title: "Commerce", titleBn: "বাণিজ্য", desc: "Accounting, Finance, Economics & Entrepreneurship for business leaders.", subjects: ["Accounting", "Finance", "Economics", "Business Entrepreneurship"] },
    { icon: FaBookOpen, title: "Arts", titleBn: "মানবিক", desc: "History, Literature & Social Studies for holistic thinkers.", subjects: ["Bangla", "English", "History", "Geography", "Civics"] },
];

const facilities = [
    { icon: FaFlask, title: "Science Labs", desc: "Fully equipped physics, chemistry & biology labs." },
    { icon: FaChalkboardUser, title: "Experienced Faculty", desc: "Qualified teachers dedicated to every student." },
    { icon: FaCalendarCheck, title: "Structured Schedule", desc: "Clear routines, exams, and parent meetings." },
];

export default function AcademicsPage() {
    const { t } = useLanguage();
    const tn = (en: string, bn: string) => t(en, bn);

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <motion.div initial="hidden" animate="visible" variants={stagger}>
                            <motion.h1 variants={fadeIn} className="text-[clamp(2rem,5vw,3rem)] font-black tracking-tight text-foreground mb-3">
                                {tn("Academics", "একাডেমিক")}
                            </motion.h1>
                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-2xl mx-auto">
                                {tn("A structured national-curriculum education across three streams, grades 6 to 10.", "৬ষষ্ঠ থেকে ১০ম শ্রেণি পর্যন্ত তিনটি স্ট্রিমে সংগঠিত জাতীয় পাঠ্যক্রম।")}
                            </motion.p>
                        </motion.div>
                    </div>
                </section>

                {/* Programs */}
                <section className="py-16 md:py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-12">
                                <motion.h2 variants={fadeIn} className="text-2xl font-black tracking-tight text-foreground mb-2">{tn("Academic Programs", "একাডেমিক প্রোগ্রাম")}</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">{tn("Explore our diverse range of academic streams.", "আমাদের বৈচিত্র্যময় একাডেমিক স্ট্রিমগুলি অন্বেষণ করুন।")}</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {programs.map((p) => (
                                    <motion.div key={p.title} variants={fadeIn} className="relative group">
                                        <div className="relative p-8 rounded-2xl border border-border/60 hover:border-primary/30 transition-colors">
                                            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 mb-5 group-hover:bg-primary/20 transition-colors">
                                                <p.icon className="size-7 text-primary" />
                                            </div>
                                            <h3 className="text-xl font-black text-foreground mb-3">{tn(p.title, p.titleBn)}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.desc}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {p.subjects.map((s) => (
                                                    <Badge key={s} className="bg-primary/10 text-primary border-primary/20 text-[9px]">{s}</Badge>
                                                ))}
                                            </div>
                                            <div className="mt-6 pt-6 border-t border-border/40">
                                                <span className="text-xs font-bold text-primary uppercase tracking-widest">Grades 6–10</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>

                {/* Facilities / approach */}
                <section className="py-16 md:py-20 bg-primary/5 border-y border-border/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-12">
                                <motion.h2 variants={fadeIn} className="text-2xl font-black tracking-tight text-foreground mb-2">{tn("How We Teach", "আমরা যেভাবে পড়াই")}</motion.h2>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {facilities.map((f) => (
                                    <motion.div key={f.title} variants={fadeIn}>
                                        <Card className="h-full border-border/60 hover:border-primary/30 transition-colors">
                                            <CardContent className="p-6 text-center">
                                                <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary/10 mb-4 mx-auto">
                                                    <f.icon className="size-6 text-primary" />
                                                </div>
                                                <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
                                                <p className="text-sm text-muted-foreground">{f.desc}</p>
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
