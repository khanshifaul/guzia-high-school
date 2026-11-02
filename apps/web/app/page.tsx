"use client";

// app/page.tsx — public landing page.
//
// Presentation follows main's redesign (PR #34): the admin-controlled hero
// slider, the compact quick-access cards and the gradient CTA. Every content
// section between them reads GET /pages/home — there is no local array of
// copy, so unpublishing a block removes its section and an admin edit is what
// the visitor reads. The literal arrays main kept here are gone.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    FaArrowRight,
    FaCalendarCheck,
    FaGraduationCap,
    FaQuoteLeft,
} from "react-icons/fa6";
import { PUBLIC_EVENTS } from "@/lib/public-content";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { HeroSlider } from "@/components/hero/hero-slider";
import { PageUnavailable } from "@/components/public/page-unavailable";
import { useLanguage } from "@/lib/language-context";
import { useSiteConfig } from "@/lib/site-config";
import { blockOf, usePage } from "@/lib/pages";
import {
    GALLERY_TINTS,
    bodyFor,
    numberOf,
    text,
    type BlockBody,
    type BlockItem,
} from "@/lib/page-blocks";
import { resolveIcon } from "@/lib/icon-registry";

const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const fadeInUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } } };

function Counter({ end, suffix = "", duration = 2 }: { end: number; suffix?: string; duration?: number }) {
    const [count, setCount] = React.useState(0);
    const ref = React.useRef<HTMLSpanElement>(null);
    const done = React.useRef(false);
    const decimals = Number.isInteger(end) ? 0 : 1;

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !done.current) {
                done.current = true;
                const start = performance.now();
                const step = (now: number) => {
                    const p = Math.min((now - start) / (duration * 1000), 1);
                    const value = (1 - Math.pow(1 - p, 3)) * end;
                    setCount(decimals > 0 ? Number(value.toFixed(decimals)) : Math.floor(value));
                    if (p < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            }
        }, { threshold: 0.3 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [end, duration, decimals]);

    return <span ref={ref}>{count}{suffix}</span>;
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className={className}>
            {children}
        </motion.div>
    );
}

/** The rows of a block; a block without rows renders nothing. */
function itemsOf(body: BlockBody | null): BlockItem[] {
    return body && Array.isArray(body.items) ? body.items : [];
}

