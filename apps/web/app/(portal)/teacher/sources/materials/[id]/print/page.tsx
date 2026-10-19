"use client";

// app/(portal)/teacher/sources/materials/[id]/print/page.tsx — the print view
// of a study material (flashcard deck or mind map).
//
// A dedicated route (like zylosync's /orders/[id]/print) so the sheet is
// printed on its own: the portal layout renders this route without the
// sidebar or header, and the toolbar is hidden on paper.
//
// Query params:
//   answers=1     include the answer key (the teacher's copy); the default
//                 prints a blank answer column for the students

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FaArrowLeft, FaPrint } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    StudyMaterialDocument,
    type FlashcardsContent,
    type Letterhead,
    type MaterialMeta,
    type MindmapContent,
    type StudyMaterialKind,
} from "@/components/shared/study-material";
import { api, RequestError } from "@/lib/api";
import { useSiteConfig } from "@/lib/site-config";

interface Material {
    id: string;
    kind: StudyMaterialKind;
    title: string;
    content: FlashcardsContent | MindmapContent;
    className?: string | null;
    subjectName?: string | null;
    sourceName?: string | null;
    createdAt?: string;
}

export default function StudyMaterialPrintPage() {
    const params = useParams<{ id: string }>();
    const search = useSearchParams();
    const materialId = params?.id as string;
    const site = useSiteConfig();

    const [material, setMaterial] = React.useState<Material | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const showAnswers = search?.get("answers") === "1";

    React.useEffect(() => {
        api<Material>(`/ai/materials/${materialId}`)
            .then((m) => setMaterial(m))
            .catch((err) =>
                setError(
                    err instanceof RequestError
                        ? err.messages.join("; ")
                        : "This study material is not available.",
                ),
            )
            .finally(() => setLoading(false));
    }, [materialId]);

    // Auto-print once the sheet is ready. The ref guard keeps it to exactly
    // one print dialog: React re-runs effects in development, and a second
    // dialog would block the teacher behind two print previews.
    const printed = React.useRef(false);
    React.useEffect(() => {
        if (loading || !material || printed.current) return;
        printed.current = true;
        const t = setTimeout(() => window.print(), 400);
        return () => clearTimeout(t);
    }, [material, loading]);

    const letterhead: Letterhead = {
        schoolName: site.schoolName ?? "Guzia High School",
        address: site.address ?? "",
        phone: site.phone ?? "",
        email: site.email ?? "",
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full bg-muted/10 p-8 print:bg-white">
                <Skeleton className="mx-auto h-96 max-w-3xl" />
            </div>
        );
    }

    if (error || !material) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted/10 p-8 text-center">
                <p className="text-sm text-muted-foreground">{error ?? "Not found."}</p>
                <Link href="/teacher/sources">
                    <Button variant="outline">
                        <FaArrowLeft size={12} /> Back to sources
                    </Button>
                </Link>
            </div>
        );
    }

    const meta: MaterialMeta = {
        title: material.title,
        kind: material.kind,
        className: material.className,
        subjectName: material.subjectName,
        sourceName: material.sourceName,
        createdAt: material.createdAt,
    };

    return (
        <div className="min-h-screen w-full bg-muted/10 print:bg-white">
            {/* Toolbar — hidden on paper. */}
            <div className="print:hidden sticky top-0 z-50 w-full border-b border-border/60 bg-white px-6 py-3 shadow-sm">
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button onClick={() => window.print()} className="font-black text-xs uppercase tracking-wider">
                            <FaPrint size={13} /> Print
                        </Button>
                        <Link href="/teacher/sources">
                            <Button variant="outline" className="font-black text-xs uppercase tracking-wider">
                                <FaArrowLeft size={12} /> Back
                            </Button>
                        </Link>
                    </div>
                    {material.kind === "FLASHCARDS" ? (
                        <Link
                            href={`/teacher/sources/materials/${material.id}/print${showAnswers ? "" : "?answers=1"}`}
                            className="text-[10px] font-black uppercase tracking-wider text-primary underline"
                        >
                            {showAnswers ? "Without answer key" : "With answer key"}
                        </Link>
                    ) : null}
                </div>
            </div>

            <div className="flex justify-center py-6 print:p-0">
                <StudyMaterialDocument
                    kind={material.kind}
                    content={material.content}
                    meta={meta}
                    letterhead={letterhead}
                    answers={material.kind === "FLASHCARDS" ? showAnswers : undefined}
                />
            </div>
        </div>
    );
}
