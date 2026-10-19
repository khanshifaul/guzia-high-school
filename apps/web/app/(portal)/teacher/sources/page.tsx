"use client";

// app/(portal)/teacher/sources/page.tsx — upload source material (PDF/text file
// → R2/local storage), summarize, ask questions with page citations, and use
// the source to draft a lesson plan or a printable test paper.

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
    FaFolderOpen,
    FaSpinner,
    FaPaperPlane,
    FaUpload,
    FaFileLines,
    FaBookOpen,
    FaClipboardList,
    FaLink,
} from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Source { id: string; filename: string; kind: string; pages: number | null; status: string; createdAt: string }
interface SourceSummary {
    summary: string;
    keyTopics: string[];
    suggestedQuestions: string[];
    fileUrl?: string;
    storage?: string;
}
interface SourceDetail extends Source { summary: SourceSummary | null; chunks: { page: number | null; content: string }[] }
interface AskResult { answer: string; citations: { page: number | null; snippet: string }[] }

const MAX_MB = 15;

export default function TeacherSourcesPage() {
    const router = useRouter();
    const [sources, setSources] = React.useState<Source[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [detail, setDetail] = React.useState<SourceDetail | null>(null);
    const [question, setQuestion] = React.useState("");
    const [askResult, setAskResult] = React.useState<AskResult | null>(null);
    const [asking, setAsking] = React.useState(false);

    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<"file" | "text">("file");
    const [dragging, setDragging] = React.useState(false);
    const fileRef = React.useRef<HTMLInputElement>(null);
    const [filename, setFilename] = React.useState("");
    const [text, setText] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const load = React.useCallback(() => {
        api<Source[]>("/ai/sources")
            .then((p) => setSources(p))
            .catch(() => setSources([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => { load(); }, [load]);

    /** Upload a PDF/text file: stored in R2 (or local disk), extracted, summarized. */
    async function uploadFile(file: File) {
        if (file.size > MAX_MB * 1024 * 1024) {
            setFeedback({ kind: "err", msg: `${file.name} exceeds the ${MAX_MB}MB limit` });
            return;
        }
        setBusy(true);
        setFeedback(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/ai/sources/upload", { method: "POST", body: fd, credentials: "include" });
            const data: unknown = await res.json().catch(() => null);
            if (!res.ok) {
                const messages =
                    data && typeof data === "object" && "message" in data
                        ? data.message
                        : "Upload failed";
                throw new Error(Array.isArray(messages) ? messages.join("; ") : String(messages));
            }
            setFeedback({ kind: "ok", msg: `${file.name} uploaded & summarized` });
            setOpen(false);
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof Error ? err.message : "Upload failed" });
        } finally {
            setBusy(false);
        }
    }

    async function ingest() {
        setBusy(true);
        setFeedback(null);
        try {
            await api("/ai/sources/ingest", {
                method: "POST",
                body: { filename: filename || "Untitled.txt", kind: "PDF", text },
            });
            setFeedback({ kind: "ok", msg: "Source ingested & summarized" });
            setOpen(false);
            setFilename(""); setText("");
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Ingest failed" });
        } finally {
            setBusy(false);
        }
    }

    async function openDetail(id: string) {
        const p = await api<SourceDetail>(`/ai/sources/${id}`);
        setDetail(p);
        setAskResult(null);
        setQuestion("");
    }

    async function ask() {
        if (!detail) return;
        setAsking(true);
        setAskResult(null);
        try {
            const r = await api<AskResult>(`/ai/sources/${detail.id}/ask`, { method: "POST", body: { question } });
            setAskResult(r);
        } catch (err) {
            setAskResult({ answer: err instanceof RequestError ? err.messages.join("; ") : "Ask failed", citations: [] });
        } finally {
            setAsking(false);
        }
    }

    /** Carry the source's key topics into the lesson-plan or test-paper builder. */
    function useFor(target: "plans" | "tests") {
        const topics = detail?.summary?.keyTopics ?? [];
        const q = topics.length ? `?topics=${encodeURIComponent(topics.join(", "))}` : "";
        router.push(`/teacher/${target}${q}`);
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Sources" icon={FaFolderOpen} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Sources" subtitle="Upload material (stored in R2), summarize, and generate plans or tests" icon={FaFolderOpen}
                actions={
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider"><FaUpload size={12} /> Add Source</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Add Source</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button type="button" variant={mode === "file" ? "default" : "outline"} onClick={() => setMode("file")}
                                        className="h-9 text-xs font-black uppercase tracking-wider">
                                        <FaUpload size={11} /> Upload file
                                    </Button>
                                    <Button type="button" variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")}
                                        className="h-9 text-xs font-black uppercase tracking-wider">
                                        <FaFileLines size={11} /> Paste text
                                    </Button>
                                </div>

                                {mode === "file" ? (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => !busy && fileRef.current?.click()}
                                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
                                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                        onDragLeave={() => setDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragging(false);
                                            const f = e.dataTransfer.files?.[0];
                                            if (f && !busy) void uploadFile(f);
                                        }}
                                        className={cn(
                                            "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                                            dragging ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40",
                                            busy && "pointer-events-none opacity-60",
                                        )}
                                    >
                                        <FaUpload className="mx-auto mb-2 text-muted-foreground" size={20} />
                                        <p className="text-sm font-semibold">
                                            {busy ? "Uploading & summarizing…" : "Drop a PDF or text file here"}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            or click to browse · PDF / .txt · max {MAX_MB}MB · stored in R2
                                        </p>
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept=".pdf,.txt,application/pdf,text/plain"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) void uploadFile(f);
                                                e.target.value = "";
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <Input placeholder="Filename (e.g. ch3-algebra.txt)" value={filename} onChange={(e) => setFilename(e.target.value)} className="h-11" />
                                        <Textarea placeholder="Paste the text content (book chapter, notes…)" value={text} onChange={(e) => setText(e.target.value)} rows={8} />
                                        <Button onClick={ingest} disabled={busy || !text.trim()} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                            {busy ? <><FaSpinner className="animate-spin" size={12} /> Ingesting…</> : "Upload & Summarize"}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                } />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {sources.length === 0 ? (
                <EmptyState title="No sources" description="Upload a chapter or notes to summarize and generate plans or tests." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sources.map((s) => (
                        <motion.div key={s.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border-border/60 shadow-sm cursor-pointer hover:border-primary/20 transition-all" onClick={() => openDetail(s.id)}>
                                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">{s.filename}</CardTitle>
                                    <Badge className={s.status === "READY" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
                                        {s.status}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="p-4 text-xs text-muted-foreground">
                                    {s.pages ?? "?"} page(s) · {new Date(s.createdAt).toLocaleDateString()}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">{detail?.filename}</DialogTitle></DialogHeader>

                    {detail?.summary ? (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                            <p className="text-[10px] font-black text-primary uppercase tracking-wider">Summary</p>
                            <p className="text-sm">{detail.summary.summary}</p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {detail.summary.keyTopics.map((t) => (
                                    <Badge key={t} className="bg-primary/10 text-primary border-primary/20 text-[9px]">{t}</Badge>
                                ))}
                            </div>
                            {detail.summary.fileUrl ? (
                                <a href={detail.summary.fileUrl} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider hover:underline">
                                    <FaLink size={9} /> original file ({detail.summary.storage ?? "stored"})
                                </a>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => useFor("plans")} disabled={!detail}
                            className="font-black text-xs uppercase tracking-wider">
                            <FaBookOpen size={12} /> Make lesson plan
                        </Button>
                        <Button variant="outline" onClick={() => useFor("tests")} disabled={!detail}
                            className="font-black text-xs uppercase tracking-wider">
                            <FaClipboardList size={12} /> Make test paper
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Ask about this source</p>
                        <div className="flex gap-2">
                            <Input placeholder="e.g. What is the distributive property?" value={question} onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && question.trim() && ask()} className="h-11" />
                            <Button onClick={ask} disabled={asking || !question.trim()} className="font-black text-xs uppercase tracking-wider">
                                {asking ? <FaSpinner className="animate-spin" size={12} /> : <FaPaperPlane size={12} />}
                            </Button>
                        </div>
                        {askResult ? (
                            <div className="p-4 rounded-xl border border-border/60 space-y-3">
                                <p className="text-sm">{askResult.answer}</p>
                                {askResult.citations.length > 0 ? (
                                    <div className="space-y-2 pt-2 border-t border-border/60">
                                        {askResult.citations.map((c, i) => (
                                            <div key={i} className="flex gap-2 text-xs">
                                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] shrink-0">p.{c.page ?? "?"}</Badge>
                                                <span className="text-muted-foreground">{c.snippet}…</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Extracted text</p>
                        {detail?.chunks.map((c, i) => (
                            <div key={i} className="p-3 rounded-lg border border-border/60 text-xs text-muted-foreground">
                                <span className="font-black text-primary text-[9px] uppercase">p.{c.page ?? "?"} </span>
                                {c.content}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
