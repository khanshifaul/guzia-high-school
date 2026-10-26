"use client";

// app/page.tsx — public landing page. Rich, sectioned design following the
// alumni-app / MyLab-guzia reference: hero, animated stats, why-choose-us,
// events, programs, facilities, testimonials, achievements, gallery, CTA.
//
// Every section body below comes from GET /pages/home (Page + Block rows).
// There is no local array of content: unpublishing a block removes its section,
// and the admin edits the same words the visitor reads.

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
    FaSchool,
} from "react-icons/fa6";
import { PUBLIC_EVENTS, nextEvent } from "@/lib/public-content";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
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
    // A fractional target (e.g. a pass rate) keeps one decimal; a whole one
    // counts up as an integer.
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
    const services = body("services");

    // "Years of Excellence" is derived from the admin-editable established year,
    // so it stays correct without freezing a number into the database.
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
                {/* HERO */}
                <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 py-24 md:py-36">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto text-center">
                            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                                <span className="size-2 rounded-full bg-primary animate-pulse" />
                                {cfg.schoolName} · Est. {cfg.established} · Bogura
                            </motion.div>
                            <motion.h1 variants={fadeIn} className="text-[clamp(2rem,6vw,3.5rem)] font-black tracking-tight text-foreground leading-none mb-4">
                                Shaping Tomorrow <span className="text-primary">Leaders</span>
                            </motion.h1>
                            <motion.p variants={fadeIn} className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                                A government-recognised secondary school for Classes 6–10, where students
                                excel academically, build character, and prepare for a bright future.
                            </motion.p>
                            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link href="/login">
                                    <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 font-black uppercase tracking-wider shadow-md shadow-primary/20">
                                        Enter Portal <FaArrowRight size={14} />
                                    </Button>
                                </Link>
                                <Link href="/news">
                                    <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base px-8 font-black uppercase tracking-wider">
                                        News &amp; Events
                                    </Button>
                                </Link>
                            </motion.div>
                            <motion.div variants={fadeIn} className="mt-6 flex justify-center">
                                <Link
                                    href="/news"
                                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                >
                                    <FaCalendarCheck className="size-3 text-primary" />
                                    Next: <span className="text-foreground">{nextEvent().title}</span>
                                    <span>· {new Date(nextEvent().date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

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
                                                            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 mb-5 group-hover:bg-primary/20 transition-colors mx-auto">
                                                                <Icon className="size-7 text-primary" />
                                                            </div>
                                                            <h3 className="text-xl font-black text-foreground mb-3">{text(p.title)}</h3>
                                                            <p className="text-sm text-muted-foreground leading-relaxed">{text(p.desc)}</p>
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

                        {/* FACILITIES */}
                        {facilitiesBody && itemsOf(facilitiesBody).length > 0 ? (
                            <section className="py-20 md:py-28 bg-primary/5 border-y border-border/60" id="facilities">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-14">
                                            <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">{text(facilitiesBody.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">{text(facilitiesBody.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                                            {itemsOf(facilitiesBody).map((f, index) => {
                                                const Icon = resolveIcon(f.icon);
                                                return (
                                                    <motion.div key={`${text(f.title)}-${index}`} variants={fadeInUp}>
                                                        <Card className="h-full border-border/60 hover:border-primary/30 transition-colors group">
                                                            <CardContent className="p-5 text-center">
                                                                <div className="inline-flex items-center justify-center size-11 rounded-xl bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors mx-auto">
                                                                    <Icon className="size-5 text-primary" />
                                                                </div>
                                                                <h3 className="font-bold text-sm text-foreground mb-1">{text(f.title)}</h3>
                                                                <p className="text-[11px] text-muted-foreground leading-snug">{text(f.desc)}</p>
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

                        {/* GALLERY */}
                        {galleryBody && itemsOf(galleryBody).length > 0 ? (
                            <section className="py-20 md:py-28">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-14">
                                            <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">{text(galleryBody.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">{text(galleryBody.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {itemsOf(galleryBody).map((g, index) => {
                                                const imageUrl = text(g.imageUrl);
                                                const tint = text(g.tint) || GALLERY_TINTS[index % GALLERY_TINTS.length];
                                                return (
                                                    <motion.div key={`${text(g.label)}-${index}`} variants={fadeInUp}>
                                                        <div className={`relative aspect-[4/3] rounded-xl bg-gradient-to-br ${tint} border border-border/60 overflow-hidden group cursor-pointer`}>
                                                            {imageUrl ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={text(g.label)}
                                                                    className="absolute inset-0 size-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <FaSchool className="size-10 text-foreground/20 group-hover:scale-110 transition-transform duration-300" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-3">
                                                                <p className="text-white text-xs font-bold">{text(g.label)}</p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                    </Reveal>
                                </div>
                            </section>
                        ) : null}

                        {/* ONLINE SERVICES */}
                        {services && itemsOf(services).length > 0 ? (
                            <section className="py-20 md:py-28 bg-muted/30 border-y border-border/60" id="notices">
                                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <Reveal>
                                        <motion.div variants={stagger} className="text-center mb-12">
                                            <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-2">{text(services.title)}</motion.h2>
                                            <motion.p variants={fadeIn} className="text-muted-foreground">{text(services.subtitle)}</motion.p>
                                        </motion.div>
                                        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                            {itemsOf(services).map((s, index) => {
                                                const Icon = resolveIcon(s.icon);
                                                const key = text(s.key);
                                                return (
                                                    <motion.div key={`${key}-${index}`} variants={fadeInUp}>
                                                        {/* The resolver sends each visitor to the
                                                            page for their role — or to the
                                                            login page, and back here after. */}
                                                        <Link href={`/portal/${key}`}>
                                                            <Card className="h-full border-border/60 hover:border-primary/30 transition-colors group cursor-pointer">
                                                                <CardContent className="p-6 text-center">
                                                                    <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                                                                        <Icon className="size-6 text-primary" />
                                                                    </div>
                                                                    <h3 className="font-bold text-foreground mb-1">{text(s.title)}</h3>
                                                                    <p className="text-xs text-muted-foreground">{text(s.desc)}</p>
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
                <section className="py-20 bg-primary/5 border-y border-border/60" id="cta">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                            <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">Start Your Journey Today</motion.h2>
                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-lg mx-auto mb-8">Join our community of learners and take the first step toward a bright future.</motion.p>
                            <motion.div variants={fadeIn}>
                                <Link href="/login">
                                    <Button size="lg" className="gap-2 text-base px-10 font-black uppercase tracking-wider shadow-md shadow-primary/20">
                                        Enter Portal <FaArrowRight size={14} />
                                    </Button>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
