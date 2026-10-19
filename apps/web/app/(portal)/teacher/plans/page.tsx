"use client";

// app/(portal)/teacher/plans/page.tsx — AI year/term lesson plans: a list of
// plan cards; the editable week grid lives on the plan's own page.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FaBookOpen, FaPlus, FaArrowRight, FaCalendarDays } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";

interface PlanWeek {
    week: number;
    startAt: string;
    topics: string[];
    objective: string;
    assessment: string | null;
    status: string;
}

interface Plan {
    id: string;
    title: string;
    type: string;
    status: string;
    startDate: string;
    weeks: PlanWeek[];
    class: { name: string };
    subject: { name: string };
}

export default function TeacherPlansPage() {
    const [plans, setPlans] = React.useState<Plan[]>([]);
    const [loading, setLoading] = React.useState(true);

    const load = React.useCallback(() => {
        api<Plan[]>("/ai/plans")
            .then((p) => setPlans(p))
            .catch(() => setPlans([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Lesson Plans" icon={FaBookOpen} />
                <Skeleton className="h-32" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Lesson Plans"
                subtitle="AI-generated year/term plans you can edit"
                icon={FaBookOpen}
                actions={
                    <Link href="/teacher/plans/new">
                        <Button className="font-black text-xs uppercase tracking-wider cursor-pointer">
                            <FaPlus size={12} /> Generate Plan
                        </Button>
                    </Link>
                }
            />

            {plans.length === 0 ? (
                <EmptyState title="No plans yet" description="Generate your first AI lesson plan." />
            ) : (
                plans.map((plan) => {
                    const done = plan.weeks.filter((w) => w.status === "DONE").length;
                    const pct = plan.weeks.length ? Math.round((done / plan.weeks.length) * 100) : 0;
                    const firstTopics = plan.weeks.slice(0, 3).flatMap((w) => w.topics).slice(0, 4);
                    return (
                        <motion.div key={plan.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-lg font-black uppercase tracking-tight">
                                            {plan.title}
                                        </CardTitle>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                                            {plan.class.name} · {plan.subject.name} · {plan.type} ·{" "}
                                            <FaCalendarDays size={10} className="inline" /> {String(plan.startDate).slice(0, 10)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={
                                                plan.status === "ACTIVE"
                                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                    : "bg-muted text-muted-foreground border-border"
                                            }
                                        >
                                            {plan.status}
                                        </Badge>
                                        <Link href={`/teacher/plans/${plan.id}`}>
                                            <Button
                                                variant="outline"
                                                className="font-black text-[10px] uppercase tracking-wider cursor-pointer"
                                            >
                                                Open <FaArrowRight size={11} />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Progress value={pct} className="flex-1" />
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                            {done}/{plan.weeks.length} weeks
                                        </span>
                                    </div>
                                    {firstTopics.length ? (
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-black uppercase tracking-wider text-[10px]">Starts with: </span>
                                            {firstTopics.join(", ")}
                                            {plan.weeks.length > 3 ? "…" : ""}
                                        </p>
                                    ) : null}
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })
            )}
        </div>
    );
}
