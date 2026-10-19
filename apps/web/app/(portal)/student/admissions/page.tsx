"use client";

// app/(portal)/student/admissions/page.tsx — applicant view of their own
// admission application (read-only). Only the logged-in applicant can see it.

import * as React from "react";
import { FaUserCheck, FaFileLines, FaGraduationCap } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";
import Link from "next/link";

interface Application {
    id: string;
    userId: string | null;
    formData: Record<string, string>;
    status: string;
    submittedAt: string;
    reviewedAt: string | null;
    reviewNote: string | null;
}

const STATUS_STYLE: Record<string, string> = {
    SUBMITTED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    REJECTED: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const READONLY_FIELDS: { key: string; label: string }[] = [
    { key: "studentName", label: "Student name" },
    { key: "guardianName", label: "Guardian name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "classWanted", label: "Class wanted" },
];

export default function StudentAdmissionsPage() {
    const [app, setApp] = React.useState<Application | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        api<{ data: Application }>("/admissions/me")
            .then((p) => setApp(p.data))
            .catch((err) => {
                if (err instanceof RequestError && err.statusCode === 404) {
                    setApp(null);
                    setError(null);
                } else {
                    setError(err instanceof RequestError ? err.messages.join("; ") : "Failed to load application");
                }
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading)
        return (
            <div className="space-y-6">
                <PageHeader title="My Application" icon={FaUserCheck} />
                <Skeleton className="h-32" />
            </div>
        );

    if (!app)
        return (
            <div className="space-y-6">
                <PageHeader title="My Application" icon={FaUserCheck} />
                {error ? (
                    <div className="p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border bg-destructive/10 text-destructive border-destructive/20">
                        {error}
                    </div>
                ) : (
                    <EmptyState
                        title="No application found"
                        description="You have not submitted an admission application yet."
                        action={
                            <Link href="/admission" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider hover:text-primary">
                                <FaGraduationCap size={14} /> Apply now
                            </Link>
                        }
                    />
                )}
            </div>
        );

    return (
        <div className="space-y-6">
            <PageHeader title="My Application" subtitle="Your submitted admission form" icon={FaUserCheck} />

            <div className="flex items-center justify-between">
                <Badge className={STATUS_STYLE[app.status]}>{app.status}</Badge>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Submitted {new Date(app.submittedAt).toLocaleDateString()}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {READONLY_FIELDS.map((f) => (
                    <Card key={f.key} className="border-border/60 shadow-sm">
                        <CardContent className="p-4">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">
                                {f.label}
                            </p>
                            <p className="text-sm font-bold">{app.formData[f.key] ?? "—"}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <FaFileLines size={16} /> Full form data
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <pre className="text-[10px] text-muted-foreground overflow-x-auto bg-muted/50 p-3 rounded">
                        {JSON.stringify(app.formData, null, 2)}
                    </pre>
                </CardContent>
            </Card>

            {app.reviewNote && (
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">
                            Admin note
                        </p>
                        <p className="text-sm">{app.reviewNote}</p>
                    </CardContent>
                </Card>
            )}

            <Link href="/student" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider hover:text-primary">
                <FaGraduationCap size={14} /> Back to dashboard
            </Link>
        </div>
    );
}
