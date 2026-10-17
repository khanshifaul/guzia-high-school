"use client";

// components/public/footer.tsx — public footer following the MyLab/guzia
// reference design (4 columns: brand+social · quick links · resources ·
// contact+legal), plus the Important Links bar and a "Developed by" credit.
// Contact, socials, EIIN/board, and links are admin-controlled via /site-settings.

import Link from "next/link";
import {
    FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaYoutube, FaGlobe,
    FaMapMarkerAlt, FaPhone, FaEnvelope,
} from "react-icons/fa";
import { useLanguage } from "@/lib/language-context";
import { useSiteConfig } from "@/lib/site-config";

const navLinks = [
    { href: "/", labelEn: "Home", labelBn: "হোম" },
    { href: "/#programs", labelEn: "Academics", labelBn: "একাডেমিক" },
    { href: "/admission", labelEn: "Admissions", labelBn: "ভর্তি" },
    { href: "/#notices", labelEn: "Notices", labelBn: "বিজ্ঞপ্তি" },
    { href: "/#facilities", labelEn: "Facilities", labelBn: "সুবিধা" },
    { href: "/#contact", labelEn: "Contact", labelBn: "যোগাযোগ" },
];

const resourceLinks = [
    { href: "/#programs", labelEn: "Curriculum", labelBn: "পাঠ্যক্রম" },
    { href: "/#programs", labelEn: "Faculty", labelBn: "শিক্ষকবৃন্দ" },
    { href: "/#facilities", labelEn: "Laboratories", labelBn: "ল্যাবরেটরি" },
    { href: "/#facilities", labelEn: "Library", labelBn: "লাইব্রেরি" },
    { href: "/login", labelEn: "Portal Login", labelBn: "পোর্টাল লগইন" },
];

export function Footer() {
    const { language, t } = useLanguage();
    const cfg = useSiteConfig();
    const ln = (l: { labelEn: string; labelBn: string }) => (language === "en" ? l.labelEn : l.labelBn);

    const socials = [
        { url: cfg.facebookUrl, icon: FaFacebook, label: "Facebook" },
        { url: cfg.twitterUrl, icon: FaTwitter, label: "Twitter" },
        { url: cfg.instagramUrl, icon: FaInstagram, label: "Instagram" },
        { url: cfg.youtubeUrl, icon: FaYoutube, label: "YouTube" },
        { url: cfg.linkedinUrl, icon: FaLinkedin, label: "LinkedIn" },
        { url: cfg.websiteUrl, icon: FaGlobe, label: "Website" },
    ].filter((s) => s.url);

    return (
        <footer id="contact" className="border-t bg-background">
            <div className="container px-4 py-12 md:py-16 mx-auto max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1">
                        <Link href="/" className="flex items-center space-x-2 mb-4">
                            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-xs font-bold text-primary-foreground">GHS</span>
                            </div>
                            <span className="font-bold text-xl text-primary">
                                {language === "bn" ? cfg.schoolNameBn : cfg.schoolName}
                            </span>
                        </Link>
                        <p className="text-xs text-muted-foreground mb-1 leading-relaxed">
                            {language === "bn" ? cfg.taglineBn : cfg.tagline}
                        </p>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-4">
                            EIIN: {cfg.eiin} · {cfg.board}
                        </p>
                        {socials.length > 0 ? (
                            <div className="flex space-x-4">
                                {socials.map((s) => (
                                    <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label={s.label}>
                                        <s.icon size={18} />
                                    </a>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-bold text-xs uppercase tracking-wider text-foreground mb-4">
                            {t("Quick Links", "দ্রুত লিংক")}
                        </h3>
                        <ul className="space-y-2 text-xs font-semibold text-muted-foreground">
                            {navLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="hover:text-primary transition-colors">{ln(link)}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="font-bold text-xs uppercase tracking-wider text-foreground mb-4">
                            {t("Resources", "রিসোর্স")}
                        </h3>
                        <ul className="space-y-2 text-xs font-semibold text-muted-foreground">
                            {resourceLinks.map((link) => (
                                <li key={link.labelEn}>
                                    <Link href={link.href} className="hover:text-primary transition-colors">{ln(link)}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="font-bold text-xs uppercase tracking-wider text-foreground mb-4">
                            {t("Contact", "যোগাযোগ")}
                        </h3>
                        <ul className="space-y-2 text-xs font-semibold text-muted-foreground">
                            <li className="flex items-start gap-2"><FaMapMarkerAlt className="text-primary mt-0.5 shrink-0" size={11} /> {language === "bn" ? cfg.addressBn : cfg.address}</li>
                            <li className="flex items-center gap-2"><FaPhone className="text-primary shrink-0" size={11} /> {cfg.phone}</li>
                            {cfg.hotline ? (
                                <li className="flex items-center gap-2"><FaPhone className="text-primary shrink-0" size={11} /> Hotline: {cfg.hotline}</li>
                            ) : null}
                            <li className="flex items-center gap-2"><FaEnvelope className="text-primary shrink-0" size={11} /> {cfg.email}</li>
                        </ul>
                    </div>
                </div>

                {/* Important Links */}
                {cfg.importantLinks.length > 0 ? (
                    <div className="border-t mt-10 pt-6">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-foreground mb-2">
                            {t("Important Links", "গুরুত্বপূর্ণ লিংক")}
                        </h3>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-muted-foreground">
                            {cfg.importantLinks.map((l) => (
                                <a key={l.href + l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                    {language === "bn" && l.labelBn ? l.labelBn : l.label}
                                </a>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="border-t mt-8 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground">
                    <p>© {new Date().getFullYear()} {language === "bn" ? cfg.schoolNameBn : cfg.schoolName}. {t("All rights reserved.", "সর্বস্বত্ব সংরক্ষিত।")}</p>
                    <p className="mt-4 md:mt-0">
                        {t("Developed by", "নির্মাণ")}{" "}
                        <a href={cfg.developedByUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
                            {cfg.developedBy}
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
