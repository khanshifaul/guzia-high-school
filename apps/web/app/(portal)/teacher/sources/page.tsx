"use client";

// app/(portal)/teacher/sources/page.tsx — upload source material (paste text
// for now; PDF/image ingestion wires in via the API), summarize, and ask
// questions with page citations.

import * as React from "react";
import { motion } from "motion/react";
import { FaFolderOpen, FaSpinner, FaPaperPlane } from "react-icons/fa6";
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

interface Source { id: string; filename: string; kind: string; pages: number | null; status: string; createdAt: string }
interface SourceDetail extends Source { summary: { summary: string; keyTopics: string[]; suggestedQuestions: string[] } | null; chunks: { page: number | null; content: string }[] }
interface AskResult { answer: string; citations: { page: number | null; snippet: string }[] }

export default function TeacherSourcesPage() {
    const [sources, setSources] = React.useState<Source[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [detail, setDetail] = React.useState<SourceDetail | null>(null);
    const [question, setQuestion] = React.useState("");
    const [askResult, setAskResult] = React.useState<AskResult | null>(null);
    const [asking, setAsking] = React.useState(false);

    const [open, setOpen] = React.useState(false);
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

    if (loading) return <div className="space-y-6"><PageHeader title="Sources" icon={FaFolderOpen} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Sources" subtitle="Upload material, summarize, ask questions" icon={FaFolderOpen}
                actions={
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider"><FaFolderOpen size={12} /> Add Source</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Add Source</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <Input placeholder="Filename (e.g. ch3-algebra.txt)" value={filename} onChange={(e) => setFilename(e.target.value)} className="h-11" />
                                <Textarea placeholder="Paste the text content (book chapter, notes…)" value={text} onChange={(e) => setText(e.target.value)} rows={8} />
                                <Button onClick={ingest} disabled={busy || !text.trim()} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <><FaSpinner className="animate-spin" size={12} /> Ingesting…</> : "Upload & Summarize"}
                                </Button>
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
                <EmptyState title="No sources" description="Upload a chapter or notes to summarize and ask questions." />
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
                        </div>
                    ) : null}

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
