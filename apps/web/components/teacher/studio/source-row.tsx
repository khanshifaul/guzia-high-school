"use client";

// components/teacher/studio/source-row.tsx — one attached source in the
// workspace. Non-READY rows are shown but excluded from retrieval.
import { FaTrash } from "react-icons/fa6";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudioSource } from "@/lib/studio";

/** The pill colour for a source status; one place so it cannot drift. */
export function statusStyle(status: string): string {
    if (status === "READY") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (status === "FAILED") return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
}

export function SourceRow({
    source,
    onOpen,
    onDetach,
    onOcr,
    ocrBusy,
}: {
    source: StudioSource;
    onOpen: () => void;
    onDetach: () => void;
    onOcr?: () => void;
    ocrBusy?: boolean;
}) {
    return (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 p-2 transition-colors hover:border-primary/40">
            <div
                role="button"
                tabIndex={0}
                onClick={onOpen}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpen();
                    }
                }}
                className="min-w-0 flex-1 cursor-pointer text-left"
            >
                <p className="truncate text-xs font-semibold">{source.filename}</p>
                <div className="mt-1 flex items-center gap-1.5">
                    <Badge className={cn(statusStyle(source.status), "text-[8px]")}>{source.status}</Badge>
                    <span className="text-[9px] text-muted-foreground">{source.pages ?? "?"}p</span>
                </div>
                {source.status !== "READY" && source.status !== "FAILED" ? (
                    <p className="mt-1 text-[9px] text-amber-600">Not searchable until it finishes processing.</p>
                ) : null}
                {source.status === "NEEDS_OCR" ? (
                    <div className="mt-1 space-y-1">
                        <p className="text-[9px] leading-snug text-amber-600">
                            {source.error ?? "This PDF is a scan (no text layer)."}
                        </p>
                        {onOcr ? (
                            <button
                                type="button"
                                onClick={onOcr}
                                disabled={ocrBusy}
                                className="text-[9px] font-black uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
                            >
                                {ocrBusy ? "Starting…" : "Transcribe (OCR)"}
                            </button>
                        ) : null}
                    </div>
                ) : null}
                {source.status === "FAILED" ? (
                    <p className="mt-1 text-[9px] leading-snug text-rose-600">
                        {source.error ?? "Processing failed — remove and upload again."}
                    </p>
                ) : null}
            </div>
            <button
                type="button"
                aria-label={`Detach ${source.filename}`}
                onClick={onDetach}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
            >
                <FaTrash size={10} />
            </button>
        </div>
    );
}
