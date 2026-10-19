"use client";

// components/teacher/studio/source-detail-dialog.tsx — a source's summary, key
// topics, suggested questions and extracted text. The detail endpoint is the
// same one the citation jump uses.
import * as React from "react";
import { FaLink, FaSpinner } from "react-icons/fa6";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { StudioSource } from "@/lib/studio";
import { statusStyle } from "./source-row";

interface SourceSummary {
    summary?: string;
    keyTopics?: string[];
    suggestedQuestions?: string[];
    fileUrl?: string;
    storage?: string;
    /** Set when a background ingest failed. */
    error?: string;
}
interface SourceDetail extends StudioSource {
    summary: SourceSummary | null;
    chunks: { page: number | null; content: string }[];
}

export function SourceDetailDialog({
    sourceId,
    onClose,
    onChanged,
}: {
    sourceId: string | null;
    onClose: () => void;
    onChanged?: () => void;
}) {
    const [detail, setDetail] = React.useState<SourceDetail | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [ocrBusy, setOcrBusy] = React.useState(false);

    React.useEffect(() => {
        if (!sourceId) return;
        setDetail(null);
        setError(null);
        setLoading(true);
        api<SourceDetail>(`/ai/sources/${sourceId}`)
            .then(setDetail)
            .catch(() => setError("Could not load this source"))
            .finally(() => setLoading(false));
    }, [sourceId]);

    async function runOcr() {
        if (!sourceId || ocrBusy) return;
        setOcrBusy(true);
        setError(null);
        try {
            await api(`/ai/sources/${sourceId}/ocr`, { method: "POST" });
            onChanged?.();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not start OCR");
        } finally {
            setOcrBusy(false);
        }
    }

    return (
        <Dialog open={sourceId !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-sm font-black uppercase tracking-tight">
                        {detail?.filename ?? "Source"}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <FaSpinner className="animate-spin text-primary" size={16} />
                    </div>
                ) : error ? (
                    <p className="text-xs font-semibold text-destructive">{error}</p>
                ) : detail ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn(statusStyle(detail.status), "text-[8px]")}>{detail.status}</Badge>
                            <span className="text-[10px] text-muted-foreground">
                                {detail.kind} · {detail.pages ?? "?"} pages
                            </span>
                            {detail.summary?.fileUrl ? (
                                <a
                                    href={detail.summary.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                                >
                                    <FaLink size={9} /> original file ({detail.summary.storage ?? "stored"})
                                </a>
                            ) : null}
                        </div>

                        {detail.status === "NEEDS_OCR" ? (
                            <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                                <p className="text-xs font-semibold text-amber-700">
                                    {detail.error ?? detail.summary?.error ?? "This PDF is a scan (no text layer)."}
                                </p>
                                <Button size="sm" onClick={() => void runOcr()} disabled={ocrBusy}
                                    className="font-black text-[10px] uppercase tracking-wider">
                                    {ocrBusy ? <FaSpinner className="animate-spin" size={10} /> : null} Transcribe with OCR
                                </Button>
                            </div>
                        ) : detail.error ?? detail.summary?.error ? (
                            <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                                {detail.error ?? detail.summary?.error}
                            </p>
                        ) : null}

                        <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                            <p className="text-[10px] font-black uppercase tracking-wider text-primary">Summary</p>
                            <p className="text-sm">
                                {detail.summary?.summary ?? "No summary was generated for this source."}
                            </p>
                            {(detail.summary?.keyTopics?.length ?? 0) > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {detail.summary?.keyTopics?.map((topic) => (
                                        <Badge key={topic} className="border-primary/20 bg-primary/10 text-[9px] text-primary">
                                            {topic}
                                        </Badge>
                                    ))}
                                </div>
                            ) : null}
                            {(detail.summary?.suggestedQuestions?.length ?? 0) > 0 ? (
                                <div className="pt-1">
                                    <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                                        Suggested questions
                                    </p>
                                    <ul className="list-disc pl-4 text-xs text-muted-foreground">
                                        {detail.summary?.suggestedQuestions?.map((question) => (
                                            <li key={question}>{question}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                Extracted text
                            </p>
                            {detail.chunks.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    {detail.status === "FAILED"
                                        ? "No text was extracted."
                                        : "No text extracted yet — the source is still processing."}
                                </p>
                            ) : (
                                detail.chunks.map((chunk, index) => (
                                    <div
                                        key={`${chunk.page ?? "?"}-${index}`}
                                        className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground"
                                    >
                                        <span className="text-[9px] font-black uppercase text-primary">
                                            p.{chunk.page ?? "?"}{" "}
                                        </span>
                                        {chunk.content}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
