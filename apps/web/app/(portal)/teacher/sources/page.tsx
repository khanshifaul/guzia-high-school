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
    FaLayerGroup,
    FaSitemap,
    FaPrint,
    FaTrash,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMyTeacher } from "@/lib/teacher-session";
import { myClasses } from "@/lib/teacher-classes";
import { dedupeSubjects } from "@/lib/subjects";

interface Source {
    id: string; filename: string; kind: string; pages: number | null; status: string; createdAt: string;
    class: { id: string; name: string } | null;
    subject: { id: string; name: string } | null;
}
interface ClassOption { id: string; name: string; subjects: { subject: { id: string; name: string }; teacher?: { id: string } | null }[] }
interface SourceSummary {
    summary?: string;
    keyTopics?: string[];
    suggestedQuestions?: string[];
    fileUrl?: string;
    storage?: string;
}
interface SourceDetail extends Source { summary: SourceSummary | null; chunks: { page: number | null; content: string }[] }
interface AskResult { answer: string; citations: { page: number | null; snippet: string }[] }
interface AskAcrossResult {
    answer: string;
    citations: { sourceId: string; filename: string; page: number | null; snippet: string }[];
}
type MaterialKind = "FLASHCARDS" | "MINDMAP";
interface Flashcard { front: string; back: string }
interface FlashcardsContent { cards: Flashcard[] }
interface MindmapBranch { title: string; children: string[] }
interface MindmapContent { root: string; branches: MindmapBranch[] }
interface MaterialBase {
    id: string;
    title: string;
    createdAt: string;
    sourceId: string | null;
    classId: string | null;
    subjectId: string | null;
}
interface FlashcardsMaterial extends MaterialBase { kind: "FLASHCARDS"; content: FlashcardsContent }
interface MindmapMaterial extends MaterialBase { kind: "MINDMAP"; content: MindmapContent }
type Material = FlashcardsMaterial | MindmapMaterial;

const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = {
    FLASHCARDS: "Flashcards",
    MINDMAP: "Mind map",
};

