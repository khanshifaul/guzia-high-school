"use client";

// app/about/page.tsx — public About page: history, mission/vision, principal,
// achievements. Content from site config + the BD-school reference patterns.

import * as React from "react";
import { motion } from "motion/react";
import { FaGraduationCap, FaBullseye, FaEye, FaHeart, FaTrophy, FaAward, FaStar, FaUsers } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useLanguage } from "@/lib/language-context";
import { useSiteConfig } from "@/lib/site-config";

const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className={className}>
            {children}
        </motion.div>
    );
}

const achievements = [
    { icon: FaTrophy, title: "National Rank #3", desc: "National Science Olympiad 2025" },
    { icon: FaAward, title: "100% Pass Rate", desc: "SSC Board Examination 2025" },
    { icon: FaStar, title: "Best School Award", desc: "Upazila Education Excellence 2024" },
    { icon: FaUsers, title: "Gold Medal Debate", desc: "National Inter-School Championship 2025" },
];

export default function AboutPage() {
    const { t } = useLanguage();
    const cfg = useSiteConfig();
    const tn = (en: string, bn: string) => t(en, bn);

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                {/* Hero */}
                <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <motion.div initial="hidden" animate="visible" variants={stagger}>
                            <motion.h1 variants={fadeIn} className="text-[clamp(2rem,5vw,3rem)] font-black tracking-tight text-foreground mb-3">
                                {tn("About Us", "আমাদের সম্পর্কে")}
                            </motion.h1>
                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-2xl mx-auto">
                                {tn(
                                    `Established in ${cfg.established}, ${cfg.schoolName} has been a beacon of academic excellence and character formation.`,
                                    `${cfg.established} সালে প্রতিষ্ঠিত ${cfg.schoolNameBn} একাডেমিক উৎকর্ষ ও চরিত্র গঠনের আলোকস্তম্ভ।`,
                                )}
                            </motion.p>
                        </motion.div>
                    </div>
                </section>

                {/* History */}
                <section className="py-16 md:py-20">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={fadeIn}>
                                <h2 className="text-2xl font-black tracking-tight text-foreground mb-4 flex items-center gap-2">
                                    <FaGraduationCap className="text-primary" /> {tn("Our History", "আমাদের ইতিহাস")}
                                </h2>
                                <div className="space-y-4 text-muted-foreground leading-relaxed">
                                    <p>
                                        {tn(
                                            `Founded in ${cfg.established}, ${cfg.schoolName} began with a small group of committed educators and has grown into one of the region's respected institutions. For over six decades we have served the community of Guzia and surrounding areas.`,
                                            `${cfg.established} সালে প্রতিষ্ঠিত ${cfg.schoolNameBn} কয়েকজন নিবেদিতপ্রাণ শিক্ষক নিয়ে যাত্রা শুরু করে এবং ছয় দশকেরও বেশি সময় ধরে গুজিয়া ও আশপাশের এলাকার সেবা করে আসছে।`,
                                        )}
                                    </p>
                                    <p>
                                        {tn(
                                            "Our philosophy pairs a rigorous national-curriculum education with character, discipline, and service — preparing students not just for examinations, but for responsible citizenship.",
                                            "আমাদের দর্শন জাতীয় পাঠ্যক্রমের কঠোর পরিশ্রমকে চরিত্র, শৃঙ্খলা ও সেবার সাথে যুক্ত করে — শিক্ষার্থীদের শুধু পরীক্ষার জন্য নয়, দায়িত্বশীল নাগরিক হিসেবে গড়ে তোলে।",
                                        )}
                                    </p>
                                </div>
                            </motion.div>
                        </Reveal>
                    </div>
                </section>

                {/* Mission / Vision */}
                <section className="py-16 md:py-20 bg-primary/5 border-y border-border/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { icon: FaBullseye, title: "Our Mission", desc: "To provide quality education that nurtures the whole person — intellectually, morally, and socially — and forms responsible citizens." },
                                    { icon: FaEye, title: "Our Vision", desc: "To be a leading school where every student achieves academic excellence and grows into a person of character, creativity, and compassion." },
                                    { icon: FaHeart, title: "Our Values", desc: "Discipline, integrity, respect, hard work, and service to society — the foundation of everything we teach." },
                                ].map((v) => (
                                    <motion.div key={v.title} variants={fadeIn}>
                                        <Card className="h-full border-border/60 hover:border-primary/30 transition-colors">
                                            <CardContent className="p-6">
                                                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                                    <v.icon className="size-6 text-primary" />
                                                </div>
                                                <h3 className="font-bold text-lg text-foreground mb-2">{tn(v.title, v.title === "Our Mission" ? "আমাদের লক্ষ্য" : v.title === "Our Vision" ? "আমাদের স্বপ্ন" : "আমাদের মূল্যবোধ")}</h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>

                {/* Achievements */}
                <section className="py-16 md:py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-12">
                                <motion.h2 variants={fadeIn} className="text-2xl font-black tracking-tight text-foreground mb-2">{tn("Our Achievements", "আমাদের সাফল্য")}</motion.h2>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {achievements.map((a) => (
                                    <motion.div key={a.title} variants={fadeIn} className="relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/20 rounded-r" />
                                        <div className="pl-5 py-1">
                                            <div className="inline-flex items-center justify-center size-10 rounded-xl bg-amber-100 dark:bg-amber-950/30 mb-3">
                                                <a.icon className="size-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <h3 className="font-black text-lg text-foreground mb-1">{a.title}</h3>
                                            <p className="text-xs text-muted-foreground">{a.desc}</p>
                                        </div>
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
