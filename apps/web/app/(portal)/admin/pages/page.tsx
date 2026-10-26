"use client";

import * as React from "react";
import { FaFileLines, FaArrowRight } from "react-icons/fa6";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";

interface PageSummary {
    slug: string;
    title: string;
    titleBn: string;
    published: boolean;
    updatedAt: string;
    blockCount: number;
    publishedBlockCount: number;
    blocks: { id: string; key: string; kind: string; published: boolean }[];
}

export default function AdminPagesList() {
    const [pages, setPages] = React.useState<PageSummary[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const load = React.useCallback(() => {
        setLoading(true);
        api<PageSummary[]>("/admin/pages")
            .then(setPages)
            .catch(() => setFeedback({ kind: "err", msg: "Failed to load pages" }))
            .finally(() => setLoading(false));
    }, []);
    React.useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-6">
            <PageHeader title="Pages" subtitle={`${pages.length} page${pages.length === 1 ? "" : "s"}`} icon={FaFileLines} />
            {feedback && <div className={`text-sm ${feedback.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{feedback.msg}</div>}
            {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
            ) : pages.length === 0 ? (
                <EmptyState title="No pages" description="No pages configured yet." />
            ) : (
                <div className="space-y-3">
                    {pages.map((p) => (
                        <Link key={p.slug} href={`/admin/pages/${p.slug}`}>
                            <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">{p.slug}</span>
                                            <Badge className={p.published ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}>{p.published ? "published" : "unpublished"}</Badge>
                                        </div>
                                        <p className="text-sm text-foreground mt-1">{p.title} / {p.titleBn}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{p.blockCount} blocks ({p.publishedBlockCount} published) · updated {new Date(p.updatedAt).toLocaleDateString("en-GB")}</p>
                                    </div>
                                    <FaArrowRight className="text-muted-foreground" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
