"use client";

// components/public/footer.tsx — public footer following the MyLab/guzia
// reference design (4 columns: brand+social · quick links · resources ·
// contact+legal), plus the Important Links bar and a "Developed by" credit.
// Contact, socials and links are admin-controlled via /site-settings; the two
// link lists and the hotline strip come from the `global` page blocks.
// The "Developed by" credit is hardcoded in code (see lib/site-config.ts).

import Link from "next/link";
import {
    FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaYoutube, FaGlobe,
    FaMapMarkerAlt, FaPhone, FaEnvelope,
} from "react-icons/fa";
import { useLanguage } from "@/lib/language-context";
import { DEVELOPED_BY, DEVELOPED_BY_URL, useSiteConfig } from "@/lib/site-config";
import { EmergencyHotlines } from "@/components/public/emergency-hotlines";
import { blockOf, usePage } from "@/lib/pages";
import { bodyFor, text, type BlockBody } from "@/lib/page-blocks";

export function Footer() {
    const { language, t } = useLanguage();
    const cfg = useSiteConfig();
    const { page } = usePage("global");

    const body = (key: string): BlockBody | null => {
        const block = blockOf(page, key);
        return block ? bodyFor(block.kind, block.bodyEn, block.bodyBn, language) : null;
    };

    const quickLinks = body("footer-quick-links");
    const resourceLinks = body("footer-resource-links");
    const hotlines = blockOf(page, "hotlines");

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
                    {quickLinks && (quickLinks.items ?? []).length > 0 ? (
                        <div>
                            <h2 className="font-bold text-xs uppercase tracking-wider text-foreground mb-4">
                                {text(quickLinks.title)}
                            </h2>
                            <ul className="space-y-2 text-xs font-semibold text-muted-foreground">
                                {(quickLinks.items ?? []).map((link, index) => (
                                    <li key={`${text(link.href)}-${index}`}>
                                        <Link href={text(link.href, "/")} className="hover:text-primary transition-colors">{text(link.label)}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {/* Resources */}
                    {resourceLinks && (resourceLinks.items ?? []).length > 0 ? (
                        <div>
                            <h2 className="font-bold text-xs uppercase tracking-wider text-foreground mb-4">
                                {text(resourceLinks.title)}
                            </h2>
                            <ul className="space-y-2 text-xs font-semibold text-muted-foreground">
                                {(resourceLinks.items ?? []).map((link, index) => (
                                    <li key={`${text(link.href)}-${index}`}>
                                        <Link href={text(link.href, "/")} className="hover:text-primary transition-colors">{text(link.label)}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {/* Contact */}
                    <div>
                        <h2 className="font-bold text-xs uppercase tracking-wider text-foreground mb-4">
                            {t("Contact", "যোগাযোগ")}
                        </h2>
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
                        <h2 className="font-bold text-xs uppercase tracking-wider text-foreground mb-2">
                            {t("Important Links", "গুরুত্বপূর্ণ লিংক")}
                        </h2>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-muted-foreground">
                            {cfg.importantLinks.map((l) => (
                                <a key={l.href + l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                    {language === "bn" && l.labelBn ? l.labelBn : l.label}
                                </a>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Emergency Hotlines */}
                {hotlines ? (
                    <div className="border-t mt-8 pt-6">
                        <EmergencyHotlines block={hotlines} />
                    </div>
                ) : null}

                <div className="border-t mt-8 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground">
                    <p>© {new Date().getFullYear()} {language === "bn" ? cfg.schoolNameBn : cfg.schoolName}. {t("All rights reserved.", "সর্বস্বত্ব সংরক্ষিত।")}</p>
                    <p className="mt-4 md:mt-0">
                        {t("Developed by", "নির্মাণ")}{" "}
                        <a href={DEVELOPED_BY_URL} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
                            {DEVELOPED_BY}
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
