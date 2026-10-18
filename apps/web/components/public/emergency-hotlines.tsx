"use client";

// components/public/emergency-hotlines.tsx — official Bangladesh emergency
// hotline stickers (source: bangladesh.gov.bd জরুরি হটলাইন). Clickable tel:
// badges shown in the footer.

import * as React from "react";
import { FaPhoneAlt } from "react-icons/fa";
import { useLanguage } from "@/lib/language-context";

interface Hotline {
    num: string;
    labelEn: string;
    labelBn: string;
    color: string; // tailwind bg class
}

// Official national emergency numbers (bangladesh.gov.bd/pages/static-pages/69a55ba386514399668e4e89).
const HOTLINES: Hotline[] = [
    { num: "999", labelEn: "National Emergency", labelBn: "জাতীয় জরুরি সেবা", color: "bg-rose-700" },
    { num: "333", labelEn: "Govt Info & Services", labelBn: "সরকারি তথ্য ও সেবা", color: "bg-emerald-700" },
    { num: "102", labelEn: "Fire Service", labelBn: "ফায়ার সার্ভিস", color: "bg-orange-700" },
    { num: "1090", labelEn: "Disaster Warning", labelBn: "দুর্যোগের আগাম বার্তা", color: "bg-amber-700" },
    { num: "109", labelEn: "Women & Child Abuse", labelBn: "নারী ও শিশু নির্যাতন প্রতিরোধ", color: "bg-pink-700" },
    { num: "1098", labelEn: "Child Helpline", labelBn: "শিশু সহায়তা", color: "bg-sky-700" },
    { num: "16263", labelEn: "Health Hotline", labelBn: "স্বাস্থ্য হটলাইন", color: "bg-teal-700" },
    { num: "106", labelEn: "Anti-Corruption", labelBn: "দুর্নীতি দমন (দুদক)", color: "bg-indigo-700" },
];

export function EmergencyHotlines() {
    const { language, t } = useLanguage();

    return (
        <div>
            <h2 className="font-bold text-xs uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <FaPhoneAlt className="text-primary" size={11} />
                {t("Emergency Hotlines", "জরুরি হটলাইন")}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HOTLINES.map((h) => (
                    <a
                        key={h.num}
                        href={`tel:${h.num}`}
                        className={`${h.color} text-white rounded-lg p-2 text-center hover:opacity-90 transition-opacity`}
                        title={`${language === "bn" ? h.labelBn : h.labelEn}: ${h.num}`}
                    >
                        <span className="block font-black text-lg leading-none">{h.num}</span>
                        <span className="block text-[9px] font-semibold mt-0.5 leading-tight">
                            {language === "bn" ? h.labelBn : h.labelEn}
                        </span>
                    </a>
                ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
                {t("Toll-free · 24/7 · Source: bangladesh.gov.bd", "টোল-ফ্রি · ২৪/৭ · উৎস: bangladesh.gov.bd")}
            </p>
        </div>
    );
}
