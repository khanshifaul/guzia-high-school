"use client";

// app/(portal)/teacher/tests/[id]/page.tsx — view a test paper on screen.
//
// Replaces the old modal: the paper gets its own URL so it can be linked,
// reloaded, and printed. The print route (/teacher/tests/[id]/print) renders
// the same document without the portal chrome.

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FaArrowLeft, FaEye, FaEyeSlash, FaPrint, FaUser, FaListOl } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import {
    TestPaperDocument,
    type Letterhead,
    type PaperQuestion,
} from "@/components/shared/test-paper";
import { api, RequestError } from "@/lib/api";
import { useSiteConfig } from "@/lib/site-config";

interface Paper {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    status: string;
    mode?: string;
    questions: PaperQuestion[];
    class: { name: string };
    subject: { name: string };
    teacher?: { user: { fullName: string } } | null;
}

export default function TeacherTestViewPage() {
    const params = useParams<{ id: string }>();
    const paperId = params?.id as string;
    const site = useSiteConfig();

    const [paper, setPaper] = React.useState<Paper | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [showAnswers, setShowAnswers] = React.useState(false);
    const [answerSheet, setAnswerSheet] = React.useState(false);

    React.useEffect(() => {
        if (!paperId) return;
        api<Paper>(`/ai/tests/${paperId}`)
            .then((p) => setPaper(p))
            .catch((err) =>
                setError(err instanceof RequestError ? err.messages.join("; ") : "Could not load the paper"),
            )
            .finally(() => setLoading(false));
    }, [paperId]);

    const letterhead: Letterhead = {
        schoolName: site.schoolName,
        schoolNameBn: site.schoolNameBn,
        address: site.address,
        phone: site.phone,
        email: site.email,
        eiin: site.eiin,
        board: site.board,
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Test Paper" icon={FaUser} />
                <Skeleton className="h-32" />
            </div>
        );
    }

    if (error || !paper) {
        return (
            <div className="space-y-6">
                <PageHeader title="Test Paper" icon={FaUser} />
                <EmptyState title="Paper not found" description={error ?? "This paper is not available."} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={paper.title}
                subtitle={`${paper.class.name} · ${paper.subject.name} · ${paper.totalMarks} marks · ${paper.durationMinutes} min`}
                icon={FaUser}
                actions={
                    <>
                        <Link href="/teacher/tests">
                            <Button variant="outline" className="font-black text-xs uppercase tracking-wider">
                                <FaArrowLeft size={12} /> Back
                            </Button>
                        </Link>
                        <Link href={`/teacher/tests/${paper.id}/print`}>
                            <Button className="font-black text-xs uppercase tracking-wider">
                                <FaPrint size={12} /> Print
                            </Button>
                        </Link>
                    </>
                }
            />

            {/* Screen-only toolbar. `print:hidden` keeps it off the sheet. */}
            <div className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAnswers((s) => !s)}
                        className="font-black text-[10px] uppercase tracking-wider"
                    >
                        {showAnswers ? <FaEyeSlash size={11} /> : <FaEye size={11} />}
                        {showAnswers ? "Hide" : "Show"} Answer Key
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAnswerSheet((s) => !s)}
                        className="font-black text-[10px] uppercase tracking-wider"
                    >
                        <FaListOl size={11} /> {answerSheet ? "Hide" : "Add"} Answer Sheet
                    </Button>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider">
                        {paper.mode === "ONLINE" ? "Online" : "Print"}
                    </Badge>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    AI-generated — verify before use
                </p>
            </div>

            <div className="overflow-x-auto">
                <TestPaperDocument
                    paper={paper.questions}
                    meta={{
                        title: paper.title,
                        className: paper.class.name,
                        subjectName: paper.subject.name,
                        totalMarks: paper.totalMarks,
                        durationMinutes: paper.durationMinutes,
                        teacherName: paper.teacher?.user.fullName ?? "",
                        questionCount: paper.questions.length,
                    }}
                    letterhead={letterhead}
                    showAnswers={showAnswers}
                    answerSheet={answerSheet}
                />
            </div>
        </div>
    );
}
