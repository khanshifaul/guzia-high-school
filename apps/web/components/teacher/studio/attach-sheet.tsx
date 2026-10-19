"use client";

// components/teacher/studio/attach-sheet.tsx — pick library sources to attach.
// Attaching is a pointer: nothing is uploaded or re-embedded here.
import * as React from "react";
import { FaSpinner } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { api, RequestError } from "@/lib/api";
import type { StudioSource } from "@/lib/studio";
import { statusStyle } from "./source-row";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AttachSheet({
    open,
    onOpenChange,
    workspaceId,
    attachedIds,
    onAttached,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    attachedIds: string[];
    onAttached: () => void;
}) {
    const [sources, setSources] = React.useState<StudioSource[]>([]);
    const [selected, setSelected] = React.useState<string[]>([]);
    const [query, setQuery] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!open) return;
        setSelected([]);
        setError(null);
        api<StudioSource[]>("/ai/sources")
            .then(setSources)
            .catch(() => setSources([]));
    }, [open]);

    const attached = new Set(attachedIds);
    const available = sources
        .filter((source) => !attached.has(source.id))
        .filter((source) => source.filename.toLowerCase().includes(query.toLowerCase()));

    function toggle(id: string) {
        setSelected((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
        );
    }

    async function attach() {
        setBusy(true);
        setError(null);
        try {
            await api(`/workspaces/${workspaceId}/sources`, {
                method: "POST",
                body: { sourceIds: selected },
            });
            onAttached();
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not attach");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md flex flex-col">
                <SheetHeader>
                    <SheetTitle className="font-black uppercase tracking-tight">Attach sources</SheetTitle>
                    <SheetDescription>
                        From your library. Attaching reuses the existing chunks — nothing is uploaded again.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-4 flex-1 min-h-0 flex flex-col gap-3">
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the library…" className="h-10" />
                    {error ? (
                        <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-[11px] font-bold text-destructive">
                            {error}
                        </p>
                    ) : null}
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {available.length === 0 ? (
                            <p className="py-8 text-center text-xs text-muted-foreground">
                                {sources.length === 0 ? "Your library is empty." : "Everything here is already attached."}
                            </p>
                        ) : (
                            available.map((source) => (
                                <label
                                    key={source.id}
                                    className="flex items-center gap-2.5 rounded-lg border border-border/60 p-2.5 cursor-pointer hover:border-primary/40"
                                >
                                    <Checkbox
                                        checked={selected.includes(source.id)}
                                        onCheckedChange={() => toggle(source.id)}
                                        aria-label={`Attach ${source.filename}`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold">{source.filename}</p>
                                        <div className="mt-1 flex items-center gap-1.5">
                                            <Badge className={cn(statusStyle(source.status), "text-[8px]")}>{source.status}</Badge>
                                            <span className="text-[9px] text-muted-foreground">{source.pages ?? "?"}p</span>
                                        </div>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <SheetFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
                    <Button onClick={() => void attach()} disabled={busy || selected.length === 0} className="w-auto">
                        {busy ? <FaSpinner className="animate-spin" size={12} /> : `Attach ${selected.length || ""}`.trim()}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
