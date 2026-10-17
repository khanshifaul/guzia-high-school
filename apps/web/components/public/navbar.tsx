"use client";

// components/public/navbar.tsx — public header following BD school-site
// conventions (gap analysis): top utility bar (hotline/date/EIIN/lang), notice
// ticker, logo + bilingual name + EIIN, nav + Online-Admission CTA, and split
// Teacher / Student-Parent logins.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
    FaGraduationCap, FaBars, FaXmark, FaPhone, FaEnvelope, FaGlobe,
    FaUserTie, FaUserGraduate,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { NoticeTicker } from "./notice-ticker";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

const LINKS = [
    { label: "Home", labelBn: "হোম", href: "/" },
    { label: "Academics", labelBn: "শিক্ষা", href: "/#programs" },
    { label: "Facilities", labelBn: "সুবিধা", href: "/#facilities" },
    { label: "Notices", labelBn: "বিজ্ঞপ্তি", href: "/#notices" },
    { label: "Contact", labelBn: "যোগাযোগ", href: "/#contact" },
];

const SCHOOL = {
    nameEn: "Guzia High School",
    nameBn: "গুজিয়া উচ্চ বিদ্যালয়",
    eiin: "123456",
    board: "Dhaka Education Board",
    phone: "+880 1711-000000",
    email: "info@guziahs.edu",
};

function useClock() {
    const [now, setNow] = React.useState<Date | null>(null);
    React.useEffect(() => {
        setNow(new Date());
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return now;
}

export function Navbar() {
    const pathname = usePathname();
    const [open, setOpen] = React.useState(false);
    const { language, setLanguage } = useLanguage();
    const now = useClock();
    const t = (en: string, bn: string) => (language === "bn" ? bn : en);

    return (
        <header className="sticky top-0 z-50 w-full">
            {/* Top utility bar */}
            <div className="hidden md:block bg-primary text-primary-foreground">
                <div className="container mx-auto px-4 md:px-8 max-w-7xl h-8 flex items-center justify-between text-[11px] font-semibold">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><FaPhone size={10} /> {SCHOOL.phone}</span>
                        <span className="flex items-center gap-1.5"><FaEnvelope size={10} /> {SCHOOL.email}</span>
                        <span className="opacity-80">EIIN: {SCHOOL.eiin}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {now ? (
                            <span className="opacity-90">
                                {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </span>
                        ) : <span className="opacity-90">—</span>}
                        <button
                            onClick={() => setLanguage(language === "en" ? "bn" : "en")}
                            className="flex items-center gap-1 hover:underline cursor-pointer"
                        >
                            <FaGlobe size={10} /> {language === "en" ? "বাংলা" : "English"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Notice ticker */}
            <NoticeTicker />

            {/* Main navbar */}
            <nav className="w-full bg-background/95 backdrop-blur border-b border-border/60 shadow-sm">
                <div className="container mx-auto px-4 md:px-8 max-w-7xl h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 min-w-0">
                        <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <FaGraduationCap className="text-primary" size={24} />
                        </div>
                        <div className="min-w-0">
                            <span className="block font-black text-lg text-primary uppercase tracking-tight leading-tight">
                                {t(SCHOOL.nameEn, SCHOOL.nameBn)}
                            </span>
                            <span className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                                EIIN: {SCHOOL.eiin} · {SCHOOL.board}
                            </span>
                        </div>
                    </Link>

                    <div className="hidden lg:flex items-center gap-1">
                        {LINKS.map((l) => {
                            const active = pathname === l.href;
                            return (
                                <Link
                                    key={l.href}
                                    href={l.href}
                                    className={cn(
                                        "relative px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                                        active ? "text-primary" : "text-foreground/80 hover:text-primary",
                                    )}
                                >
                                    {t(l.label, l.labelBn)}
                                    {active ? (
                                        <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                                    ) : null}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeSwitcher />
                        <Link href="/login" className="hidden sm:block">
                            <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-4 py-2 shadow-md hover:scale-[1.02] transition-transform duration-200">
                                {t("Online Admission", "অনলাইন ভর্তি")}
                            </Button>
                        </Link>
                        <div className="hidden lg:flex items-center gap-1.5">
                            <Link href="/login">
                                <Button variant="outline" size="sm" className="gap-1.5 font-black text-[10px] uppercase tracking-wider">
                                    <FaUserTie size={11} /> {t("Teacher", "শিক্ষক")}
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button variant="outline" size="sm" className="gap-1.5 font-black text-[10px] uppercase tracking-wider">
                                    <FaUserGraduate size={11} /> {t("Student", "শিক্ষার্থী")}
                                </Button>
                            </Link>
                        </div>
                        <button className="lg:hidden text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
                            {open ? <FaXmark size={20} /> : <FaBars size={20} />}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {open ? (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="lg:hidden overflow-hidden border-t border-border/60 bg-background">
                            <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
                                {LINKS.map((l) => (
                                    <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="px-3 py-2 rounded-md text-sm font-semibold hover:bg-muted">
                                        {t(l.label, l.labelBn)}
                                    </Link>
                                ))}
                                <div className="flex gap-2 mt-2 pt-2 border-t border-border/60">
                                    <Link href="/login" className="flex-1"><Button className="w-full font-black text-xs uppercase tracking-wider">{t("Teacher Login", "শিক্ষক লগইন")}</Button></Link>
                                    <Link href="/login" className="flex-1"><Button variant="outline" className="w-full font-black text-xs uppercase tracking-wider">{t("Student Login", "শিক্ষার্থী লগইন")}</Button></Link>
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </nav>
        </header>
    );
}
