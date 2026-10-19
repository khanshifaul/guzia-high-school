"use client";

// app/(portal)/teacher/tests/[id]/print/page.tsx — the print view of a test
// paper.
//
// A dedicated route (like zylosync's /orders/[id]/print) so the sheet is
// printed on its own: the portal layout renders this route without the
// sidebar or header, and the toolbar below is hidden on paper.
//
// Query params:
//   answers=1     include the answer key (the teacher's copy)
//   sheet=1       append a detachable answer sheet

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FaArrowLeft, FaPrint } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    mode?: string;
    questions: PaperQuestion[];
    class: { name: string };
    subject: { name: string };
    teacher?: { user: { fullName: string } } | null;
}

export default function TeacherTestPrintPage() {
    const params = useParams<{ id: string }>();
    const search = useSearchParams();
    const paperId = params?.id as string;
    const site = useSiteConfig();

    const [paper, setPaper] = React.useState<Paper | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const showAnswers = search?.get("answers") === "1";
    const answerSheet = search?.get("sheet") === "1";

    React.useEffect(() => {
        if (!paperId) return;
        api<Paper>(`/ai/tests/${paperId}`)
            .then((p) => setPaper(p))
            .catch((err) =>
                setError(err instanceof RequestError ? err.messages.join("; ") : "Could not load the paper"),
            )
            .finally(() => setLoading(false));
    }, [paperId]);

    // Auto-print once the sheet is ready — wait for fonts so the print does
    // not fall back to a default face mid-layout. The ref guard keeps it to
    // exactly one print dialog: React re-runs effects in development, and a
    // second dialog would block the teacher behind two print previews.
    const printed = React.useRef(false);
    React.useEffect(() => {
        if (!paper || loading || printed.current) return;
        printed.current = true;
        (async () => {
            await document.fonts.ready;
            window.print();
        })();
    }, [paper, loading]);

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
            <div className="min-h-screen flex items-center justify-center bg-muted/10">
                <Skeleton className="h-[297mm] w-[210mm]" />
            </div>
        );
    }

    if (error || !paper) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted/10 p-8 text-center">
                <h1 className="text-2xl font-black uppercase tracking-tight text-destructive">Print error</h1>
                <p className="text-sm text-muted-foreground">{error ?? "This paper is not available."}</p>
                <Link href="/teacher/studio?view=tests">
                    <Button variant="outline">
                        <FaArrowLeft size={12} /> Back to papers
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-muted/10 print:bg-white">
            {/* Toolbar — hidden on paper. */}
            <div className="print:hidden sticky top-0 z-50 w-full border-b border-border/60 bg-white px-6 py-3 shadow-sm">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button onClick={() => window.print()} className="font-black text-xs uppercase tracking-wider">
                            <FaPrint size={13} /> Print
                        </Button>
                        <Link href={`/teacher/tests/${paper.id}`}>
                            <Button variant="outline" className="font-black text-xs uppercase tracking-wider">
                                <FaArrowLeft size={12} /> Back
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/teacher/tests/${paper.id}/print${showAnswers ? "" : "?answers=1"}`}
                            className="text-[10px] font-black uppercase tracking-wider text-primary underline"
                        >
                            {showAnswers ? "Without answer key" : "With answer key"}
                        </Link>
                        <Link
                            href={`/teacher/tests/${paper.id}/print${answerSheet ? "" : "?sheet=1"}${showAnswers ? "&answers=1" : ""}`}
                            className="text-[10px] font-black uppercase tracking-wider text-primary underline"
                        >
                            {answerSheet ? "Without answer sheet" : "With answer sheet"}
                        </Link>
                    </div>
                </div>
            </div>

            <div className="flex justify-center py-6 print:p-0">
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
