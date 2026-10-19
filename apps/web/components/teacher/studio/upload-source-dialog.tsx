"use client";

// components/teacher/studio/upload-source-dialog.tsx — the workspace's own
// "Attach source": add a file or a URL straight into this workspace. The
// source is ingested (instant return, background processing) and attached;
// it also stays in the teacher's library so it can be reused elsewhere.
import * as React from "react";
import { FaLink, FaSpinner, FaUpload } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, RequestError } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_MB = 50;
/** Direct API origin: a multipart body exceeds the Next dev proxy limit. */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "";

export function UploadSourceDialog({
    open,
    onOpenChange,
    workspaceId,
    classId,
    subjectId,
    onUploaded,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    classId: string | null;
    subjectId: string | null;
    onUploaded: (message: string) => void;
}) {
    const [mode, setMode] = React.useState<"file" | "url">("file");
    const [url, setUrl] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const fileRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!open) return;
        setMode("file");
        setUrl("");
        setError(null);
    }, [open]);

    /** One workspace attach, shared by both modes. */
    async function attach(sourceId: string) {
        await api(`/workspaces/${workspaceId}/sources`, {
            method: "POST",
            body: { sourceIds: [sourceId] },
        });
    }

    function finish(name: string) {
        onUploaded(`${name} added — processing…`);
        onOpenChange(false);
    }

    async function uploadFile(file: File) {
        if (file.size > MAX_MB * 1024 * 1024) {
            setError(`${file.name} exceeds the ${MAX_MB}MB limit`);
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const body = new FormData();
            body.append("file", file);
            if (classId) body.append("classId", classId);
            if (subjectId) body.append("subjectId", subjectId);
            const response = await fetch(`${API_ORIGIN}/api/ai/sources/upload`, {
                method: "POST",
                body,
                credentials: "include",
            });
            const created = (await response.json().catch(() => null)) as
                | { id?: string; message?: string | string[] }
                | null;
            if (!response.ok || !created?.id) {
                const message = Array.isArray(created?.message) ? created.message.join("; ") : created?.message;
                throw new Error(message ?? `Upload failed (${response.status})`);
            }
            await attach(created.id);
            finish(file.name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add that file");
        } finally {
            setBusy(false);
        }
    }

    async function addUrl() {
        setBusy(true);
        setError(null);
        try {
            const created = await api<{ id: string }>("/ai/sources/from-url", {
                method: "POST",
                body: {
                    url: url.trim(),
                    classId: classId ?? undefined,
                    subjectId: subjectId ?? undefined,
                },
            });
            await attach(created.id);
            finish(url.trim());
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not fetch that URL");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-black uppercase tracking-tight">Attach source</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant={mode === "file" ? "default" : "outline"} onClick={() => setMode("file")}
                            className="h-9 text-xs font-black uppercase tracking-wider">
                            <FaUpload size={11} /> File
                        </Button>
                        <Button type="button" variant={mode === "url" ? "default" : "outline"} onClick={() => setMode("url")}
                            className="h-9 text-xs font-black uppercase tracking-wider">
                            <FaLink size={11} /> URL
                        </Button>
                    </div>

                    {mode === "file" ? (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => !busy && fileRef.current?.click()}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") fileRef.current?.click();
                            }}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                const file = event.dataTransfer.files?.[0];
                                if (file && !busy) void uploadFile(file);
                            }}
                            className={cn(
                                "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                                busy ? "pointer-events-none opacity-60" : "border-border/60 hover:border-primary/40",
                            )}
                        >
                            <FaUpload className="mx-auto mb-2 text-muted-foreground" size={20} />
                            <p className="text-sm font-semibold">
                                {busy ? "Uploading…" : "Drop a file here or click to browse"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                PDF / PNG / JPEG / WebP / .txt / .md / Office · max {MAX_MB}MB
                            </p>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".pdf,.txt,.md,.markdown,.docx,.pptx,.xlsx,.csv,image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void uploadFile(file);
                                    event.target.value = "";
                                }}
                            />
                        </div>
                    ) : (
                        <>
                            <Input
                                placeholder="https://example.com/chapter"
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                                className="h-11"
                                autoFocus
                            />
                            <Button
                                onClick={() => void addUrl()}
                                disabled={busy || !/^https?:\/\/\S+$/i.test(url.trim())}
                                className="w-full h-11 font-black text-xs uppercase tracking-wider"
                            >
                                {busy ? <><FaSpinner className="animate-spin" size={12} /> Fetching…</> : "Fetch & attach"}
                            </Button>
                            <p className="text-[10px] text-muted-foreground">Public http(s) page · max 2 MB</p>
                        </>
                    )}

                    {error ? (
                        <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-[11px] font-bold text-destructive">
                            {error}
                        </p>
                    ) : null}

                    <p className="text-[10px] text-muted-foreground">
                        Added to this workspace and to your source library, so other workspaces can reuse it.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
