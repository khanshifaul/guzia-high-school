"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    FaGraduationCap, FaChalkboardUser, FaBookOpen, FaFlask, FaTrophy, FaUsers,
    FaUserGraduate, FaSchool, FaAward, FaCalendarCheck, FaMicroscope, FaLaptopCode,
    FaDumbbell, FaMusic, FaBook, FaStar, FaPersonRunning, FaUtensils,
    FaBus, FaArrowRight, FaHeart,
} from "react-icons/fa6";
import { ONLINE_SERVICES } from "@/lib/online-services";
import { PUBLIC_EVENTS } from "@/lib/public-content";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { HeroSlider } from "@/components/hero/hero-slider";

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

const highlights = [
    { icon: FaGraduationCap, title: "Academic Excellence", desc: "Consistent top results in national board examinations with 95%+ pass rate." },
    { icon: FaChalkboardUser, title: "Expert Faculty", desc: "Highly qualified teachers with advanced degrees and years of experience." },
    { icon: FaBookOpen, title: "Modern Curriculum", desc: "Updated curriculum blending national standards with global perspectives." },
    { icon: FaFlask, title: "Science Labs", desc: "Fully equipped physics, chemistry, and biology laboratories." },
    { icon: FaTrophy, title: "Co-Curricular", desc: "Debate, sports, cultural programs, and science fair opportunities." },
    { icon: FaUsers, title: "Community", desc: "Strong parent-teacher collaboration for holistic student development." },
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

const _testimonials = [
    { name: "Fatima Begum", role: "Alumna, Class of 2021", quote: "Guzia Bilateral High School shaped my character and gave me the confidence to pursue my dreams. The teachers here don't just teach — they mentor." },
    { name: "Rafiq Hasan", role: "Current Parent", quote: "I chose Guzia for my children because of its academic reputation. Seeing their growth in both studies and values confirms it was the right decision." },
    { name: "MD. SHAHINUR ALOM", role: "Acting Headmaster", quote: "Our mission is to nurture every student into a responsible citizen who excels not just academically but also in character and leadership." },
];

const _achievements = [
    { icon: FaTrophy, title: "Recognized", desc: "Government recognition since 1 July 1962" },
    { icon: FaAward, title: "MPO Institution", desc: "Government pay order, no. 7610041302" },
    { icon: FaStar, title: "National Rank 1861", desc: "In the national school ranking" },
    { icon: FaHeart, title: "JSC 94.94% Pass", desc: "1,031 of 1,086 students passed, 2010–2019" },
];
const ESTABLISHED_YEAR = 1958;
const stats = [
    { icon: FaUserGraduate, end: 536, suffix: "", label: "Students" },
    { icon: FaChalkboardUser, end: 18, suffix: "", label: "Teachers" },
    { icon: FaSchool, end: new Date().getFullYear() - ESTABLISHED_YEAR, suffix: "", label: "Years of Excellence" },
    { icon: FaAward, end: 97.3, suffix: "%", label: "SSC Pass Rate, 2022" },
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
                <HeroSlider />

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
                <section className="py-20 md:py-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-14">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">Why Choose Guzia Bilateral High School?</motion.h2>
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
                                            <div className="size-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                                                <p.icon className="size-8 text-primary" />
                                            </div>
                                            <h3 className="text-xl font-black text-foreground mb-3">{p.title}</h3>
                                            <p className="text-muted-foreground leading-relaxed mb-6">{p.desc}</p>
                                            <Link href="/academics">
                                                <Button variant="ghost" className="gap-2 text-primary font-bold">
                                                    Learn More <FaArrowRight size={12} />
                                                </Button>
                                            </Link>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>

                {/* FACILITIES */}
                <section className="py-20 md:py-28 bg-muted/30 border-y border-border/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-14">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-3">Our Facilities</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto">Modern infrastructure to support comprehensive learning.</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {facilities.map((f) => (
                                    <motion.div key={f.title} variants={fadeInUp}>
                                        <Card className="h-full border-border/60 hover:border-primary/30 transition-colors group">
                                            <CardContent className="p-5">
                                                <div className="flex items-start gap-3">
                                                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                                        <f.icon className="size-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground mb-1">{f.title}</h4>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>

                {/* GALLERY PREVIEW */}
                <section className="py-20 md:py-28">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-12">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight text-foreground mb-2">Campus Gallery</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground">A glimpse of life at Guzia Bilateral High School.</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {gallery.slice(0, 8).map((g) => (
                                    <motion.div key={g.label} variants={fadeInUp} className={`relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${g.bg} border border-border/60 group cursor-pointer`}>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-bold text-foreground/70 group-hover:text-foreground transition-colors">{g.label}</span>
                                        </div>
                                    </motion.div>
                                ))}
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

                {/* ONLINE SERVICES */}
                <section className="py-16 md:py-20 bg-muted/30 border-y border-border/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Reveal>
                            <motion.div variants={stagger} className="text-center mb-10">
                                <motion.h2 variants={fadeIn} className="text-[clamp(1.25rem,3vw,1.75rem)] font-black tracking-tight text-foreground mb-2">Online Services</motion.h2>
                                <motion.p variants={fadeIn} className="text-muted-foreground">Quick access to school services</motion.p>
                            </motion.div>
                            <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {ONLINE_SERVICES.map((svc) => (
                                    <motion.div key={svc.key} variants={fadeInUp}>
                                        <Link href={svc.anonymous || "/login"}>
                                            <Card className="hover:border-primary/30 transition-colors group h-full">
                                                <CardContent className="p-4 flex items-center gap-3">
                                                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                        <FaGraduationCap className="size-4 text-primary" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-foreground capitalize">{svc.key}</span>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Reveal>
                    </div>
                </section>

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
