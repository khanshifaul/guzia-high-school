"use client";

// components/public/page-unavailable.tsx — the empty state a public page shows
// when the page itself is unpublished (or has not been created). A missing or
// unpublished BLOCK only removes its own section; this is the whole-page case.

import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/lib/language-context";

export function PageUnavailable() {
    const { t } = useLanguage();
    return (
        <section className="py-20 md:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <EmptyState
                    title={t("This page is not published yet", "এই পৃষ্ঠাটি এখনো প্রকাশিত হয়নি")}
                    description={t(
                        "The school office has not published this content. Please check back later.",
                        "স্কুল অফিস এই বিষয়বস্তু এখনো প্রকাশ করেনি। অনুগ্রহ করে পরে দেখুন।",
                    )}
                />
            </div>
        </section>
    );
}
