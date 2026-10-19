"use client";

// app/(portal)/teacher/studio/[id]/page.tsx — the conversation workspace.
// Sources on the left, the conversation in the middle, generated artifacts on
// the right. The ChatThread is implicit: one conversation per workspace.
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FaArrowLeft, FaPaperclip, FaPen, FaSpinner, FaTrash, FaUpload, FaXmark } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Composer } from "@/components/teacher/studio/composer";
import { MessageBubble } from "@/components/teacher/studio/message-bubble";
import { SourceRow } from "@/components/teacher/studio/source-row";
import { AttachSheet } from "@/components/teacher/studio/attach-sheet";
import { StudioPane, type StudioView } from "@/components/teacher/studio/studio-pane";
import { SourceDetailDialog } from "@/components/teacher/studio/source-detail-dialog";
import { UploadSourceDialog } from "@/components/teacher/studio/upload-source-dialog";
import { api, RequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { workspaceScope, type ChatMessage, type Citation, type StudioSource, type WorkspaceDetail } from "@/lib/studio";

const RATE_LIMIT_COOLDOWN_MS = 10_000;
/** A dropped file is uploaded to the API directly (the Next proxy caps bodies). */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "";

function WorkspaceSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-14" />
            <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_340px] gap-4">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
            </div>
        </div>
    );
}

export default function WorkspacePage() {
    // useSearchParams needs a boundary; the fallback mirrors the layout.
    return (
        <React.Suspense fallback={<WorkspaceSkeleton />}>
            <WorkspaceView />
        </React.Suspense>
    );
}

