"use client";

// app/page.tsx — public landing page. Rich, sectioned design following the
// alumni-app / MyLab-guzia reference: hero, animated stats, why-choose-us,
// events, programs, facilities, testimonials, achievements, gallery, CTA.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    FaGraduationCap, FaChalkboardUser, FaBookOpen, FaFlask, FaTrophy, FaUsers,
    FaUserGraduate, FaSchool, FaAward, FaCalendarCheck, FaMicroscope, FaLaptopCode,
    FaDumbbell, FaMusic, FaBook, FaQuoteLeft, FaStar, FaPersonRunning, FaUtensils,
    FaBus, FaPaintbrush, FaArrowRight, FaHeart,
} from "react-icons/fa6";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";

const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const fadeInUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } } };

function Counter({ end, suffix = "", duration = 2 }: { end: number; suffix?: string; duration?: number }) {
    const [count, setCount] = React.useState(0);
    const ref = React.useRef<HTMLSpanElement>(null);
    const done = React.useRef(false);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !done.current) {
                done.current = true;
                const start = performance.now();
                const step = (now: number) => {
                    const p = Math.min((now - start) / (duration * 1000), 1);
                    setCount(Math.floor((1 - Math.pow(1 - p, 3)) * end));
                    if (p < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            }
        }, { threshold: 0.3 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [end, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className={className}>
            {children}
        </motion.div>
    );
}

const stats = [
    { icon: FaUserGraduate, end: 1200, suffix: "+", label: "Students" },
    { icon: FaChalkboardUser, end: 80, suffix: "+", label: "Teachers" },
    { icon: FaSchool, end: 68, suffix: "", label: "Years of Excellence" },
    { icon: FaAward, end: 50, suffix: "+", label: "National Awards" },
];

const highlights = [
    { icon: FaGraduationCap, title: "Academic Excellence", desc: "Consistent top results in national board examinations with 95%+ pass rate." },
    { icon: FaChalkboardUser, title: "Expert Faculty", desc: "Highly qualified teachers with advanced degrees and years of experience." },
    { icon: FaBookOpen, title: "Modern Curriculum", desc: "Updated curriculum blending national standards with global perspectives." },
    { icon: FaFlask, title: "Science Labs", desc: "Fully equipped physics, chemistry, and biology laboratories." },
    { icon: FaTrophy, title: "Co-Curricular", desc: "Debate, sports, cultural programs, and science fair opportunities." },
    { icon: FaUsers, title: "Community", desc: "Strong parent-teacher collaboration for holistic student development." },
];

const events = [
    { type: "EXAM", title: "Half-Yearly Examination", date: "2026-11-10", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    { type: "MEETING", title: "Parent-Teacher Meeting", date: "2026-10-25", color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
    { type: "EVENT", title: "Annual Science Fair", date: "2026-12-05", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { type: "HOLIDAY", title: "Victory Day Holiday", date: "2026-12-16", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
];

const programs = [
    { icon: FaMicroscope, title: "Science", desc: "Science, ICT & advanced Mathematics for future scientists and engineers." },
    { icon: FaLaptopCode, title: "Commerce", desc: "Accounting, Finance, Economics & Entrepreneurship for business leaders." },
    { icon: FaBookOpen, title: "Arts", desc: "History, Literature & Social Studies for holistic thinkers." },
];

const facilities = [
    { icon: FaFlask, title: "Science Labs", desc: "Fully equipped physics, chemistry & biology labs." },
    { icon: FaLaptopCode, title: "Computer Lab", desc: "Modern computer lab with 40+ workstations." },
    { icon: FaBook, title: "Library", desc: "10,000+ books, journals & digital resources." },
    { icon: FaPersonRunning, title: "Sports Complex", desc: "Football field, basketball court & indoor games." },
    { icon: FaMusic, title: "Music & Arts", desc: "Dedicated music room, art studio & stage." },
    { icon: FaDumbbell, title: "Gymnasium", desc: "Fully equipped indoor gym for all students." },
    { icon: FaUtensils, title: "Cafeteria", desc: "Hygienic, nutritious meals & snacks daily." },
    { icon: FaBus, title: "Transport", desc: "Safe bus service covering all major routes." },
];

const testimonials = [
    { name: "Fatima Begum", role: "Alumna, Class of 2021", quote: "Guzia High School shaped my character and gave me the confidence to pursue my dreams. The teachers here don't just teach — they mentor." },
    { name: "Rafiq Hasan", role: "Current Parent", quote: "I chose Guzia for my children because of its academic reputation. Seeing their growth in both studies and values confirms it was the right decision." },
    { name: "Dr. Anwar Hossain", role: "Principal", quote: "Our mission is to nurture every student into a responsible citizen who excels not just academically but also in character and leadership." },
];

const achievements = [
    { icon: FaTrophy, title: "National Rank #3", desc: "In the National Science Olympiad 2025" },
    { icon: FaAward, title: "100% Pass Rate", desc: "In SSC Board Examination 2025" },
    { icon: FaStar, title: "Best School Award", desc: "Upazila Education Excellence Award 2024" },
    { icon: FaHeart, title: "Gold Medal Debate", desc: "National Inter-School Debate Championship 2025" },
];

const gallery = [
    { label: "Science Lab", bg: "from-blue-400/20 to-blue-600/20" },
    { label: "Library", bg: "from-emerald-400/20 to-emerald-600/20" },
    { label: "Sports Ground", bg: "from-green-400/20 to-green-600/20" },
    { label: "Computer Lab", bg: "from-purple-400/20 to-purple-600/20" },
    { label: "Annual Event", bg: "from-rose-400/20 to-rose-600/20" },
    { label: "Classroom", bg: "from-amber-400/20 to-amber-600/20" },
    { label: "Auditorium", bg: "from-indigo-400/20 to-indigo-600/20" },
    { label: "Campus", bg: "from-cyan-400/20 to-cyan-600/20" },
];

export default function HomePage() {
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
                                Est. 1958 — Excellence in Education
                            </motion.div>
                            <motion.h1 variants={fadeIn} className="text-[clamp(2rem,6vw,3.5rem)] font-black tracking-tight text-foreground leading-none mb-4">
                                Shaping Tomorrow <span className="text-primary">Leaders</span>
                            </motion.h1>
                            <motion.p variants={fadeIn} className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                                Guzia High School provides a nurturing environment where students excel
                                academically, develop character, and prepare for a bright future.
                            </motion.p>
                            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link href="/login">
                                    <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 font-black uppercase tracking-wider shadow-md shadow-primary/20">
                                        Enter Portal <FaArrowRight size={14} />
                                    </Button>
                                </Link>
                                <Link href="/#programs">
                                    <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base px-8 font-black uppercase tracking-wider">
                                        Learn More
                                    </Button>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* STATS */}
                <section className="py-16 md:py-20 bg-primary/5 border-y border-border/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                                {stats.map((s) => (
                                    <motion.div key={s.label} variants={fadeInUp} className="text-center">
                                        <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 mb-4">
                                            <s.icon className="size-6 text-primary" />
                                        </div>
                                        <div className="text-[clamp(1.8rem,4vw,2.8rem)] font-black text-foreground leading-none mb-1">
                                            <Counter end={s.end} suffix={s.suffix} duration={2.5} />
                                        </div>
                                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* WHY CHOOSE US */}
                <section className="py-20 md:py-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-14">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">Why Choose Guzia High School?</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">We are committed to providing quality education that prepares students for the challenges of tomorrow.</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {highlights.map((item) => (
                                    <motion.div key={item.title} variants={fadeIn}>
                                        <Card className="h-full border-border/60 hover:border-primary/30 transition-colors group">
                                            <CardContent className="p-6">
                                                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                                    <item.icon className="size-6 text-primary" />
                                                </div>
                                                <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>

                {/* EVENTS */}
                <section className="py-20 md:py-28 bg-muted/30 border-y border-border/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-12">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-2">Upcoming Events</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground">Stay updated with school activities and important dates.</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                {events.map((e) => (
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
                <section className="py-20 md:py-28" id="programs">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-14">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">Academic Programs</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">Explore our diverse range of academic streams designed for every ambition.</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {programs.map((p) => (
                                    <motion.div key={p.title} variants={fadeInUp} className="relative group">
                                        <div className="relative p-8 rounded-2xl border border-border/60 hover:border-primary/30 transition-colors text-center">
                                            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 mb-5 group-hover:bg-primary/20 transition-colors mx-auto">
                                                <p.icon className="size-7 text-primary" />
                                            </div>
                                            <h3 className="text-xl font-black text-foreground mb-3">{p.title}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
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

                {/* FACILITIES */}
                <section className="py-20 md:py-28 bg-primary/5 border-y border-border/60" id="facilities">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-14">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">Our Facilities</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">World-class infrastructure that supports holistic development.</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                                {facilities.map((f) => (
                                    <motion.div key={f.title} variants={fadeInUp}>
                                        <Card className="h-full border-border/60 hover:border-primary/30 transition-colors group">
                                            <CardContent className="p-5 text-center">
                                                <div className="inline-flex items-center justify-center size-11 rounded-xl bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors mx-auto">
                                                    <f.icon className="size-5 text-primary" />
                                                </div>
                                                <h3 className="font-bold text-sm text-foreground mb-1">{f.title}</h3>
                                                <p className="text-[11px] text-muted-foreground leading-snug">{f.desc}</p>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>

                {/* TESTIMONIALS */}
                <section className="py-20 md:py-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-14">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">What People Say</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">Hear from our alumni, parents, and educators.</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {testimonials.map((t) => (
                                    <motion.div key={t.name} variants={fadeInUp} className="relative">
                                        <FaQuoteLeft className="size-8 text-primary/15 absolute -top-2 -left-2" />
                                        <div className="relative p-6 rounded-2xl border border-border/60 bg-card hover:border-primary/30 transition-colors h-full flex flex-col">
                                            <p className="text-sm text-muted-foreground leading-relaxed italic mb-6 flex-1">&ldquo;{t.quote}&rdquo;</p>
                                            <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                                                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                    {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-foreground">{t.name}</p>
                                                    <p className="text-[11px] text-muted-foreground">{t.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>

                {/* ACHIEVEMENTS */}
                <section className="py-20 md:py-28 bg-gradient-to-br from-primary/[0.04] via-background to-primary/[0.02] border-y border-border/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-14">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">Our Achievements</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">Celebrating excellence across academics, sports, and co-curricular activities.</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {achievements.map((a) => (
                                    <motion.div key={a.title} variants={fadeInUp} className="relative overflow-hidden">
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

                {/* GALLERY */}
                <section className="py-20 md:py-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-14">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">Campus Gallery</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">A glimpse into life at Guzia High School.</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {gallery.map((g) => (
                                    <motion.div key={g.label} variants={fadeInUp}>
                                        <div className={`relative aspect-[4/3] rounded-xl bg-gradient-to-br ${g.bg} border border-border/60 overflow-hidden group cursor-pointer`}>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <FaSchool className="size-10 text-foreground/20 group-hover:scale-110 transition-transform duration-300" />
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-3">
                                                <p className="text-white text-xs font-bold">{g.label}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>

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
