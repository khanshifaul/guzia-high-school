"use client";

// components/teacher/studio/citation-chip.tsx — one verified [file p.N] chip.
// The citation set is decided by the server; a chip only navigates.
import type { Citation } from "@/lib/studio";

export function CitationChip({ citation, onOpen }: { citation: Citation; onOpen: () => void }) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[10px] transition-colors hover:border-primary/50 cursor-pointer"
        >
            <span className="max-w-[220px] truncate font-black uppercase tracking-wider">
                {citation.filename ?? "source"}
            </span>
            <span className="text-muted-foreground">p.{citation.page ?? "?"}</span>
        </button>
    );
}
