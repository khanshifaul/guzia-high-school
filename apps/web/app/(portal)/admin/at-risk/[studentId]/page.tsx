"use client";

// app/(portal)/admin/at-risk/[studentId]/page.tsx — the drill-in from the
// at-risk board.
//
// specs/06 flow 4: "board flags student X (HIGH 0.82, factors: attendance
// 0.41, submission rate 0.25, GPA trend −0.20) → drill into student confirms
// the story". So the page has to show the magnitude of each factor, not just
// its name, next to the student's actual attendance, grades and fees.

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FaArrowLeft, FaBrain, FaTriangleExclamation } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { api } from "@/lib/api";

interface Contribution {
    feature: string;
    value: number;
    contribution: number;
    direction: "risk" | "safe";
}

interface RiskDetail {
    studentId: string;
    computed: boolean;
    fullName?: string;
    className?: string;
    sectionName?: string | null;
    score?: number;
    atRisk?: boolean;
    threshold?: number;
    factors?: Record<string, number>;
    contributions?: Contribution[];
    computedAt?: string;
}

interface StudentDetail {
    id: string;
    fullName: string;
    admissionNo: string;
    class: { name: string };
    section: { name: string } | null;
    stats: { attendancePct: number; cgpa: number; totalDue: number };
    transcript: { exams: { id: string; name: string; gpa: number }[] };
}

/** The five model features, in the order specs/07 lists them. */
const FEATURES: { key: string; label: string; hint: string; better: "high" | "low" }[] = [
    { key: "attendanceRate", label: "Attendance", hint: "Share of the last 60 school days present or late", better: "high" },
    { key: "submissionRate", label: "Submission rate", hint: "Share of assignments handed in", better: "high" },
    { key: "gpaTrend", label: "GPA trend", hint: "Direction of the grade average over recent exams", better: "high" },
    { key: "invLateRate", label: "Punctuality", hint: "Share of fee invoices paid after the due date", better: "low" },
    { key: "invOverdueFee", label: "Fee status", hint: "Share of the fee bill still outstanding", better: "low" },
];

export default function AtRiskStudentPage() {
    const { studentId } = useParams<{ studentId: string }>();
    const [risk, setRisk] = React.useState<RiskDetail | null>(null);
    const [student, setStudent] = React.useState<StudentDetail | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        Promise.all([
            api<RiskDetail>(`/ai/at-risk/${studentId}`).catch(() => null),
            api<StudentDetail>(`/students/${studentId}`).catch(() => null),
        ])
            .then(([r, s]) => {
                setRisk(r);
                setStudent(s);
                if (!r && !s) setError("Student not found");
            })
            .finally(() => setLoading(false));
    }, [studentId]);

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="At-Risk Detail" icon={FaBrain} />
                <Skeleton className="h-28" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error || !student) {
        return (
            <div className="space-y-6">
                <PageHeader title="At-Risk Detail" icon={FaBrain} />
                <EmptyState title="Not found" description={error ?? "Student not found"} />
            </div>
        );
    }

    const score = risk?.score ?? 0;
    const threshold = risk?.threshold ?? 0.5;
    const factors = risk?.factors ?? {};
    const contributions = risk?.contributions ?? [];
    const contributionBy = new Map(contributions.map((c) => [c.feature, c]));

    return (
        <div className="space-y-6">
            <PageHeader
                title={student.fullName}
                subtitle={`${student.admissionNo} · ${student.class.name}${student.section ? `-${student.section.name}` : ""}`}
                icon={FaBrain}
                actions={
                    <Link href="/admin/at-risk">
                        <Button variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">
                            <FaArrowLeft size={12} /> Back to board
                        </Button>
                    </Link>
                }
            />

            {!risk?.computed ? (
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-6 flex items-start gap-3">
                        <FaTriangleExclamation size={14} className="mt-0.5 shrink-0 text-warning" />
                        <div>
                            <p className="text-sm font-bold">No risk score for this student yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Run Recompute Scores on the at-risk board to score every active student.
                            </p>
                            <Link href="/admin/at-risk" className="inline-block mt-3">
                                <Button variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">
                                    Go to board
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard
                            value={`${Math.round(score * 100)}%`}
                            label="Risk score"
                            hint={`Threshold ${Math.round(threshold * 100)}%`}
                        />
                        <StatCard
                            value={`${student.stats.attendancePct}%`}
                            label="Attendance"
                            hint="Last 60 school days"
                        />
                        <StatCard value={student.stats.cgpa.toFixed(2)} label="CGPA" />
                        <StatCard value={`৳${student.stats.totalDue}`} label="Pending Fees" />
                    </div>

                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-black uppercase tracking-tight">
                                Why this student is flagged
                            </CardTitle>
                            <Badge
                                className={
                                    risk?.atRisk
                                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                }
                            >
                                {risk?.atRisk ? "AT RISK" : "NOT AT RISK"}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                        Model score
                                    </span>
                                    <span className="text-xs font-black">
                                        {(score * 100).toFixed(1)}% (threshold {Math.round(threshold * 100)}%)
                                    </span>
                                </div>
                                <Progress value={score * 100} />
                            </div>

                            <div className="space-y-4">
                                {FEATURES.map((f) => {
                                    const value = factors[f.key];
                                    if (value === undefined) return null;
                                    const contribution = contributionBy.get(f.key);
                                    const pct = Math.round(value * 100);
                                    return (
                                        <div key={f.key}>
                                            <div className="flex items-center justify-between gap-3 mb-1">
                                                <div>
                                                    <span className="text-sm font-bold">{f.label}</span>
                                                    {contribution ? (
                                                        <span
                                                            className={`ml-2 text-[10px] font-black uppercase tracking-wider ${
                                                                contribution.direction === "risk"
                                                                    ? "text-rose-600"
                                                                    : "text-emerald-600"
                                                            }`}
                                                        >
                                                            {contribution.direction === "risk"
                                                                ? "raises risk"
                                                                : "lowers risk"}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <span className="text-sm font-black tabular-nums">{pct}%</span>
                                            </div>
                                            <Progress value={pct} />
                                            <p className="text-[10px] text-muted-foreground mt-1">{f.hint}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {student.transcript.exams.length > 0 ? (
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="border-b border-border/60 pb-4">
                                <CardTitle className="text-lg font-black uppercase tracking-tight">
                                    Exam results
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-2">
                                {student.transcript.exams.map((e) => (
                                    <div
                                        key={e.id}
                                        className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
                                    >
                                        <span className="text-sm font-semibold">{e.name}</span>
                                        <Badge className="bg-primary/10 text-primary border-primary/20">
                                            GPA {e.gpa.toFixed(2)}
                                        </Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ) : null}
                </>
            )}
        </div>
    );
}
