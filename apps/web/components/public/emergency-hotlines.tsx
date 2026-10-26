"use client";

// components/public/emergency-hotlines.tsx — official Bangladesh emergency
// hotline stickers (source: bangladesh.gov.bd জরুরি হটলাইন). The list is the
// `hotlines` block of the `global` page, so the office can correct a number
// without a deploy. Clickable tel: badges, shown in the footer.

import { FaPhoneAlt } from "react-icons/fa";
import { useLanguage } from "@/lib/language-context";
import { HOTLINE_COLORS, bodyFor, text, type PageBlock } from "@/lib/page-blocks";

export function EmergencyHotlines({ block }: { block: PageBlock }) {
    const { language, t } = useLanguage();
    const body = bodyFor(block.kind, block.bodyEn, block.bodyBn, language);
    const items = body.items ?? [];
    if (items.length === 0) return null;

    return (
        <div>
            <h2 className="font-bold text-xs uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <FaPhoneAlt className="text-primary" size={11} />
                {text(body.title)}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {items.map((h, index) => {
                    const num = text(h.num);
                    const color = text(h.color) || HOTLINE_COLORS[index % HOTLINE_COLORS.length];
                    return (
                        <a
                            key={`${num}-${index}`}
                            href={`tel:${num}`}
                            className={`${color} text-white rounded-lg p-2 text-center hover:opacity-90 transition-opacity`}
                            title={`${text(h.label)}: ${num}`}
                        >
                            <span className="block font-black text-lg leading-none">{num}</span>
                            <span className="block text-[9px] font-semibold mt-0.5 leading-tight">
                                {text(h.label)}
                            </span>
                        </a>
                    );
                })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
                {t("Toll-free · 24/7 · Source: bangladesh.gov.bd", "টোল-ফ্রি · ২৪/৭ · উৎস: bangladesh.gov.bd")}
            </p>
        </div>
    );
}
