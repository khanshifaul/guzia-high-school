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
    const [progress, setProgress] = React.useState<number | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const fileRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (!open) return;
        setMode("file");
        setUrl("");
        setError(null);
        setProgress(null);
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
        setProgress(0);
        try {
            const body = new FormData();
            body.append("file", file);
            if (classId) body.append("classId", classId);
            if (subjectId) body.append("subjectId", subjectId);

            // fetch() cannot report upload bytes, and a 40 MB textbook is slow
            // enough that a spinner reads as a hang. XHR reports real progress.
            const created = await new Promise<{ id: string }>(
                (resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", `${API_ORIGIN}/api/ai/sources/upload`);
                    xhr.withCredentials = true;
                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            setProgress(Math.round((event.loaded / event.total) * 100));
                        }
                    };
                    xhr.onload = () => {
                        let parsed: { id?: string; message?: string | string[] } | null = null;
                        try {
                            parsed = JSON.parse(xhr.responseText) as {
                                id?: string;
                                message?: string | string[];
                            };
                        } catch {
                            parsed = null;
                        }
                        const message = Array.isArray(parsed?.message)
                            ? parsed.message.join("; ")
                            : parsed?.message;
                        if (xhr.status < 200 || xhr.status >= 300) {
                            reject(new Error(message ?? `Upload failed (${xhr.status})`));
                            return;
                        }
                        if (!parsed?.id) {
                            reject(new Error(message ?? "Upload returned no source id"));
                            return;
                        }
                        resolve({ id: parsed.id });
                    };
                    xhr.onerror = () => reject(new Error("Network error while uploading"));
                    xhr.send(body);
                },
            );
            setProgress(100);
            await attach(created.id);
            finish(file.name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add that file");
        } finally {
            setBusy(false);
            setProgress(null);
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
                                {busy
                                    ? progress === 100
                                        ? "Uploaded — processing…"
                                        : `Uploading… ${progress ?? 0}%`
                                    : "Drop a file here or click to browse"}
                            </p>
                            {busy ? (
                                <div className="mx-auto mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border">
                                    <div
                                        className="h-full bg-primary transition-[width] duration-200"
                                        style={{ width: `${progress ?? 0}%` }}
                                    />
                                </div>
                            ) : null}
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