const MAX_MB = 50;
/** Direct API origin for uploads: a large multipart body exceeds the Next dev
 *  proxy's limit, so post straight to the API (cookie is same-site). */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function TeacherSourcesPage() {
    const router = useRouter();
    const { teacherId } = useMyTeacher();
    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [classId, setClassId] = React.useState<string | null>(null);
    const [subjectId, setSubjectId] = React.useState<string | null>(null);
    const [sources, setSources] = React.useState<Source[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [detail, setDetail] = React.useState<SourceDetail | null>(null);
    const [question, setQuestion] = React.useState("");
    const [askResult, setAskResult] = React.useState<AskResult | null>(null);
    const [asking, setAsking] = React.useState(false);
    const [notebookQuestion, setNotebookQuestion] = React.useState("");
    const [notebookAnswer, setNotebookAnswer] = React.useState<AskAcrossResult | null>(null);
    const [notebookAsking, setNotebookAsking] = React.useState(false);
    const [materials, setMaterials] = React.useState<Material[]>([]);
    const [materialsLoading, setMaterialsLoading] = React.useState(true);
    const [materialBusy, setMaterialBusy] = React.useState<MaterialKind | null>(null);
    const [materialError, setMaterialError] = React.useState<string | null>(null);
    const [deletingId, setDeletingId] = React.useState<string | null>(null);
    const [viewer, setViewer] = React.useState<Material | null>(null);
    const [flipped, setFlipped] = React.useState<Set<number>>(new Set());

    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<"file" | "text" | "url">("file");
    const [url, setUrl] = React.useState("");
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

    const loadMaterials = React.useCallback(() => {
        setMaterialsLoading(true);
        const query = new URLSearchParams();
        if (classId) query.set("classId", classId);
        if (subjectId) query.set("subjectId", subjectId);
        const qs = query.toString();
        api<Material[]>(`/ai/materials${qs ? `?${qs}` : ""}`)
            .then((p) => setMaterials(p))
            .catch(() => setMaterials([]))
            .finally(() => setMaterialsLoading(false));
    }, [classId, subjectId]);

    React.useEffect(() => { loadMaterials(); }, [loadMaterials]);

    // The teacher's own classes only; their picker drives the subject list.
    React.useEffect(() => {
        if (!teacherId) return;
        api<{ classes: ClassOption[] }>("/classes")
            .then((p) => {
                const mine = myClasses(p.classes, teacherId);
                setClasses(mine);
                setClassId((prev) => (prev && mine.some((c) => c.id === prev) ? prev : (mine[0]?.id ?? null)));
            })
            .catch(() => setClasses([]));
    }, [teacherId]);

    const selectedClass = classes.find((c) => c.id === classId);

    // Sources are organised by class → subject.
    const groups = React.useMemo(() => {
        const map = new Map<string, { className: string; subjectName: string; items: Source[] }>();
        for (const s of sources) {
            const className = s.class?.name ?? "Unassigned class";
            const subjectName = s.subject?.name ?? "Unassigned subject";
            const key = `${className}::${subjectName}`;
            const group = map.get(key) ?? { className, subjectName, items: [] };
            group.items.push(s);
            map.set(key, group);
        }
        return [...map.values()];
    }, [sources]);

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
            if (classId) fd.append("classId", classId);
            if (subjectId) fd.append("subjectId", subjectId);
            const res = await fetch(`${API_ORIGIN}/api/ai/sources/upload`, { method: "POST", body: fd, credentials: "include" });
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
                body: { filename: filename || "Untitled.txt", kind: "PDF", text, classId: classId ?? undefined, subjectId: subjectId ?? undefined },
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

    async function ingestUrl() {
        setBusy(true);
        setFeedback(null);
        try {
            await api("/ai/sources/from-url", {
                method: "POST",
                body: { url: url.trim(), classId: classId ?? undefined, subjectId: subjectId ?? undefined },
            });
            setFeedback({ kind: "ok", msg: "Page fetched & summarized" });
            setOpen(false);
            setUrl("");
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Fetch failed" });
        } finally {
            setBusy(false);
        }
    }

    async function removeSource(id: string) {
        if (!window.confirm("Delete this source, its chunks and the stored file?")) return;
        try {
            await api(`/ai/sources/${id}`, { method: "DELETE" });
            setSources((prev) => prev.filter((s) => s.id !== id));
            if (detail?.id === id) setDetail(null);
            setFeedback({ kind: "ok", msg: "Source deleted" });
        } catch (err) {
            setFeedback({
                kind: "err",
                msg: err instanceof RequestError ? err.messages.join("; ") : "Delete failed",
            });
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

    /** Ask one question across every uploaded source, with page citations. */
    async function askAcrossSources() {
        const q = notebookQuestion.trim();
        if (!q || notebookAsking) return;
        setNotebookAsking(true);
        setNotebookAnswer(null);
        try {
            const r = await api<AskAcrossResult>("/ai/sources/ask", {
                method: "POST",
                body: { question: q, classId: classId ?? undefined, subjectId: subjectId ?? undefined },
            });
            setNotebookAnswer(r);
        } catch (err) {
            setNotebookAnswer({ answer: err instanceof RequestError ? err.messages.join("; ") : "Ask failed", citations: [] });
        } finally {
            setNotebookAsking(false);
        }
    }

    async function generateMaterial(kind: MaterialKind) {
        if (materialBusy) return;
        setMaterialBusy(kind);
        setMaterialError(null);
        try {
            const created = await api<Material>("/ai/materials", {
                method: "POST",
                body: { kind, classId: classId ?? undefined, subjectId: subjectId ?? undefined },
            });
            setMaterials((prev) => [created, ...prev]);
            loadMaterials();
        } catch (err) {
            setMaterialError(err instanceof RequestError ? err.messages.join("; ") : "Could not generate material");
        } finally {
            setMaterialBusy(null);
        }
    }

    async function deleteMaterial(m: Material) {
        setDeletingId(m.id);
        setMaterialError(null);
        try {
            await api(`/ai/materials/${m.id}`, { method: "DELETE" });
            setMaterials((prev) => prev.filter((x) => x.id !== m.id));
            if (viewer?.id === m.id) setViewer(null);
            loadMaterials();
        } catch (err) {
            setMaterialError(err instanceof RequestError ? err.messages.join("; ") : "Could not delete material");
        } finally {
            setDeletingId(null);
        }
    }

    function openMaterial(m: Material) {
        setViewer(m);
        setFlipped(new Set());
    }

    function toggleFlip(index: number) {
        setFlipped((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
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
            <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } }`}</style>
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
                                    <Select value={classId ?? undefined} onValueChange={(v) => { setClassId(v); setSubjectId(null); }}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Class" /></SelectTrigger>
                                        <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={subjectId ?? undefined} onValueChange={setSubjectId}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Subject" /></SelectTrigger>
                                        <SelectContent>{dedupeSubjects(selectedClass?.subjects).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button type="button" variant={mode === "file" ? "default" : "outline"} onClick={() => setMode("file")}
                                        className="h-9 text-xs font-black uppercase tracking-wider">
                                        <FaUpload size={11} /> File
                                    </Button>
                                    <Button type="button" variant={mode === "url" ? "default" : "outline"} onClick={() => setMode("url")}
                                        className="h-9 text-xs font-black uppercase tracking-wider">
                                        <FaLink size={11} /> URL
                                    </Button>
                                    <Button type="button" variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")}
                                        className="h-9 text-xs font-black uppercase tracking-wider">
                                        <FaFileLines size={11} /> Text
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
                                            {busy ? "Uploading & summarizing…" : "Drop a PDF, image, or text file here"}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            or click to browse · PDF / PNG / JPEG / WebP / .txt / .md · max {MAX_MB}MB · stored in R2
                                        </p>
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept=".pdf,.txt,.md,.markdown,image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) void uploadFile(f);
                                                e.target.value = "";
                                            }}
                                        />
                                    </div>
                                ) : mode === "url" ? (
                                    <>
                                        <Input
                                            placeholder="https://example.com/chapter"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="h-11"
                                        />
                                        <Button onClick={ingestUrl} disabled={busy || !/^https?:\/\/\S+$/i.test(url.trim())} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                            {busy ? <><FaSpinner className="animate-spin" size={12} /> Fetching…</> : <><FaLink size={12} /> Fetch & Summarize</>}
                                        </Button>
                                        <p className="text-[10px] text-muted-foreground">
                                            Public http(s) page · max 2 MB · HTML or plain text
                                        </p>
                                    </>
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

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Ask across all sources</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    <div className="flex gap-2">
                        <Input
                            placeholder="e.g. Compare how both chapters explain photosynthesis"
                            value={notebookQuestion}
                            onChange={(e) => setNotebookQuestion(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") void askAcrossSources(); }}
                            className="h-11"
                        />
                        <Button onClick={() => void askAcrossSources()} disabled={notebookAsking || !notebookQuestion.trim()}
                            className="font-black text-xs uppercase tracking-wider">
                            {notebookAsking ? <FaSpinner className="animate-spin" size={12} /> : <><FaPaperPlane size={12} /> Ask</>}
                        </Button>
                    </div>
                    {notebookAnswer ? (
                        <div className="p-4 rounded-xl border border-border/60 space-y-3">
                            <p className="text-sm">{notebookAnswer.answer}</p>
                            {notebookAnswer.citations.length > 0 ? (
                                <div className="space-y-2 pt-2 border-t border-border/60">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Citations</p>
                                    {notebookAnswer.citations.map((c, i) => (
                                        <div key={`${c.sourceId}-${i}`} className="flex flex-wrap items-baseline gap-2 text-xs">
                                            <span className="font-black uppercase tracking-wider text-[9px]">{c.filename}</span>
                                            <span className="text-muted-foreground/50 text-[9px]">·</span>
                                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] shrink-0">p.{c.page ?? "?"}</Badge>
                                            <span className="text-muted-foreground/50 text-[9px]">·</span>
                                            <span className="text-muted-foreground">{c.snippet}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Learning materials</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void generateMaterial("FLASHCARDS")} disabled={materialBusy !== null}
                            className="font-black text-xs uppercase tracking-wider">
                            {materialBusy === "FLASHCARDS" ? <FaSpinner className="animate-spin" size={12} /> : <FaLayerGroup size={12} />} Flashcards
                        </Button>
                        <Button variant="outline" onClick={() => void generateMaterial("MINDMAP")} disabled={materialBusy !== null}
                            className="font-black text-xs uppercase tracking-wider">
                            {materialBusy === "MINDMAP" ? <FaSpinner className="animate-spin" size={12} /> : <FaSitemap size={12} />} Mind map
                        </Button>
                    </div>

                    {materialError ? (
                        <p className="p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-xs font-bold text-destructive">
                            {materialError}
                        </p>
                    ) : null}

                    {materialsLoading ? (
                        <Skeleton className="h-20" />
                    ) : materials.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            No learning materials yet — generate a flashcard deck or a mind map for the selected class.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {materials.map((m) => (
                                <div key={m.id} className="flex items-center gap-2 rounded-xl border border-border/60 p-3">
                                    <button type="button" onClick={() => openMaterial(m)}
                                        className="flex flex-1 flex-wrap items-center gap-2 text-left cursor-pointer">
                                        <span className="text-sm font-semibold">{m.title}</span>
                                        <Badge variant="outline" className="text-[9px]">{MATERIAL_KIND_LABEL[m.kind]}</Badge>
                                        <span className="ml-auto text-[10px] text-muted-foreground">
                                            {new Date(m.createdAt).toLocaleDateString()}
                                        </span>
                                    </button>
                                    <Button size="icon" variant="ghost" onClick={() => void deleteMaterial(m)} disabled={deletingId === m.id}
                                        aria-label={`Delete ${m.title}`}
                                        className="text-muted-foreground hover:text-destructive">
                                        {deletingId === m.id ? <FaSpinner className="animate-spin" size={12} /> : <FaTrash size={12} />}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {sources.length === 0 ? (
                <EmptyState title="No sources" description="Upload a chapter or notes to summarize and generate plans or tests." />
            ) : (
                <div className="space-y-8">
                    {groups.map((g) => (
                        <div key={`${g.className}::${g.subjectName}`} className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <h2 className="text-sm font-black uppercase tracking-tight">{g.className}</h2>
                                <Badge variant="outline" className="text-[9px]">{g.subjectName}</Badge>
                                <span className="text-[10px] text-muted-foreground">{g.items.length} file(s)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {g.items.map((s) => (
                                    <motion.div key={s.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                                        <Card className="border-border/60 shadow-sm cursor-pointer hover:border-primary/20 transition-all" onClick={() => openDetail(s.id)}>
                                            <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                                                <CardTitle className="text-sm font-black uppercase tracking-tight">{s.filename}</CardTitle>
                                                <div className="flex items-center gap-1.5">
                                                    <Badge className={s.status === "READY" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
                                                        {s.status}
                                                    </Badge>
                                                    <button
                                                        type="button"
                                                        aria-label="Delete source"
                                                        onClick={(e) => { e.stopPropagation(); void removeSource(s.id); }}
                                                        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                                                    >
                                                        <FaTrash size={11} />
                                                    </button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4 text-xs text-muted-foreground">
                                                {s.pages ?? "?"} page(s) · {new Date(s.createdAt).toLocaleDateString()}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">{detail?.filename}</DialogTitle></DialogHeader>

                    {detail?.summary ? (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                            <p className="text-[10px] font-black text-primary uppercase tracking-wider">Summary</p>
                            <p className="text-sm">
                                {detail.summary.summary ??
                                    "No summary yet — the AI summarize step did not run for this upload."}
                            </p>
                            {(detail.summary.keyTopics?.length ?? 0) > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {detail.summary.keyTopics?.map((t) => (
                                        <Badge key={t} className="bg-primary/10 text-primary border-primary/20 text-[9px]">{t}</Badge>
                                    ))}
                                </div>
                            ) : null}
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

            <Dialog open={!!viewer} onOpenChange={(o) => {
                if (!o) {
                    setViewer(null);
                    setFlipped(new Set());
                }
            }}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight">{viewer?.title}</DialogTitle>
                    </DialogHeader>

                    <div className="no-print flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[9px]">
                            {viewer ? MATERIAL_KIND_LABEL[viewer.kind] : ""}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => window.print()}
                            className="font-black text-[10px] uppercase tracking-wider">
                            <FaPrint size={11} /> Print
                        </Button>
                    </div>

                    {viewer && viewer.kind === "FLASHCARDS" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {viewer.content.cards.map((card, i) => {
                                const isFlipped = flipped.has(i);
                                return (
                                    <button key={i} type="button" onClick={() => toggleFlip(i)} aria-pressed={isFlipped}
                                        className={cn(
                                            "min-h-28 rounded-xl border p-4 text-left transition-colors cursor-pointer",
                                            isFlipped
                                                ? "border-primary/40 bg-primary/5"
                                                : "border-border/60 hover:border-primary/30",
                                        )}>
                                        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                                            {isFlipped ? "Back" : "Front"}
                                        </p>
                                        <p className="mt-2 text-sm font-semibold">{isFlipped ? card.back : card.front}</p>
                                    </button>
                                );
                            })}
                        </div>
                    ) : viewer && viewer.kind === "MINDMAP" ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-black uppercase tracking-tight">{viewer.content.root}</h3>
                            <ul className="space-y-4 border-l-2 border-primary/20 pl-4">
                                {viewer.content.branches.map((branch, bi) => (
                                    <li key={bi} className="space-y-1">
                                        <p className="text-sm font-black uppercase tracking-wide">{branch.title}</p>
                                        <ul className="list-disc space-y-1 pl-5">
                                            {branch.children.map((child, ci) => (
                                                <li key={ci} className="text-xs text-muted-foreground">{child}</li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
