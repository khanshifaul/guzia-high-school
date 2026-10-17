"use client";

// components/public/footer.tsx — public footer following BD school-site
// conventions (gap analysis): 4 columns with school identity + EIIN/board,
// quick links, portal logins, contact, plus important links + copyright bar.

import Link from "next/link";
import { FaGraduationCap, FaPhone, FaEnvelope, FaLocationDot, FaFacebook, FaGlobe, FaUserTie, FaUserGraduate } from "react-icons/fa6";
import { useLanguage } from "@/lib/language-context";

const IMPORTANT_LINKS = [
    { label: "Ministry of Education", href: "https://moedu.gov.bd" },
    { label: "Dhaka Education Board", href: "https://dhakaeducationboard.gov.bd" },
    { label: "BANBEIS (EIIN)", href: "https://banbeis.gov.bd" },
    { label: "National Emergency", href: "tel:999" },
];

export function Footer() {
    const { t } = useLanguage();
    const tn = (en: string, bn: string) => t(en, bn);

    return (
        <footer id="contact" className="bg-card border-t border-border/60">
            <div className="container mx-auto px-4 md:px-8 max-w-7xl py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Identity */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <FaGraduationCap className="text-primary" size={22} />
                            <span className="font-black text-lg text-primary uppercase tracking-tight">
                                {tn("Guzia High School", "গুজিয়া উচ্চ বিদ্যালয়")}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                            {tn(
                                "Shaping tomorrow's leaders since 1958. A nurturing environment where students excel academically and develop character.",
                                "১৯৫৮ সাল থেকে আগামীর নেতৃত্ব গড়ছে। একটি লালনপালনকারী পরিবেশ যেখানে শিক্ষার্থীরা একাডেমিকভাবে উৎকর্ষ অর্জন করে।",
                            )}
                        </p>
                        <p className="text-xs font-semibold text-muted-foreground">
                            EIIN: 123456 · {tn("Dhaka Education Board", "ঢাকা শিক্ষা বোর্ড")}
                        </p>
                    </div>

                    {/* Quick links */}
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">
                            {tn("Quick Links", "দ্রুত লিংক")}
                        </p>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors">{tn("Home", "হোম")}</Link></li>
                            <li><Link href="/#programs" className="text-muted-foreground hover:text-primary transition-colors">{tn("Academics", "শিক্ষা")}</Link></li>
                            <li><Link href="/#facilities" className="text-muted-foreground hover:text-primary transition-colors">{tn("Facilities", "সুবিধা")}</Link></li>
                            <li><Link href="/#notices" className="text-muted-foreground hover:text-primary transition-colors">{tn("Notices", "বিজ্ঞপ্তি")}</Link></li>
                        </ul>
                    </div>

                    {/* Portal logins */}
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">
                            {tn("Portal Logins", "পোর্টাল লগইন")}
                        </p>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/login" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"><FaUserTie size={12} /> {tn("Teacher Login", "শিক্ষক লগইন")}</Link></li>
                            <li><Link href="/login" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"><FaUserGraduate size={12} /> {tn("Student Login", "শিক্ষার্থী লগইন")}</Link></li>
                            <li><Link href="/login" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"><FaUserGraduate size={12} /> {tn("Parent Login", "অভিভাবক লগইন")}</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">
                            {tn("Contact", "যোগাযোগ")}
                        </p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2"><FaLocationDot className="text-primary" size={12} /> Guzia, Bangladesh</li>
                            <li className="flex items-center gap-2"><FaPhone className="text-primary" size={12} /> +880 1711-000000</li>
                            <li className="flex items-center gap-2"><FaEnvelope className="text-primary" size={12} /> info@guziahs.edu</li>
                            <li className="flex items-center gap-2 pt-1">
                                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Facebook">
                                    <FaFacebook size={14} />
                                </a>
                                <a href="https://guziahs.edu" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Website">
                                    <FaGlobe size={14} />
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Important links bar */}
                <div className="mt-10 pt-6 border-t border-border/60">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">
                        {tn("Important Links", "গুরুত্বপূর্ণ লিংক")}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                        {IMPORTANT_LINKS.map((l) => (
                            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                {l.label}
                            </a>
                        ))}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                        © {new Date().getFullYear()} {tn("Guzia High School", "গুজিয়া উচ্চ বিদ্যালয়")} · Est. 1958
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        {tn("Powered by Guzia School Portal", "Guzia School Portal দ্বারা চালিত")}
                    </p>
                </div>
            </div>
        </footer>
    );
}
