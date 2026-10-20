"use client";

// components/public/notice-ticker.tsx — auto-scrolling notice strip (the
// signature BD school-site element). Pulls the latest public notices.

import * as React from "react";
import Link from "next/link";
import { FaBullhorn } from "react-icons/fa6";
import { PUBLIC_EVENTS } from "@/lib/public-content";

interface Notice {
    id: string;
    title: string;
    createdAt: string;
}

export function NoticeTicker() {
    const [notices, setNotices] = React.useState<Notice[]>([]);

    React.useEffect(() => {
        // Public global notices (audience: null) for the ticker.
        fetch("/api/notices/public", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((p) => {
                if (Array.isArray(p?.data)) setNotices(p.data.slice(0, 6));
            })
            .catch(() => setNotices([]));
    }, []);

    // One strip for the same things the site announces: live public notices
    // first, then the calendar events shown on the homepage and /news.
    const items = React.useMemo(() => {
        const seen = new Set<string>();
        const merged = [
            ...notices.map((n) => ({ id: n.id, title: n.title, date: n.createdAt })),
            ...PUBLIC_EVENTS.map((e) => ({ id: `event-${e.title}`, title: e.title, date: e.date })),
        ];
        return merged.filter((item) => {
            const key = item.title.trim().toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [notices]);

    if (items.length === 0) return null;

    return (
        <div className="w-full bg-primary text-primary-foreground overflow-hidden border-b border-primary/40">
            <div className="container mx-auto px-4 md:px-8 max-w-7xl flex items-center gap-3 h-9">
                <span className="flex items-center gap-1.5 shrink-0 text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-1 rounded">
                    <FaBullhorn size={10} /> Notice
                </span>
                <div className="relative flex-1 overflow-hidden whitespace-nowrap">
                    <div className="inline-flex animate-[ticker_30s_linear_infinite] hover:[animation-play-state:paused]">
                        {[...items, ...items].map((n, i) => (
                            <Link
                                key={`${n.id}-${i}`}
                                href="/news"
                                className="inline-flex items-center gap-2 mx-6 text-xs font-semibold hover:underline"
                            >
                                <span className="opacity-90">•</span>
                                {n.title}
                                <span className="opacity-90 text-[10px]">
                                    {new Date(n.date).toLocaleDateString("en-GB")}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
            <style>{`@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
        </div>
    );
}
