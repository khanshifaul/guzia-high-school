"use client";

// app/(portal)/teacher/studio/library/page.tsx — the reusable source library.
// Upload once here; attaching to a workspace is a pointer.
import * as React from "react";
import Link from "next/link";
import { FaArrowLeft, FaLink, FaPaperclip, FaSpinner, FaTrash, FaUpload } from "react-icons/fa6";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { statusStyle } from "@/components/teacher/studio/source-row";
import { SourceDetailDialog } from "@/components/teacher/studio/source-detail-dialog";
import { api, RequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { StudioSource, WorkspaceSummary } from "@/lib/studio";

const MAX_MB = 50;
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function StudioLibraryPage() {
    const [sources, setSources] = React.useState<StudioSource[]>([]);
    const [workspaces, setWorkspaces] = React.useState<WorkspaceSummary[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [feedback, setFeedback] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState("");
    const [detailId, setDetailId] = React.useState<string | null>(null);

    const [selected, setSelected] = React.useState<string[]>([]);
    const [attachOpen, setAttachOpen] = React.useState(false);
    const [target, setTarget] = React.useState("");
    const [attaching, setAttaching] = React.useState(false);

    const [uploadOpen, setUploadOpen] = React.useState(false);
    const [mode, setMode] = React.useState<"file" | "text" | "url">("file");
    const [url, setUrl] = React.useState("");
    const [filename, setFilename] = React.useState("");
    const [text, setText] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const fileRef = React.useRef<HTMLInputElement>(null);

    const load = React.useCallback(() => {
        setLoading(true);
        api<StudioSource[]>("/ai/sources")
            .then(setSources)
            .catch((err) => setError(err instanceof RequestError ? err.messages.join("; ") : "Could not load the library"))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        load();
        api<WorkspaceSummary[]>("/workspaces").then(setWorkspaces).catch(() => setWorkspaces([]));
    }, [load]);

    const query = search.trim().toLowerCase();
    const shown = sources.filter((source) => source.filename.toLowerCase().includes(query));

    // Group by class → subject, the way a library is browsed.
    const groups = React.useMemo(() => {
        const map = new Map<string, { heading: string; items: StudioSource[] }>();
        for (const source of shown) {
            const heading = `${source.class?.name ?? "Unassigned class"} → ${source.subject?.name ?? "Unassigned subject"}`;
            const group = map.get(heading) ?? { heading, items: [] };
            group.items.push(source);
            map.set(heading, group);
        }
        return [...map.values()];
    }, [shown]);

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
            const res = await fetch(`${API_ORIGIN}/api/ai/sources/upload`, {
                method: "POST",
                body,
                credentials: "include",
            });
            if (!res.ok) throw new Error(`Upload failed (${res.status})`);
            setUploadOpen(false);
            setFeedback(`${file.name} uploaded — processing…`);
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setBusy(false);
        }
    }

    async function ingestText() {
        setBusy(true);
        setError(null);
        try {
            await api("/ai/sources/ingest", {
                method: "POST",
                body: { filename: filename.trim() || "pasted-notes.txt", kind: "PDF", text: text.trim() },
            });
            setUploadOpen(false);
            setFilename("");
            setText("");
            setFeedback("Source added");
            load();
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Ingest failed");
        } finally {
            setBusy(false);
        }
    }

    async function ingestUrl() {
        setBusy(true);
        setError(null);
        try {
            await api("/ai/sources/from-url", { method: "POST", body: { url: url.trim() } });
            setUploadOpen(false);
            setUrl("");
            setFeedback("Page added");
            load();
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Fetch failed");
        } finally {
            setBusy(false);
        }
    }

    async function remove(source: StudioSource) {
        const used = source.usedIn ?? 0;
        const warning = used > 0
            ? `“${source.filename}” is used in ${used} workspace${used === 1 ? "" : "s"} — it will be detached there. Continue?`
            : `Delete “${source.filename}”?`;
        if (!window.confirm(warning)) return;
        try {
            await api(`/ai/sources/${source.id}`, { method: "DELETE" });
            setSources((current) => current.filter((item) => item.id !== source.id));
            setSelected((current) => current.filter((id) => id !== source.id));
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not delete");
        }
    }

    async function attachSelected() {
        if (!target || selected.length === 0) return;
        setAttaching(true);
        try {
            await api(`/workspaces/${target}/sources`, { method: "POST", body: { sourceIds: selected } });
            setAttachOpen(false);
            setSelected([]);
            setFeedback(`Attached ${selected.length} source(s)`);
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not attach");
        } finally {
            setAttaching(false);
        }
    }

    function toggle(id: string) {
        setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Source library"
                subtitle="Upload once, use in any workspace"
                icon={FaUpload}
                actions={
                    <div className="flex gap-2">
                        <Link href="/teacher/studio">
                            <Button variant="outline" className="font-black text-xs uppercase tracking-wider">
                                <FaArrowLeft size={12} /> Studio
                            </Button>
                        </Link>
                        <Button onClick={() => setUploadOpen(true)} className="font-black text-xs uppercase tracking-wider">
                            <FaUpload size={12} /> Upload source
                        </Button>
                    </div>
                }
            />

            {feedback ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-xs font-bold uppercase tracking-wide text-emerald-600">
                    {feedback}
                </div>
            ) : null}
            {error ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center text-xs font-bold text-destructive">
                    {error}
                </div>
            ) : null}

            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search filename…" className="h-11 max-w-md" />

            {loading ? (
                <Skeleton className="h-64" />
            ) : sources.length === 0 ? (
                <EmptyState
                    title="Your library is empty"
                    description="Upload a chapter or notes once; every workspace can attach it."
                    action={<Button onClick={() => setUploadOpen(true)}>Upload source</Button>}
                />
            ) : shown.length === 0 ? (
                <EmptyState
                    title={`No sources match “${search.trim()}”`}
                    description="Try a different filename."
                    action={<Button variant="outline" onClick={() => setSearch("")}>Clear search</Button>}
                />
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border/60">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-border/60 text-left">
                                <th className="w-8 p-2" />
                                <th className="p-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Filename</th>
                                <th className="p-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Pages</th>
                                <th className="p-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="p-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Used in</th>
                                <th className="p-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((group) => (
                                <React.Fragment key={group.heading}>
                                    <tr className="bg-muted/40">
                                        <td colSpan={6} className="p-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                                            {group.heading}
                                        </td>
                                    </tr>
                                    {group.items.map((source) => (
                                        <tr key={source.id} className="border-b border-border/40 last:border-0">
                                            <td className="p-2 align-middle">
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Select ${source.filename}`}
                                                    checked={selected.includes(source.id)}
                                                    onChange={() => toggle(source.id)}
                                                    className="size-3.5 accent-primary"
                                                />
                                            </td>
                                            <td className="p-2 font-mono text-xs">
                                                <button type="button" onClick={() => setDetailId(source.id)}
                                                    className="cursor-pointer text-left hover:text-primary hover:underline">
                                                    {source.filename}
                                                </button>
                                            </td>
                                            <td className="p-2 text-xs text-muted-foreground">{source.pages ?? "?"}</td>
                                            <td className="p-2">
                                                <Badge className={cn(statusStyle(source.status), "text-[8px]")} title={source.error ?? undefined}>
                                                    {source.status}
                                                </Badge>
                                            </td>
                                            <td className="p-2 text-xs text-muted-foreground">
                                                {source.usedIn ? `${source.usedIn} workspace${source.usedIn === 1 ? "" : "s"}` : "—"}
                                            </td>
                                            <td className="p-2 text-right">
                                                <button
                                                    type="button"
                                                    aria-label={`Delete ${source.filename}`}
                                                    onClick={() => void remove(source)}
                                                    className="p-1 text-muted-foreground hover:text-destructive"
                                                >
                                                    <FaTrash size={11} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selected.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <span className="text-xs font-bold">{selected.length} selected</span>
                    <Button size="sm" onClick={() => setAttachOpen(true)} className="font-black text-[10px] uppercase tracking-wider">
                        <FaPaperclip size={10} /> Attach to workspace…
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelected([])} className="font-black text-[10px] uppercase tracking-wider">
                        Clear
                    </Button>
                </div>
            ) : null}

            <SourceDetailDialog sourceId={detailId} onClose={() => setDetailId(null)} />

            {/* Attach selected sources to a workspace */}
            <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight">Attach {selected.length} source(s)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Select value={target || undefined} onValueChange={setTarget}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Choose a workspace" /></SelectTrigger>
                            <SelectContent>
                                {workspaces.map((workspace) => (
                                    <SelectItem key={workspace.id} value={workspace.id}>{workspace.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setAttachOpen(false)} disabled={attaching}>Cancel</Button>
                            <Button onClick={() => void attachSelected()} disabled={attaching || !target} className="w-auto">
                                {attaching ? <FaSpinner className="animate-spin" size={12} /> : "Attach"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Upload */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight">Upload source</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            <Button type="button" variant={mode === "file" ? "default" : "outline"} onClick={() => setMode("file")}
                                className="h-9 text-xs font-black uppercase tracking-wider"><FaUpload size={11} /> File</Button>
                            <Button type="button" variant={mode === "url" ? "default" : "outline"} onClick={() => setMode("url")}
                                className="h-9 text-xs font-black uppercase tracking-wider"><FaLink size={11} /> URL</Button>
                            <Button type="button" variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")}
                                className="h-9 text-xs font-black uppercase tracking-wider">Text</Button>
                        </div>

                        {mode === "file" ? (
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => !busy && fileRef.current?.click()}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") fileRef.current?.click();
                                }}
                                className={cn(
                                    "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                                    busy ? "pointer-events-none opacity-60" : "border-border/60 hover:border-primary/40",
                                )}
                            >
                                <FaUpload className="mx-auto mb-2 text-muted-foreground" size={20} />
                                <p className="text-sm font-semibold">{busy ? "Uploading…" : "Drop a PDF, image, or text file here"}</p>
                                <p className="mt-1 text-xs text-muted-foreground">PDF / PNG / JPEG / WebP / .txt / .md · max {MAX_MB}MB</p>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".pdf,.txt,.md,.markdown,image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown"
                                    className="hidden"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (file) void uploadFile(file);
                                        event.target.value = "";
                                    }}
                                />
                            </div>
                        ) : mode === "url" ? (
                            <>
                                <Input placeholder="https://example.com/chapter" value={url} onChange={(event) => setUrl(event.target.value)} className="h-11" />
                                <Button onClick={() => void ingestUrl()} disabled={busy || !/^https?:\/\/\S+$/i.test(url.trim())}
                                    className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <FaSpinner className="animate-spin" size={12} /> : "Fetch & summarize"}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Input placeholder="Filename (e.g. ch3-algebra.txt)" value={filename} onChange={(event) => setFilename(event.target.value)} className="h-11" />
                                <Textarea placeholder="Paste the text content…" value={text} onChange={(event) => setText(event.target.value)} rows={8} />
                                <Button onClick={() => void ingestText()} disabled={busy || !text.trim()}
                                    className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <FaSpinner className="animate-spin" size={12} /> : "Upload & summarize"}
                                </Button>
                            </>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                            Only upload material you have the rights to. A new source is searchable once processing finishes.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
