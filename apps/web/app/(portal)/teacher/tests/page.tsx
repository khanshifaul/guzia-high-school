"use client";

// app/(portal)/teacher/tests/page.tsx — AI test papers: list, open a paper,
// print. Generation lives on /teacher/tests/new; a paper's own page lives
// on /teacher/tests/[id]; printing on /teacher/tests/[id]/print.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FaClipboardList, FaPlus, FaPrint, FaEye, FaDesktop, FaPrint as FaPrintIcon, FaUsers } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";

interface Paper {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    status: string;
    mode?: string;
    class: { name: string };
    subject: { name: string };
    _count?: { questions: number };
}

export default function TeacherTestsPage() {
    const [papers, setPapers] = React.useState<Paper[]>([]);
    const [loading, setLoading] = React.useState(true);

    const load = React.useCallback(() => {
        api<Paper[]>("/ai/tests")
            .then((p) => setPapers(p))
            .catch(() => setPapers([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => { load(); }, [load]);

    if (loading) return <div className="space-y-6"><PageHeader title="Test Papers" icon={FaClipboardList} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Test Papers" subtitle="AI-generated papers you can review & print" icon={FaClipboardList}
                actions={
                    <Link href="/teacher/tests/new">
                        <Button className="font-black text-xs uppercase tracking-wider cursor-pointer"><FaPlus size={12} /> Generate Paper</Button>
                    </Link>
                } />

            {papers.length === 0 ? (
                <EmptyState title="No papers yet" description="Generate your first AI test paper." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {papers.map((p) => (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border-border/60 shadow-sm h-full">
                                <CardHeader className="border-b border-border/60 pb-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <CardTitle className="text-lg font-black uppercase tracking-tight">{p.title}</CardTitle>
                                        <Badge variant="outline" className="shrink-0 gap-1 text-[9px] font-black uppercase tracking-wider">
                                            {p.mode === "ONLINE" ? <><FaDesktop size={10} /> Online</> : <><FaPrintIcon size={10} /> Print</>}
                                        </Badge>
                                    </div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                                        {p.class.name} · {p.subject.name} · {p.totalMarks} marks · {p.durationMinutes} min
                                    </p>
                                </CardHeader>
                                <CardContent className="p-5 flex flex-wrap gap-2">
                                    <Link href={`/teacher/tests/${p.id}`}>
                                        <Button size="sm" className="font-black text-[10px] uppercase tracking-wider"><FaEye size={11} /> View</Button>
                                    </Link>
                                    <Link href={`/teacher/tests/${p.id}/print`}>
                                        <Button size="sm" variant="outline" className="font-black text-[10px] uppercase tracking-wider"><FaPrint size={11} /> Print</Button>
                                    </Link>
                                    {p.mode === "ONLINE" ? (
                                        <Link href={`/teacher/tests/${p.id}/attempts`}>
                                            <Button size="sm" variant="outline" className="font-black text-[10px] uppercase tracking-wider">
                                                <FaUsers size={11} /> Attempts
                                            </Button>
                                        </Link>
                                    ) : null}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