function WorkspaceView() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const workspaceId = params.id;

    const [detail, setDetail] = React.useState<WorkspaceDetail | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [missing, setMissing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [question, setQuestion] = React.useState("");
    const [asking, setAsking] = React.useState(false);
    const [pending, setPending] = React.useState<string | null>(null);
    const [cooling, setCooling] = React.useState(false);

    const [attachOpen, setAttachOpen] = React.useState(false);
    const [uploadOpen, setUploadOpen] = React.useState(false);
    const [mobileTab, setMobileTab] = React.useState<"sources" | "chat" | "studio">("chat");
    const [editingTitle, setEditingTitle] = React.useState(false);
    const [titleDraft, setTitleDraft] = React.useState("");
    const [clearing, setClearing] = React.useState(false);
    const [cited, setCited] = React.useState<{ citation: Citation; text: string } | null>(null);
    const [detailSourceId, setDetailSourceId] = React.useState<string | null>(null);
    const [feedback, setFeedback] = React.useState<string | null>(null);
    const [dragging, setDragging] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [ocrBusyId, setOcrBusyId] = React.useState<string | null>(null);

    const [view, setView] = React.useState<StudioView>("tests");
    const listRef = React.useRef<HTMLDivElement>(null);

    const load = React.useCallback(() => {
        setLoading(true);
        setMissing(false);
        api<WorkspaceDetail>(`/workspaces/${workspaceId}`)
            .then((payload) => {
                setDetail(payload);
                setTitleDraft(payload.title);
            })
            .catch((err) => {
                if (err instanceof RequestError && err.statusCode === 404) setMissing(true);
                else setError(err instanceof RequestError ? err.messages.join("; ") : "Could not load this workspace");
            })
            .finally(() => setLoading(false));
    }, [workspaceId]);

    React.useEffect(() => {
        load();
    }, [load]);

    // The tab is URL state, so a reload keeps it.
    React.useEffect(() => {
        const requested = searchParams.get("view");
        if (requested === "tests" || requested === "plans" || requested === "materials") setView(requested);
    }, [searchParams]);

    const messages = detail?.messages ?? [];
    const readies = detail?.sources.filter((source) => source.status === "READY") ?? [];
    const topics = [...messages].reverse().find((message) => message.role === "USER")?.content ?? "";

    React.useEffect(() => {
        const element = listRef.current;
        if (element) element.scrollTop = element.scrollHeight;
    }, [messages.length, asking, pending]);

    async function saveTitle() {
        if (!detail) return;
        const next = titleDraft.trim();
        setEditingTitle(false);
        if (!next || next === detail.title) {
            setTitleDraft(detail.title);
            return;
        }
        try {
            await api(`/workspaces/${detail.id}`, { method: "PATCH", body: { title: next } });
            setDetail({ ...detail, title: next });
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not rename");
            setTitleDraft(detail.title);
        }
    }

    async function send() {
        const text = question.trim();
        if (!text || asking || !detail) return;
        setAsking(true);
        setQuestion("");
        setPending(text);
        setError(null);
        try {
            const result = await api<{ userMessage: ChatMessage; message: ChatMessage }>(
                `/workspaces/${detail.id}/messages`,
                { method: "POST", body: { question: text } },
            );
            setDetail((current) =>
                current ? { ...current, messages: [...current.messages, result.userMessage, result.message] } : current,
            );
        } catch (err) {
            if (err instanceof RequestError && err.statusCode === 429) {
                setCooling(true);
                setError("Too many requests — try again shortly.");
                window.setTimeout(() => setCooling(false), RATE_LIMIT_COOLDOWN_MS);
            } else {
                setError(err instanceof RequestError ? err.messages.join("; ") : "Could not ask that question");
            }
            setQuestion(text);
        } finally {
            setAsking(false);
            setPending(null);
        }
    }

    /**
     * WhatsApp-style drop: the file goes to the library and is attached here
     * in one move. The upload itself returns immediately (PROCESSING) and the
     * source becomes searchable when the background ingest finishes.
     */
    async function dropFile(file: File) {
        if (!detail || uploading) return;
        setUploading(true);
        setError(null);
        try {
            const body = new FormData();
            body.append("file", file);
            if (detail.classId) body.append("classId", detail.classId);
            if (detail.subjectId) body.append("subjectId", detail.subjectId);
            const response = await fetch(`${API_ORIGIN}/api/ai/sources/upload`, {
                method: "POST",
                body,
                credentials: "include",
            });
            const created = (await response.json().catch(() => null)) as
                | { id?: string; message?: string | string[] }
                | null;
            if (!response.ok || !created?.id) {
                const message = Array.isArray(created?.message) ? created?.message.join("; ") : created?.message;
                throw new Error(message ?? `Upload failed (${response.status})`);
            }
            await api(`/workspaces/${detail.id}/sources`, {
                method: "POST",
                body: { sourceIds: [created.id] },
            });
            setFeedback(`${file.name} added — processing…`);
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not upload that file");
        } finally {
            setUploading(false);
        }
    }

    async function clearConversation() {
        if (!detail) return;
        if (!window.confirm("Clear this conversation? The workspace and its sources stay.")) return;
        setClearing(true);
        try {
            await api(`/workspaces/${detail.id}/messages`, { method: "DELETE" });
            setDetail({ ...detail, messages: [] });
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not clear the conversation");
        } finally {
            setClearing(false);
        }
    }

    async function runOcr(source: StudioSource) {
        setOcrBusyId(source.id);
        setError(null);
        try {
            await api(`/ai/sources/${source.id}/ocr`, { method: "POST" });
            setFeedback(`${source.filename} is being transcribed — this can take a minute.`);
            load();
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not start OCR");
        } finally {
            setOcrBusyId(null);
        }
    }

    async function detach(source: StudioSource) {
        if (!detail) return;
        try {
            await api(`/workspaces/${detail.id}/sources/${source.id}`, { method: "DELETE" });
            setDetail({ ...detail, sources: detail.sources.filter((item) => item.id !== source.id) });
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not detach");
        }
    }

    async function openCitation(citation: Citation) {
        if (!citation.sourceId) {
            setCited({ citation, text: citation.snippet });
            return;
        }
        try {
            const source = await api<{ chunks: { page: number | null; content: string }[] }>(
                `/ai/sources/${citation.sourceId}`,
            );
            const chunk = source.chunks.find((item) => item.page === citation.page) ?? source.chunks[0];
            setCited({ citation, text: chunk?.content ?? citation.snippet });
        } catch {
            setCited({ citation, text: citation.snippet });
        }
    }

    function makeArtifact(target: "tests" | "plans") {
        const query = new URLSearchParams({ workspaceId });
        if (topics) query.set("topics", topics.slice(0, 300));
        router.push(`/teacher/${target}/new?${query.toString()}`);
    }

    if (loading) {
        return (
            <div className="space-y-4 p-0">
                <WorkspaceSkeleton />
            </div>
        );
    }

    if (missing) {
        return (
            <EmptyState
                title="Workspace not found"
                description="It may have been deleted, or it belongs to another teacher."
                action={<Link href="/teacher/studio"><Button variant="outline">Back to Studio</Button></Link>}
            />
        );
    }

    if (!detail) {
        return (
            <EmptyState
                title="Could not load this workspace"
                description={error ?? "Try again in a moment."}
                action={<Button variant="outline" onClick={load}>Retry</Button>}
            />
        );
    }

    const canAsk = readies.length > 0 && !cooling;

    return (
        <div className="space-y-3">
            {/* Title row — this workspace's header, no PageHeader. */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-border/60 pb-3">
                <Link href="/teacher/studio" aria-label="Back to Studio" className="text-muted-foreground hover:text-foreground">
                    <FaArrowLeft size={13} />
                </Link>
                <div className="min-w-0 flex-1">
                    {editingTitle ? (
                        <Input
                            autoFocus
                            value={titleDraft}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            onBlur={() => void saveTitle()}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") void saveTitle();
                                if (event.key === "Escape") {
                                    setTitleDraft(detail.title);
                                    setEditingTitle(false);
                                }
                            }}
                            className="h-9 max-w-sm text-base font-black"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setTitleDraft(detail.title);
                                setEditingTitle(true);
                            }}
                            className="group flex items-center gap-2 text-left cursor-pointer"
                        >
                            <span className="truncate text-lg font-black uppercase tracking-tight">{detail.title}</span>
                            <FaPen size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    )}
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-0.5">
                        Workspace · {workspaceScope(detail) || "no class or subject"} · {detail.sources.length} source
                        {detail.sources.length === 1 ? "" : "s"}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {messages.length > 0 ? (
                        <Button variant="outline" size="sm" onClick={() => void clearConversation()} disabled={clearing}
                            className="font-black text-[10px] uppercase tracking-wider">
                            {clearing ? <FaSpinner className="animate-spin" size={10} /> : <FaTrash size={10} />} Clear chat
                        </Button>
                    ) : null}
                    <Button size="sm" onClick={() => setUploadOpen(true)} className="font-black text-[10px] uppercase tracking-wider">
                        <FaPaperclip size={10} /> Attach source
                    </Button>
                </div>
            </div>

            {feedback ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-[11px] font-bold text-emerald-600">
                    <span>{feedback}</span>
                    <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss"><FaXmark size={10} /></button>
                </div>
            ) : null}

            {error ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-2.5 text-[11px] font-bold text-destructive">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)} aria-label="Dismiss"><FaXmark size={10} /></button>
                </div>
            ) : null}

            {/* Below xl the three panes become tabs instead of a long stack. */}
            <div className="flex gap-1 rounded-lg border border-border/60 bg-card p-1 xl:hidden">
                {(["sources", "chat", "studio"] as const).map((key) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setMobileTab(key)}
                        className={cn(
                            "flex-1 rounded-md px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors",
                            mobileTab === key
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {key}
                        {key === "sources" ? ` (${detail.sources.length})` : ""}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_340px] gap-4 items-stretch xl:h-[calc(100dvh-11rem)] xl:min-h-[520px]">
                {/* Sources */}
                <aside
                    className={cn(
                        "min-h-0 flex-col rounded-xl border border-border/60 bg-card xl:flex xl:h-full",
                        mobileTab === "sources" ? "flex" : "hidden",
                    )}
                >
                    <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Sources</span>
                        <span className="text-[10px] text-muted-foreground">{detail.sources.length}</span>
                    </div>
                    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
                        {detail.sources.length === 0 ? (
                            <p className="px-1 py-6 text-center text-[11px] text-muted-foreground">
                                Attach a source to start asking.
                            </p>
                        ) : (
                            detail.sources.map((source) => (
                                <SourceRow
                                    key={source.id}
                                    source={source}
                                    onOpen={() => setDetailSourceId(source.id)}
                                    onDetach={() => void detach(source)}
                                    onOcr={source.status === "NEEDS_OCR" ? () => void runOcr(source) : undefined}
                                    ocrBusy={ocrBusyId === source.id}
                                />
                            ))
                        )}
                        <button
                            type="button"
                            onClick={() => setAttachOpen(true)}
                            className="w-full rounded-lg border border-dashed border-border/70 px-2 py-2 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                        >
                            + attach from library
                        </button>
                    </div>
                </aside>

                {/* Conversation */}
                <section
                    onDragOver={(event) => {
                        event.preventDefault();
                        if (!uploading) setDragging(true);
                    }}
                    onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        const file = event.dataTransfer.files?.[0];
                        if (file) void dropFile(file);
                    }}
                    className={cn(
                        "relative min-h-[520px] flex-col rounded-xl border border-border/60 bg-card xl:flex xl:h-full xl:min-h-0",
                        mobileTab === "chat" ? "flex" : "hidden",
                    )}
                >
                    {dragging ? (
                        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-background/85 px-4 text-center">
                            <FaUpload className="text-primary" size={22} />
                            <p className="text-sm font-semibold">Drop to add this file to the workspace</p>
                            <p className="text-[11px] text-muted-foreground">
                                PDF · image · text — it joins the library and is attached here
                            </p>
                        </div>
                    ) : null}
                    <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                        {messages.length === 0 && !asking ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
                                <p className="text-sm font-semibold">Ask your sources anything</p>
                                <p className="max-w-xs text-xs text-muted-foreground">
                                    Answers cite the file and page they came from.
                                    {readies.length === 0 ? " Attach a source to begin." : ""}
                                </p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    onCitation={(index) => {
                                        const citation = message.citations?.[index];
                                        if (citation) void openCitation(citation);
                                    }}
                                    onMakePaper={message.role === "ASSISTANT" ? () => makeArtifact("tests") : undefined}
                                    onMakePlan={message.role === "ASSISTANT" ? () => makeArtifact("plans") : undefined}
                                />
                            ))
                        )}
                        {asking && pending ? (
                            <>
                                <div className="flex justify-end">
                                    <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-primary/70 px-3.5 py-2.5 text-sm text-primary-foreground">
                                        <p className="whitespace-pre-wrap">{pending}</p>
                                    </div>
                                </div>
                                <div className="flex justify-start">
                                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border/60 bg-muted/60 px-3.5 py-2.5 text-[11px] text-muted-foreground">
                                        <FaSpinner className="animate-spin text-primary" size={11} /> Retrieving and writing…
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                    <Composer
                        value={question}
                        onChange={setQuestion}
                        onSend={() => void send()}
                        busy={asking}
                        disabled={!canAsk}
                        hint={readies.length === 0
                            ? "Attach a ready source to start asking…"
                            : cooling
                                ? "Too many requests — try again shortly."
                                : undefined}
                    />
                </section>

                {/* Studio */}
                <aside
                    className={cn(
                        "min-h-0 flex-col rounded-xl border border-border/60 bg-card xl:flex xl:h-full",
                        mobileTab === "studio" ? "flex" : "hidden",
                    )}
                >
                    <div className="border-b border-border/60 px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Studio</span>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                    <StudioPane
                        workspaceId={detail.id}
                        classId={detail.classId}
                        subjectId={detail.subjectId}
                        view={view}
                        onViewChange={(next) => {
                            setView(next);
                            router.replace(`/teacher/studio/${detail.id}?view=${next}`);
                        }}
                        topics={topics.slice(0, 300)}
                    />
                    </div>
                </aside>
            </div>

            <UploadSourceDialog
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                workspaceId={detail.id}
                classId={detail.classId}
                subjectId={detail.subjectId}
                onUploaded={(message) => {
                    setFeedback(message);
                    load();
                }}
            />

            <AttachSheet
                open={attachOpen}
                onOpenChange={setAttachOpen}
                workspaceId={detail.id}
                attachedIds={detail.sources.map((source) => source.id)}
                onAttached={load}
            />

            <SourceDetailDialog sourceId={detailSourceId} onClose={() => setDetailSourceId(null)} onChanged={load} />

            {/* A citation opens the cited page's text. */}
            <Dialog open={cited !== null} onOpenChange={(open) => (open ? null : setCited(null))}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight text-sm">
                            {cited?.citation.filename ?? "Source"} · p.{cited?.citation.page ?? "?"}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{cited?.text}</p>
                </DialogContent>
            </Dialog>
        </div>
    );
}