export default function HomePage() {
    const { language } = useLanguage();
    const cfg = useSiteConfig();
    const { page, loading } = usePage("home");

    const body = (key: string): BlockBody | null => {
        const block = blockOf(page, key);
        return block ? bodyFor(block.kind, block.bodyEn, block.bodyBn, language) : null;
    };

    const statsBody = body("stats");
    const highlightsBody = body("highlights");
    const programsBody = body("programs");
    const facilitiesBody = body("facilities");
    const testimonialsBody = body("testimonials");
    const achievementsBody = body("achievements");
    const galleryBody = body("gallery");
    const servicesBody = body("services");

    // "Years of Excellence" is derived from the admin-editable established year.
    const establishedYear = Number(cfg.established);
    const statValue = (item: BlockItem): number => {
        if (item.compute === "years-since-established" && Number.isFinite(establishedYear)) {
            return Math.max(0, new Date().getFullYear() - establishedYear);
        }
        return numberOf(item.end);
    };

    const unavailable = !loading && !page;

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1">
                <HeroSlider />

                {unavailable ? (
                    <PageUnavailable />
                ) : (
                    <>
                        {/* STATS */}
                        {statsBody && itemsOf(statsBody).length > 0 ? (
                            <section className="py-16 md:py-20 bg-primary/5 border-y border-border/60">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                                            {itemsOf(statsBody).map((s, index) => {
                                                const Icon = resolveIcon(s.icon);
                                                return (
                                                    <motion.div key={`${text(s.label)}-${index}`} variants={fadeInUp} className="text-center">
                                                        <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 mb-4">
                                                            <Icon className="size-6 text-primary" />
                                                        </div>
                                                        <div className="text-[clamp(1.8rem,4vw,2.8rem)] font-black text-foreground leading-none mb-1">
                                                            <Counter end={statValue(s)} suffix={text(s.suffix)} duration={2.5} />
                                                        </div>
                                                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{text(s.label)}</p>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </Reveal>
                                </div>
                            </section>
                        ) : null}

                        {/* ACTING HEADMASTER'S MESSAGE */}
                        <section className="py-20 md:py-28">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <Reveal>
                                    <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                                        <motion.div variants={fadeIn} className="md:col-span-1">
                                            <div className="relative aspect-[4/5] rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-border/60 flex flex-col items-center justify-center overflow-hidden">
                                                <FaGraduationCap className="size-16 text-primary/40" />
                                                <span className="mt-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Acting Headmaster</span>
                                            </div>
                                        </motion.div>
                                        <motion.div variants={fadeIn} className="md:col-span-2">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-3">Acting Headmaster&apos;s Message</p>
                                            <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-black tracking-tight text-foreground mb-4">
                                                Nurturing Minds, <span className="text-primary">Forming Hearts</span>
                                            </h2>
                                            <p className="text-muted-foreground leading-relaxed mb-4">
                                                Welcome to Guzia Bilateral High School. Since 1958 we have been committed to academic
                                                excellence and the formation of character. Our dedicated faculty mentor every
                                                student — not just to succeed in examinations, but to grow into responsible,
                                                compassionate citizens who will serve their community and country.
                                            </p>
                                            <p className="text-muted-foreground leading-relaxed mb-5">
                                                We pair a rigorous curriculum with sports, culture, and science, so every child
                                                discovers their strength. I invite you to join our community of learners and
                                                leaders.
                                            </p>
                                            <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                                                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">SA</div>
                                                <div>
                                                    <p className="font-bold text-sm text-foreground">MD. SHAHINUR ALOM</p>
                                                    <p className="text-[11px] text-muted-foreground">Acting Headmaster, Guzia Bilateral High School</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                </Reveal>
                            </div>
                        </section>

                        {/* WHY CHOOSE US */}
                        {highlightsBody && itemsOf(highlightsBody).length > 0 ? (
                            <section className="py-20 md:py-28">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-14">
                                            <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">{text(highlightsBody.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">{text(highlightsBody.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {itemsOf(highlightsBody).map((item, index) => {
                                                const Icon = resolveIcon(item.icon);
                                                return (
                                                    <motion.div key={`${text(item.title)}-${index}`} variants={fadeIn}>
                                                        <Card className="h-full border-border/60 hover:border-primary/30 transition-colors group">
                                                            <CardContent className="p-6">
                                                                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                                                    <Icon className="size-6 text-primary" />
                                                                </div>
                                                                <h3 className="font-bold text-lg text-foreground mb-2">{text(item.title)}</h3>
                                                                <p className="text-sm text-muted-foreground leading-relaxed">{text(item.desc)}</p>
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

                        {/* EVENTS */}
                        <section className="py-20 md:py-28 bg-muted/30 border-y border-border/60">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <Reveal>
                                    <motion.div variants={stagger} className="text-center mb-12">
                                        <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-2">Upcoming Events</motion.h2>
                                        <motion.p variants={fadeIn} className="text-muted-foreground">Stay updated with school activities and important dates.</motion.p>
                                    </motion.div>
                                    <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                        {PUBLIC_EVENTS.map((e) => (
                                            <motion.div key={e.title} variants={fadeInUp}>
                                                <Card className="h-full border-border/60 hover:border-primary/30 transition-colors overflow-hidden group">
                                                    <div className="h-2 w-full bg-gradient-to-r from-primary to-primary/40" />
                                                    <CardContent className="p-5">
                                                        <Badge className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider mb-3 ${e.color}`}>{e.type}</Badge>
                                                        <h3 className="font-bold text-sm text-foreground mb-2 line-clamp-2">{e.title}</h3>
                                                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                            <FaCalendarCheck className="size-3 shrink-0 text-primary" />
                                                            <span>{new Date(e.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                </Reveal>
                            </div>
                        </section>

                        {/* PROGRAMS */}
                        {programsBody && itemsOf(programsBody).length > 0 ? (
                            <section className="py-20 md:py-28" id="programs">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-14">
                                            <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">{text(programsBody.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">{text(programsBody.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {itemsOf(programsBody).map((p, index) => {
                                                const Icon = resolveIcon(p.icon);
                                                return (
                                                    <motion.div key={`${text(p.title)}-${index}`} variants={fadeInUp} className="relative group">
                                                        <div className="relative p-8 rounded-2xl border border-border/60 hover:border-primary/30 transition-colors text-center">
                                                            <div className="size-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                                                                <Icon className="size-8 text-primary" />
                                                            </div>
                                                            <h3 className="text-xl font-black text-foreground mb-3">{text(p.title)}</h3>
                                                            <p className="text-muted-foreground leading-relaxed mb-6">{text(p.desc)}</p>
                                                            <Link href="/academics">
                                                                <Button variant="ghost" className="gap-2 text-primary font-bold">
                                                                    Learn More <FaArrowRight size={12} />
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                        {text(programsBody.footnote) ? (
                                            <motion.p variants={fadeIn} className="text-center mt-8 text-xs font-bold text-primary uppercase tracking-widest">
                                                {text(programsBody.footnote)}
                                            </motion.p>
                                        ) : null}
                                    </Reveal>
                                </div>
                            </section>
                        ) : null}

                        {/* FACILITIES */}
                        {facilitiesBody && itemsOf(facilitiesBody).length > 0 ? (
                            <section className="py-20 md:py-28 bg-muted/30 border-y border-border/60">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-14">
                                            <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">{text(facilitiesBody.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">{text(facilitiesBody.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {itemsOf(facilitiesBody).map((f, index) => {
                                                const Icon = resolveIcon(f.icon);
                                                return (
                                                    <motion.div key={`${text(f.title)}-${index}`} variants={fadeInUp}>
                                                        <Card className="h-full border-border/60 hover:border-primary/30 transition-colors group">
                                                            <CardContent className="p-5">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                                                        <Icon className="size-5 text-primary" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-sm text-foreground mb-1">{text(f.title)}</h4>
                                                                        <p className="text-xs text-muted-foreground leading-relaxed">{text(f.desc)}</p>
                                                                    </div>
                                                                </div>
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

                        {/* TESTIMONIALS */}
                        {testimonialsBody && itemsOf(testimonialsBody).length > 0 ? (
                            <section className="py-20 md:py-28">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-14">
                                            <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">{text(testimonialsBody.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">{text(testimonialsBody.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {itemsOf(testimonialsBody).map((t, index) => (
                                                <motion.div key={`${text(t.name)}-${index}`} variants={fadeInUp} className="relative">
                                                    <FaQuoteLeft className="size-8 text-primary/15 absolute -top-2 -left-2" />
                                                    <div className="relative p-6 rounded-2xl border border-border/60 bg-card hover:border-primary/30 transition-colors h-full flex flex-col">
                                                        <p className="text-sm text-muted-foreground leading-relaxed italic mb-6 flex-1">&ldquo;{text(t.quote)}&rdquo;</p>
                                                        <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                                                            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                                {text(t.name).split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-foreground">{text(t.name)}</p>
                                                                <p className="text-[11px] text-muted-foreground">{text(t.role)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    </Reveal>
                                </div>
                            </section>
                        ) : null}

                        {/* ACHIEVEMENTS */}
                        {achievementsBody && itemsOf(achievementsBody).length > 0 ? (
                            <section className="py-20 md:py-28 bg-gradient-to-br from-primary/[0.04] via-background to-primary/[0.02] border-y border-border/60">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-14">
                                            <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">{text(achievementsBody.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">{text(achievementsBody.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {itemsOf(achievementsBody).map((a, index) => {
                                                const Icon = resolveIcon(a.icon);
                                                return (
                                                    <motion.div key={`${text(a.title)}-${index}`} variants={fadeInUp} className="relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/20 rounded-r" />
                                                        <div className="pl-5 py-1">
                                                            <div className="inline-flex items-center justify-center size-10 rounded-xl bg-amber-100 dark:bg-amber-950/30 mb-3">
                                                                <Icon className="size-5 text-amber-600 dark:text-amber-400" />
                                                            </div>
                                                            <h3 className="font-black text-lg text-foreground mb-1">{text(a.title)}</h3>
                                                            <p className="text-xs text-muted-foreground">{text(a.desc)}</p>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                    </Reveal>
                                </div>
                            </section>
                        ) : null}

                        {/* GALLERY PREVIEW */}
                        {galleryBody && itemsOf(galleryBody).length > 0 ? (
                            <section className="py-20 md:py-28">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-12">
                                            <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-2">{text(galleryBody.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground">{text(galleryBody.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {itemsOf(galleryBody).slice(0, 8).map((g, index) => {
                                                const imageUrl = text(g.imageUrl);
                                                const tint = text(g.tint) || GALLERY_TINTS[index % GALLERY_TINTS.length];
                                                return (
                                                    <motion.div
                                                        key={`${text(g.label)}-${index}`}
                                                        variants={fadeInUp}
                                                        className={`relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${tint} border border-border/60 group cursor-pointer`}
                                                    >
                                                        {imageUrl ? (
                                                            <>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={imageUrl} alt={text(g.label)} className="absolute inset-0 size-full object-cover" />
                                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-3">
                                                                    <p className="text-white text-xs font-bold">{text(g.label)}</p>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <span className="text-xs font-bold text-foreground/70 group-hover:text-foreground transition-colors">{text(g.label)}</span>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                        <motion.div variants={fadeIn} className="text-center mt-8">
                                            <Link href="/gallery">
                                                <Button variant="outline" className="gap-2 font-bold">
                                                    View Full Gallery <FaArrowRight size={12} />
                                                </Button>
                                            </Link>
                                        </motion.div>
                                    </Reveal>
                                </div>
                            </section>
                        ) : null}

                        {/* ONLINE SERVICES */}
                        {servicesBody && itemsOf(servicesBody).length > 0 ? (
                            <section className="py-16 md:py-20 bg-muted/30 border-y border-border/60">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-10">
                                            <motion.h2 variants={fadeIn} className="text-[clamp(1.25rem,3vw,1.75rem)] font-black tracking-tight text-foreground mb-2">{text(servicesBody.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground">{text(servicesBody.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {itemsOf(servicesBody).map((s, index) => {
                                                const Icon = resolveIcon(s.icon);
                                                const key = text(s.key);
                                                return (
                                                    <motion.div key={`${key}-${index}`} variants={fadeInUp}>
                                                        {/* The resolver sends each visitor to the
                                                            page for their role — or to the login
                                                            page, and back here after. */}
                                                        <Link href={`/portal/${key}`}>
                                                            <Card className="hover:border-primary/30 transition-colors group h-full">
                                                                <CardContent className="p-4 flex items-center gap-3">
                                                                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                                                                        <Icon className="size-4 text-primary" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <span className="block text-sm font-semibold text-foreground truncate">{text(s.title)}</span>
                                                                        <span className="block text-[10px] text-muted-foreground truncate">{text(s.desc)}</span>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </Link>
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

                {/* CTA */}
                <section className="py-20 md:py-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 md:p-16 text-center">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
                            <div className="relative max-w-2xl mx-auto">
                                <h2 className="text-[clamp(1.75rem,5vw,2.75rem)] font-black text-primary-foreground mb-4 tracking-tight">Start Your Journey With Us</h2>
                                <p className="text-lg text-primary-foreground/90 mb-8">Join Guzia Bilateral High School and become part of a community dedicated to excellence, character, and leadership.</p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <Link href="/admission">
                                        <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2 text-base px-8 font-black uppercase tracking-wider">
                                            Apply Now <FaArrowRight size={14} />
                                        </Button>
                                    </Link>
                                    <Link href="/contact">
                                        <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 text-base px-8 font-black uppercase tracking-wider border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                                            Contact Us
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
