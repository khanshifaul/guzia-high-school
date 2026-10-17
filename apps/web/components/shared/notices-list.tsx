"use client";

// components/shared/notices-list.tsx — reusable audience-filtered notices list
// (student/parent/teacher dashboards all render this).

import * as React from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api";

export interface Notice {
    id: string;
    title: string;
    body: string;
    audience: string | null;
    createdAt: string;
}

export function NoticesList({ title = "Notices", limit }: { title?: string; limit?: number }) {
    const [notices, setNotices] = React.useState<Notice[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        api<{ data: Notice[] }>("/notices")
            .then((p) => setNotices(limit ? p.data.slice(0, limit) : p.data))
            .catch(() => setNotices([]))
            .finally(() => setLoading(false));
    }, [limit]);

    if (loading) {
        return <Card className="border-border/60 shadow-sm"><CardContent className="p-6 space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></CardContent></Card>;
    }

    return (
        <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="text-xl font-black uppercase tracking-tight">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                {notices.length === 0 ? (
                    <EmptyState title="No notices" description="Announcements from the school will appear here." />
                ) : (
                    <div className="space-y-3">
                        {notices.map((n) => (
                            <motion.div key={n.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-card border border-border/60 rounded-xl p-4 hover:border-primary/20 transition-all">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm font-bold">{n.title}</p>
                                    {n.audience ? (
                                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-wider shrink-0">
                                            {n.audience}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase tracking-wider shrink-0">
                                            All
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                                <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleDateString()}</p>
                            </motion.div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
