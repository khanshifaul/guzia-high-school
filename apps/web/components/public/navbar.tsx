"use client";

// components/public/navbar.tsx — public header following the MyLab/guzia
// reference design: 3 layers (utility bar · collapsible brand · nav links),
// with site info (EIIN/board/phone) fetched from the admin-controlled
// /site-settings API.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FaGlobe, FaPhone, FaSignInAlt } from "react-icons/fa";
import { FiMenu, FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { NoticeTicker } from "./notice-ticker";
import { useLanguage } from "@/lib/language-context";
import { useSiteConfig } from "@/lib/site-config";

const navLinks = [
    { href: "/", labelEn: "Home", labelBn: "হোম" },
    { href: "/about", labelEn: "About Us", labelBn: "আমাদের সম্পর্কে" },
    { href: "/academics", labelEn: "Academics", labelBn: "একাডেমিক" },
    { href: "/news", labelEn: "News", labelBn: "সংবাদ" },
    { href: "/gallery", labelEn: "Gallery", labelBn: "গ্যালারি" },
    { href: "/contact", labelEn: "Contact", labelBn: "যোগাযোগ" },
];

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

function toBnDigits(s: string): string {
    return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Live date + time in the utility bar. Hydration-safe (blank until mounted),
 *  bilingual (Bengali digits in BN mode), ticks every second. */
function LiveClock() {
    const { language } = useLanguage();
    const [now, setNow] = React.useState<Date | null>(null);

    React.useEffect(() => {
        setNow(new Date());
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    if (!now) return <span className="text-[11px] font-semibold text-muted-foreground">—</span>;

    const date = now.toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    const time = now.toLocaleTimeString(language === "bn" ? "bn-BD" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });

    return (
        <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
            {language === "bn" ? toBnDigits(`${date} · ${time}`) : `${date} · ${time}`}
        </span>
    );
}

export function Navbar() {
    const pathname = usePathname();
    const { language, setLanguage, t } = useLanguage();
    const cfg = useSiteConfig();
    const [isOpen, setIsOpen] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);

    React.useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 30);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <nav className="sticky top-0 z-50 w-full bg-background border-b shadow-sm flex flex-col">
            {/* LAYER 1: utility bar */}
            <div className="w-full bg-muted/40 border-b h-8 flex items-center">
                <div className="container mx-auto px-4 md:px-8 max-w-7xl flex justify-between items-center w-full">
                    <div className="hidden md:flex items-center gap-3.5 text-[11px] font-semibold text-muted-foreground tracking-wide">
                        <span className="flex items-center gap-1.5"><FaPhone size={10} /> {cfg.phone}</span>
                        <span className="text-muted-foreground/30">|</span>
                        <span>EIIN: {cfg.eiin}</span>
                    </div>
                    <span className="md:hidden inline-block text-primary font-bold tracking-wider">GHS</span>

                    <div className="flex items-center gap-3">
                        <LiveClock />
                        <span className="w-px h-3 bg-border hidden md:block" />
                        <button
                            onClick={() => setLanguage(language === "en" ? "bn" : "en")}
                            aria-label={language === "en" ? "Switch to Bangla" : "Switch to English"}
                            title={language === "en" ? "Switch to Bangla" : "Switch to English"}
                            className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors text-[11px] font-semibold text-muted-foreground"
                        >
                            <FaGlobe size={13} />
                        </button>
                        <span className="w-px h-3 bg-border hidden md:block" />
                        <ThemeSwitcher variant="icon" />
                    </div>
                </div>
            </div>


            {/* LAYER 2: brand (collapsible on scroll) + campus photo on the right */}
            <motion.div
                initial={false}
                animate={{ height: isScrolled ? 0 : "auto", opacity: isScrolled ? 0 : 1 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden w-full bg-background border-b border-border/40 shrink-0 relative isolate"
            >
                <div className="py-4 md:py-6 container mx-auto px-4 md:px-8 max-w-7xl flex justify-between items-center relative">
                    {/* The campus photo sits behind the row, in the same
                        container as the name. Its left half is blurred so the
                        school name reads clearly over it; the right half stays
                        sharp and shows the campus. */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                                backgroundImage: "url('/images/campus.jpg')",
                                filter: "blur(16px)",
                                maskImage:
                                    "linear-gradient(to right, #000 0%, #000 30%, rgba(0,0,0,0.35) 50%, transparent 62%)",
                                WebkitMaskImage:
                                    "linear-gradient(to right, #000 0%, #000 30%, rgba(0,0,0,0.35) 50%, transparent 62%)",
                            }}
                        />
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                                backgroundImage: "url('/images/campus.jpg')",
                                maskImage:
                                    "linear-gradient(to right, transparent 34%, #000 56%, #000 100%)",
                                WebkitMaskImage:
                                    "linear-gradient(to right, transparent 34%, #000 56%, #000 100%)",
                            }}
                        />
                    </div>
                    <Link
                        href="/"
                        className="relative flex flex-col items-center md:items-start text-center md:text-left group"
                    >
                        {/* A soft scrim under the name keeps it legible over
                            the blurred half of the photo. */}
                        <span className="pointer-events-none absolute -inset-x-3 -inset-y-2 rounded-lg bg-background/70 backdrop-blur-[2px]" />
                        <span className="relative font-black text-2xl md:text-3.5xl text-primary uppercase tracking-tight group-hover:opacity-90 transition-opacity">
                            {language === "bn" ? cfg.schoolNameBn : cfg.schoolName}
                        </span>
                    </Link>
                </div>
            </motion.div>

            {/* LAYER 3: nav links + calls to action, on one line */}
            <div
                className={`w-full bg-background hidden md:flex h-12 items-stretch border-b transition-shadow ${isScrolled ? "shadow-sm" : "border-border/40"}`}
            >
                <div className="container mx-auto px-4 md:px-8 max-w-7xl flex h-full items-stretch justify-between">
                    <div className="flex h-full items-stretch justify-start">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`relative flex items-center px-5 text-xs font-bold tracking-widest uppercase transition-colors ${
                                        isActive
                                            ? "text-primary"
                                            : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                                    }`}
                                >
                                    {language === "en" ? link.labelEn : link.labelBn}
                                    {isActive ? (
                                        <motion.div
                                            layoutId="navbar-indicator"
                                            className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                                        />
                                    ) : null}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="flex h-full items-center gap-5 pl-6">
                        <Link
                            href="/admission"
                            className="text-xs font-bold tracking-widest uppercase text-primary hover:opacity-80 transition-opacity"
                        >
                            {t("Online Admission", "অনলাইন ভর্তি")}
                        </Link>
                        <span className="w-px h-3.5 bg-border" />
                        <Link
                            href="/login"
                            className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-foreground/80 hover:text-primary transition-colors"
                        >
                            <FaSignInAlt size={11} /> {t("Login", "লগইন")}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Notice ticker */}
            <NoticeTicker />
            {/* Mobile drawer */}
            <AnimatePresence>
                {isOpen ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden border-t border-border/60 bg-background">
                        <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
                            {navLinks.map((link) => (
                                <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md text-sm font-semibold hover:bg-muted">
                                    {language === "en" ? link.labelEn : link.labelBn}
                                </Link>
                            ))}
                            <Link href="/admission" onClick={() => setIsOpen(false)}>
                                <Button className="w-full mt-2 h-12 font-black text-sm uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 text-white">
                                    {t("Online Admission", "অনলাইন ভর্তি")}
                                </Button>
                            </Link>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <Link href="/login"><Button variant="outline" className="w-full h-12 font-black text-xs uppercase tracking-wider">{t("Teacher", "শিক্ষক")}</Button></Link>
                                <Link href="/login"><Button variant="outline" className="w-full h-12 font-black text-xs uppercase tracking-wider">{t("Student", "শিক্ষার্থী")}</Button></Link>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            {/* Mobile hamburger (fixed to utility bar right on small screens) */}
            <button className="md:hidden absolute right-4 top-1.5 text-muted-foreground hover:text-foreground cursor-pointer z-10" onClick={() => setIsOpen((o) => !o)} aria-label="Toggle menu">
                {isOpen ? <FiX size={16} /> : <FiMenu size={16} />}
            </button>
        </nav>
    );
}
