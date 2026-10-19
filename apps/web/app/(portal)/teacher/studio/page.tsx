"use client";

// app/(portal)/teacher/studio/page.tsx — the merged AI workspace.
//
// One page, three panes (NotebookLM layout):
//   Sources  — add (file / URL / text), list, inspect, delete.
//   Chat     — multi-turn, grounded in the sources, answered with verified
//              page citations. The server owns retrieval and citation
//              checking (POST /ai/sources/ask); this page only renders.
//   Studio   — the artifacts generated *from* those sources: test papers,
//              lesson plans, and study materials. Each keeps its own
//              drill-down page (editor, print, attempts).
//
// It replaces the former /teacher/sources, /teacher/tests and /teacher/plans
// index routes; those pages were merged here and their callers repointed.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    FaArrowRight,
    FaBookOpen,
    FaClipboardList,
    FaDesktop,
    FaEye,
    FaFileLines,
    FaFolderOpen,
    FaLayerGroup,
    FaLink,
    FaPaperPlane,
    FaPlus,
    FaPrint,
    FaSitemap,
    FaSpinner,
    FaTrash,
    FaUpload,
    FaUsers,
    FaXmark,
} from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMyTeacher } from "@/lib/teacher-session";
import { myClasses } from "@/lib/teacher-classes";
import { dedupeSubjects } from "@/lib/subjects";

interface Source {
    id: string;
    filename: string;
    kind: string;
    pages: number | null;
    status: string;
    createdAt: string;
    class: { id: string; name: string } | null;
    subject: { id: string; name: string } | null;
}
interface ClassOption {
    id: string;
    name: string;
    subjects: { subject: { id: string; name: string }; teacher?: { id: string } | null }[];
}
interface SourceSummary {
    summary?: string;
    keyTopics?: string[];
    suggestedQuestions?: string[];
    fileUrl?: string;
    storage?: string;
}
interface SourceDetail extends Source {
    summary: SourceSummary | null;
    chunks: { page: number | null; content: string }[];
}

interface Citation {
    sourceId: string;
    filename: string;
    page: number | null;
    snippet: string;
}
interface ChatEntry {
    role: "user" | "assistant";
    content: string;
    citations?: Citation[];
}

interface Paper {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    status: string;
    mode?: string;
    class: { name: string };
    subject: { name: string };
}
interface PlanWeek {
    week: number;
    status: string;
    topics: string[];
}
interface Plan {
    id: string;
    title: string;
    type: string;
    status: string;
    startDate: string;
    weeks: PlanWeek[];
    class: { name: string };
    subject: { name: string };
}

type MaterialKind = "FLASHCARDS" | "MINDMAP";
interface Material {
    id: string;
    title: string;
    kind: MaterialKind;
    createdAt: string;
}
type StudioTab = "tests" | "plans" | "materials";

const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = {
    FLASHCARDS: "Flashcards",
    MINDMAP: "Mind map",
};

const MAX_MB = 50;
/** Direct API origin for uploads: a large multipart body exceeds the Next dev
 *  proxy's limit, so post straight to the API (cookie is same-site). */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "";

/** How many prior turns to replay into the model (matches the API contract). */
const HISTORY_TURNS = 10;
/** Select sentinel for "no class/subject filter" — a real id is never this. */
const ALL_SCOPE = "all";

export default function TeacherStudioPage() {
    // useSearchParams needs a Suspense boundary; the fallback mirrors the
    // page skeleton so the swap is not visible.
    return (
        <React.Suspense fallback={<StudioSkeleton />}>
            <Studio />
        </React.Suspense>
    );
}

function StudioSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeader title="Studio" icon={FaFolderOpen} />
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,290px)_minmax(0,1fr)_minmax(0,340px)] gap-5">
                <Skeleton className="h-72" />
                <Skeleton className="h-72" />
                <Skeleton className="h-72" />
            </div>
        </div>
    );
}

function Studio() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { teacherId } = useMyTeacher();

    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [classId, setClassId] = React.useState<string | null>(null);
    const [subjectId, setSubjectId] = React.useState<string | null>(null);

    const [sources, setSources] = React.useState<Source[]>([]);
    const [sourcesLoading, setSourcesLoading] = React.useState(true);
    const [detail, setDetail] = React.useState<SourceDetail | null>(null);
    const [guide, setGuide] = React.useState<SourceSummary | null>(null);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const [chat, setChat] = React.useState<ChatEntry[]>([]);
    const [question, setQuestion] = React.useState("");
    const [asking, setAsking] = React.useState(false);
    const [detailQuestion, setDetailQuestion] = React.useState("");
    const [detailAsk, setDetailAsk] = React.useState<{ answer: string; citations: { page: number | null; snippet: string }[] } | null>(null);
    const [detailAsking, setDetailAsking] = React.useState(false);

    const [papers, setPapers] = React.useState<Paper[]>([]);
    const [papersLoading, setPapersLoading] = React.useState(true);
    const [plans, setPlans] = React.useState<Plan[]>([]);
    const [plansLoading, setPlansLoading] = React.useState(true);
    const [materials, setMaterials] = React.useState<Material[]>([]);
    const [materialsLoading, setMaterialsLoading] = React.useState(true);
    const [materialBusy, setMaterialBusy] = React.useState<MaterialKind | null>(null);
    const [materialError, setMaterialError] = React.useState<string | null>(null);
    const [deletingId, setDeletingId] = React.useState<string | null>(null);

    const [addOpen, setAddOpen] = React.useState(false);
    const [mode, setMode] = React.useState<"file" | "text" | "url">("file");
    const [url, setUrl] = React.useState("");
    const [filename, setFilename] = React.useState("");
    const [text, setText] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [dragging, setDragging] = React.useState(false);
    const fileRef = React.useRef<HTMLInputElement>(null);

    const [tab, setTab] = React.useState<StudioTab>("tests");

    // ── Data loading ────────────────────────────────────────────────

    const loadSources = React.useCallback(() => {
        setSourcesLoading(true);
        api<Source[]>("/ai/sources")
            .then(setSources)
            .catch(() => setSources([]))
            .finally(() => setSourcesLoading(false));
    }, []);

    /** Refresh without flashing the skeleton (used by the processing poll). */
    const refreshSources = React.useCallback(() => {
        api<Source[]>("/ai/sources")
            .then(setSources)
            .catch(() => undefined);
    }, []);

    // An upload returns at once with the row PROCESSING; the extraction,
    // embeddings and summary continue server-side. Poll until it settles so
    // the status pill becomes READY (or FAILED) without a manual reload.
    React.useEffect(() => {
        if (!sources.some((source) => source.status === "PROCESSING")) return;
        const timer = setInterval(refreshSources, 3000);
        return () => clearInterval(timer);
    }, [sources, refreshSources]);

    // Retire the "uploaded — processing" banner once nothing is processing.
    React.useEffect(() => {
        if (sources.length === 0) return;
        if (sources.some((source) => source.status === "PROCESSING")) return;
        setFeedback((current) =>
            current?.kind === "ok" && /processing/i.test(current.msg) ? null : current,
        );
    }, [sources]);

    React.useEffect(() => {
        loadSources();
        api<Paper[]>("/ai/tests")
            .then(setPapers)
            .catch(() => setPapers([]))
            .finally(() => setPapersLoading(false));
        api<Plan[]>("/ai/plans")
            .then(setPlans)
            .catch(() => setPlans([]))
            .finally(() => setPlansLoading(false));
    }, [loadSources]);

    const loadMaterials = React.useCallback(() => {
        setMaterialsLoading(true);
        const query = new URLSearchParams();
        if (classId) query.set("classId", classId);
        if (subjectId) query.set("subjectId", subjectId);
        const qs = query.toString();
        api<Material[]>(`/ai/materials${qs ? `?${qs}` : ""}`)
            .then(setMaterials)
            .catch(() => setMaterials([]))
            .finally(() => setMaterialsLoading(false));
    }, [classId, subjectId]);

    React.useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

    // The teacher's own classes only; their picker drives the subject list.
    React.useEffect(() => {
        if (!teacherId) return;
        api<{ classes: ClassOption[] }>("/classes")
            .then((payload) => {
                setClasses(myClasses(payload.classes, teacherId));
            })
            .catch(() => setClasses([]));
    }, [teacherId]);

    // The chat starters and the generation hint come from the newest ready
    // source's summary — the same artifact the server generated at ingest.
    React.useEffect(() => {
        const firstReady = sources.find((s) => s.status === "READY");
        if (!firstReady) {
            setGuide(null);
            return;
        }
        let cancelled = false;
        api<SourceDetail>(`/ai/sources/${firstReady.id}`)
            .then((doc) => {
                if (!cancelled) setGuide(doc.summary);
            })
            .catch(() => {
                if (!cancelled) setGuide(null);
            });
        return () => {
            cancelled = true;
        };
    }, [sources]);

    React.useEffect(() => {
        const view = searchParams.get("view");
        if (view === "tests" || view === "plans" || view === "materials") setTab(view);
    }, [searchParams]);

    const selectedClass = classes.find((c) => c.id === classId);
    const starters = guide?.suggestedQuestions?.slice(0, 4) ?? [];
    const topicHint = (guide?.keyTopics ?? []).join(", ");

    // Sources are organised by class → subject.
    const groups = React.useMemo(() => {
        const map = new Map<string, { className: string; subjectName: string; items: Source[] }>();
        for (const source of sources) {
            const className = source.class?.name ?? "Unassigned class";
            const subjectName = source.subject?.name ?? "Unassigned subject";
            const key = `${className}::${subjectName}`;
            const group = map.get(key) ?? { className, subjectName, items: [] };
            group.items.push(source);
            map.set(key, group);
        }
        return [...map.values()];
    }, [sources]);

    // ── Source actions ──────────────────────────────────────────────

    function fail(err: unknown, fallback: string) {
        setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : fallback });
    }

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
            const res = await fetch(`${API_ORIGIN}/api/ai/sources/upload`, {
                method: "POST",
                body: fd,
                credentials: "include",
            });
            const data: unknown = await res.json().catch(() => null);
            if (!res.ok) {
                const messages =
                    data && typeof data === "object" && "message" in data ? data.message : `Upload failed (${res.status})`;
                throw new Error(Array.isArray(messages) ? messages.join("; ") : String(messages));
            }
            setAddOpen(false);
            setFeedback({ kind: "ok", msg: `${file.name} uploaded — processing…` });
            loadSources();
        } catch (err) {
            fail(err, "Upload failed");
        } finally {
            setBusy(false);
        }
    }

    async function ingestText() {
        setBusy(true);
        setFeedback(null);
        try {
            await api("/ai/sources/ingest", {
                method: "POST",
                body: {
                    filename: filename.trim() || "pasted-notes.txt",
                    kind: "PDF",
                    text: text.trim(),
                    classId: classId ?? undefined,
                    subjectId: subjectId ?? undefined,
                },
            });
            setAddOpen(false);
            setFilename("");
            setText("");
            setFeedback({ kind: "ok", msg: "Source ingested" });
            loadSources();
        } catch (err) {
            fail(err, "Ingest failed");
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
            setAddOpen(false);
            setUrl("");
            setFeedback({ kind: "ok", msg: "Page ingested" });
            loadSources();
        } catch (err) {
            fail(err, "Fetch failed");
        } finally {
            setBusy(false);
        }
    }

    async function removeSource(id: string) {
        if (!confirm("Delete this source and its chunks?")) return;
        try {
            await api(`/ai/sources/${id}`, { method: "DELETE" });
            setSources((prev) => prev.filter((s) => s.id !== id));
            setFeedback({ kind: "ok", msg: "Source deleted" });
        } catch (err) {
            fail(err, "Delete failed");
        }
    }

    async function openDetail(id: string) {
        setDetailAsk(null);
        setDetailQuestion("");
        try {
            setDetail(await api<SourceDetail>(`/ai/sources/${id}`));
        } catch (err) {
            fail(err, "Could not open the source");
        }
    }

    /** Carry the source's key topics into the plan / paper builder. */
    function useFor(target: "plans" | "tests", topics: string[]) {
        const query = topics.length ? `?topics=${encodeURIComponent(topics.join(", "))}` : "";
        router.push(target === "tests" ? `/teacher/tests/new${query}` : `/teacher/plans/new${query}`);
    }

    // ── Chat ────────────────────────────────────────────────────────

    async function ask(textValue?: string) {
        const q = (textValue ?? question).trim();
        if (!q || asking) return;

        // History is the conversation *before* this question; the API appends
        // the question itself. Cap it so the prompt cannot grow unbounded.
        const history = chat
            .slice(-HISTORY_TURNS)
            .map((entry) => ({ role: entry.role, content: entry.content }));

        setChat((prev) => [...prev, { role: "user", content: q }]);
        setQuestion("");
        setAsking(true);
        try {
            const result = await api<{ answer: string; citations: Citation[] }>("/ai/sources/ask", {
                method: "POST",
                body: {
                    question: q,
                    classId: classId ?? undefined,
                    subjectId: subjectId ?? undefined,
                    history,
                },
            });
            setChat((prev) => [...prev, { role: "assistant", content: result.answer, citations: result.citations }]);
        } catch (err) {
            setChat((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: err instanceof RequestError ? err.messages.join("; ") : "Could not answer that question.",
                },
            ]);
        } finally {
            setAsking(false);
        }
    }

    async function askDetail() {
        const q = detailQuestion.trim();
        if (!detail || !q || detailAsking) return;
        setDetailAsking(true);
        setDetailAsk(null);
        try {
            setDetailAsk(await api<{ answer: string; citations: { page: number | null; snippet: string }[] }>(
                `/ai/sources/${detail.id}/ask`,
                { method: "POST", body: { question: q } },
            ));
        } catch (err) {
            fail(err, "Ask failed");
        } finally {
            setDetailAsking(false);
        }
    }

    // ── Materials ───────────────────────────────────────────────────

    async function generateMaterial(kind: MaterialKind) {
        if (materialBusy) return;
        setMaterialBusy(kind);
        setMaterialError(null);
        try {
            await api<Material>("/ai/materials", {
                method: "POST",
                body: { kind, classId: classId ?? undefined, subjectId: subjectId ?? undefined },
            });
            loadMaterials();
        } catch (err) {
            setMaterialError(err instanceof RequestError ? err.messages.join("; ") : "Could not generate material");
        } finally {
            setMaterialBusy(null);
        }
    }

    async function deleteMaterial(material: Material) {
        setDeletingId(material.id);
        setMaterialError(null);
        try {
            await api(`/ai/materials/${material.id}`, { method: "DELETE" });
            setMaterials((prev) => prev.filter((m) => m.id !== material.id));
        } catch (err) {
            setMaterialError(err instanceof RequestError ? err.messages.join("; ") : "Could not delete material");
        } finally {
            setDeletingId(null);
        }
    }

    // ── Render ──────────────────────────────────────────────────────

    return (
        <div className="space-y-5">
            <PageHeader
                title="Studio"
                subtitle="Your sources, a grounded chat, and everything you generate from them"
                icon={FaFolderOpen}
                actions={
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider">
                                <FaUpload size={12} /> Add source
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="font-black uppercase tracking-tight">Add source</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <Select
                                        value={classId ?? ALL_SCOPE}
                                        onValueChange={(value) => {
                                            setClassId(value === ALL_SCOPE ? null : value);
                                            setSubjectId(null);
                                        }}
                                    >
                                        <SelectTrigger className="h-11"><SelectValue placeholder="All classes" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ALL_SCOPE}>All classes</SelectItem>
                                            {classes.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={subjectId ?? ALL_SCOPE}
                                        onValueChange={(value) => setSubjectId(value === ALL_SCOPE ? null : value)}
                                        disabled={!classId}
                                    >
                                        <SelectTrigger className="h-11"><SelectValue placeholder="All subjects" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ALL_SCOPE}>All subjects</SelectItem>
                                            {dedupeSubjects(selectedClass?.subjects).map((s) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
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
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragging(true);
                                        }}
                                        onDragLeave={() => setDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragging(false);
                                            const file = e.dataTransfer.files?.[0];
                                            if (file && !busy) void uploadFile(file);
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
                                            or click to browse · PDF / PNG / JPEG / WebP / .txt / .md · max {MAX_MB}MB
                                        </p>
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept=".pdf,.txt,.md,.markdown,image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) void uploadFile(file);
                                                e.target.value = "";
                                            }}
                                        />
                                    </div>
                                ) : mode === "url" ? (
                                    <>
                                        <Input placeholder="https://example.com/chapter" value={url}
                                            onChange={(e) => setUrl(e.target.value)} className="h-11" />
                                        <Button onClick={ingestUrl} disabled={busy || !/^https?:\/\/\S+$/i.test(url.trim())}
                                            className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                            {busy ? <><FaSpinner className="animate-spin" size={12} /> Fetching…</> : <><FaLink size={12} /> Fetch & summarize</>}
                                        </Button>
                                        <p className="text-[10px] text-muted-foreground">Public http(s) page · max 2 MB</p>
                                    </>
                                ) : (
                                    <>
                                        <Input placeholder="Filename (e.g. ch3-algebra.txt)" value={filename}
                                            onChange={(e) => setFilename(e.target.value)} className="h-11" />
                                        <Textarea placeholder="Paste the text content (book chapter, notes…)" value={text}
                                            onChange={(e) => setText(e.target.value)} rows={8} />
                                        <Button onClick={ingestText} disabled={busy || !text.trim()}
                                            className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                            {busy ? <><FaSpinner className="animate-spin" size={12} /> Ingesting…</> : "Upload & summarize"}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                }
            />

            {/* Scope: drives the chat retrieval, the material generation and the upload. */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Scope</span>
                <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:max-w-xl">
                    <Select
                        value={classId ?? ALL_SCOPE}
                        onValueChange={(value) => {
                            setClassId(value === ALL_SCOPE ? null : value);
                            setSubjectId(null);
                        }}
                    >
                        <SelectTrigger className="h-10"><SelectValue placeholder="All classes" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_SCOPE}>All classes</SelectItem>
                            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select
                        value={subjectId ?? ALL_SCOPE}
                        onValueChange={(value) => setSubjectId(value === ALL_SCOPE ? null : value)}
                        disabled={!classId}
                    >
                        <SelectTrigger className="h-10"><SelectValue placeholder="All subjects" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_SCOPE}>All subjects</SelectItem>
                            {dedupeSubjects(selectedClass?.subjects).map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {feedback ? (
                <div className={`p-3 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,290px)_minmax(0,1fr)_minmax(0,340px)] gap-5 items-start">
                {/* ── Sources pane ─────────────────────────────────── */}
                <Card className="border-border/60 shadow-sm xl:sticky xl:top-4">
                    <CardHeader className="border-b border-border/60 pb-3">
                        <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            <FaFolderOpen className="text-primary" size={13} /> Sources
                            <span className="ml-auto text-[10px] text-muted-foreground">{sources.length}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                        {sourcesLoading ? (
                            <Skeleton className="h-32" />
                        ) : sources.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-6 text-center">
                                No sources yet. Add a chapter and the chat answers from it.
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                {groups.map((group) => (
                                    <div key={`${group.className}::${group.subjectName}`} className="space-y-1.5">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                                            {group.className} · {group.subjectName}
                                        </p>
                                        {group.items.map((source) => (
                                            <div
                                                key={source.id}
                                                onClick={() => openDetail(source.id)}
                                                className="group flex items-start gap-2 rounded-lg border border-border/60 p-2 hover:border-primary/40 cursor-pointer transition-colors"
                                            >
                                                <FaFileLines className="text-muted-foreground shrink-0 mt-0.5" size={11} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold truncate">{source.filename}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Badge className={source.status === "READY"
                                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[8px]"
                                                            : source.status === "FAILED"
                                                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[8px]"
                                                                : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[8px]"}>
                                                            {source.status}
                                                        </Badge>
                                                        <span className="text-[9px] text-muted-foreground">{source.pages ?? "?"}p</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    aria-label={`Delete ${source.filename}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void removeSource(source.id);
                                                    }}
                                                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <FaTrash size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Chat pane ────────────────────────────────────── */}
                <Card className="border-border/60 shadow-sm flex flex-col min-h-[520px]">
                    <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between gap-2">
                        <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            <FaPaperPlane className="text-primary" size={12} /> Chat
                        </CardTitle>
                        {chat.length > 0 ? (
                            <Button size="sm" variant="ghost" onClick={() => setChat([])}
                                className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                <FaXmark size={10} /> Clear
                            </Button>
                        ) : null}
                    </CardHeader>

                    <CardContent className="p-4 flex-1 flex flex-col gap-3 min-h-0">
                        <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "48vh" }}>
                            {chat.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-8">
                                    <p className="text-sm font-semibold">Ask your sources anything</p>
                                    <p className="text-xs text-muted-foreground max-w-xs">
                                        Answers cite the file and page they came from. {sources.length === 0 ? "Add a source to begin." : ""}
                                    </p>
                                    {starters.length > 0 ? (
                                        <div className="flex flex-wrap justify-center gap-2 pt-2">
                                            {starters.map((starter) => (
                                                <button
                                                    key={starter}
                                                    type="button"
                                                    onClick={() => void ask(starter)}
                                                    className="rounded-full border border-border/70 px-3 py-1.5 text-[11px] hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
                                                >
                                                    {starter}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                chat.map((entry, index) => (
                                    <div key={index} className={cn("flex", entry.role === "user" ? "justify-end" : "justify-start")}>
                                        <div className={cn(
                                            "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                                            entry.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                                : "bg-muted/60 border border-border/60 rounded-bl-sm",
                                        )}>
                                            <p className="whitespace-pre-wrap">{entry.content}</p>
                                            {entry.citations && entry.citations.length > 0 ? (
                                                <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
                                                    {entry.citations.map((c, i) => (
                                                        <div key={`${c.sourceId}-${i}`} className="text-[10px] text-muted-foreground">
                                                            <span className="font-black uppercase tracking-wider">{c.filename}</span>
                                                            <Badge className="ml-1.5 bg-primary/10 text-primary border-primary/20 text-[8px]">p.{c.page ?? "?"}</Badge>
                                                            <p className="mt-0.5 line-clamp-2">{c.snippet}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))
                            )}
                            {asking ? (
                                <div className="flex justify-start">
                                    <div className="rounded-2xl rounded-bl-sm bg-muted/60 border border-border/60 px-3.5 py-2.5">
                                        <FaSpinner className="animate-spin text-primary" size={12} />
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="flex gap-2 pt-1 border-t border-border/60">
                            <Textarea
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        void ask();
                                    }
                                }}
                                rows={1}
                                placeholder="Ask about these sources…  (Enter to send)"
                                className="min-h-11 resize-none"
                            />
                            <Button onClick={() => void ask()} disabled={asking || !question.trim()}
                                className="h-11 font-black text-xs uppercase tracking-wider shrink-0">
                                {asking ? <FaSpinner className="animate-spin" size={12} /> : <FaPaperPlane size={12} />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Studio pane ──────────────────────────────────── */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-3">
                        <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            <FaLayerGroup className="text-primary" size={12} /> Studio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                        <Tabs value={tab} onValueChange={(value) => setTab(value as StudioTab)}>
                            <TabsList className="w-full">
                                <TabsTrigger value="tests" className="flex-1 text-[11px] font-black uppercase tracking-wider">Tests</TabsTrigger>
                                <TabsTrigger value="plans" className="flex-1 text-[11px] font-black uppercase tracking-wider">Plans</TabsTrigger>
                                <TabsTrigger value="materials" className="flex-1 text-[11px] font-black uppercase tracking-wider">Materials</TabsTrigger>
                            </TabsList>

                            <TabsContent value="tests" className="space-y-2">
                                <Link href={`/teacher/tests/new${topicHint ? `?topics=${encodeURIComponent(topicHint)}` : ""}`}>
                                    <Button className="w-full h-9 font-black text-[10px] uppercase tracking-wider">
                                        <FaPlus size={10} /> Generate paper
                                    </Button>
                                </Link>
                                {papersLoading ? (
                                    <Skeleton className="h-16" />
                                ) : papers.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground py-3 text-center">No papers yet.</p>
                                ) : (
                                    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                                        {papers.map((paper) => (
                                            <div key={paper.id} className="rounded-lg border border-border/60 p-2.5 space-y-1.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-xs font-semibold leading-tight">{paper.title}</p>
                                                    <Badge variant="outline" className="shrink-0 gap-1 text-[8px] font-black uppercase">
                                                        {paper.mode === "ONLINE" ? <FaDesktop size={8} /> : <FaPrint size={8} />}
                                                        {paper.mode === "ONLINE" ? "Online" : "Print"}
                                                    </Badge>
                                                </div>
                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                                    {paper.class.name} · {paper.subject.name} · {paper.totalMarks}m · {paper.durationMinutes}min
                                                </p>
                                                <div className="flex gap-1.5">
                                                    <Link href={`/teacher/tests/${paper.id}`}>
                                                        <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] font-black uppercase">
                                                            <FaEye size={9} /> View
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/teacher/tests/${paper.id}/print`}>
                                                        <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] font-black uppercase">
                                                            <FaPrint size={9} /> Print
                                                        </Button>
                                                    </Link>
                                                    {paper.mode === "ONLINE" ? (
                                                        <Link href={`/teacher/tests/${paper.id}/attempts`}>
                                                            <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] font-black uppercase">
                                                                <FaUsers size={9} /> Attempts
                                                            </Button>
                                                        </Link>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="plans" className="space-y-2">
                                <Link href={`/teacher/plans/new${topicHint ? `?topics=${encodeURIComponent(topicHint)}` : ""}`}>
                                    <Button className="w-full h-9 font-black text-[10px] uppercase tracking-wider">
                                        <FaPlus size={10} /> Generate plan
                                    </Button>
                                </Link>
                                {plansLoading ? (
                                    <Skeleton className="h-16" />
                                ) : plans.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground py-3 text-center">No plans yet.</p>
                                ) : (
                                    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                                        {plans.map((plan) => {
                                            const done = plan.weeks.filter((w) => w.status === "DONE").length;
                                            const pct = plan.weeks.length ? Math.round((done / plan.weeks.length) * 100) : 0;
                                            return (
                                                <div key={plan.id} className="rounded-lg border border-border/60 p-2.5 space-y-1.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-xs font-semibold leading-tight">{plan.title}</p>
                                                        <Badge className={plan.status === "ACTIVE"
                                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[8px]"
                                                            : "bg-muted text-muted-foreground border-border text-[8px]"}>
                                                            {plan.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                                        {plan.class.name} · {plan.subject.name} · {plan.type}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={pct} className="flex-1 h-1.5" />
                                                        <span className="text-[9px] text-muted-foreground">{done}/{plan.weeks.length}</span>
                                                    </div>
                                                    <Link href={`/teacher/plans/${plan.id}`}>
                                                        <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] font-black uppercase">
                                                            Open <FaArrowRight size={9} />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="materials" className="space-y-2">
                                <div className="flex gap-1.5">
                                    <Button onClick={() => void generateMaterial("FLASHCARDS")} disabled={materialBusy !== null}
                                        className="flex-1 h-9 font-black text-[10px] uppercase tracking-wider">
                                        {materialBusy === "FLASHCARDS" ? <FaSpinner className="animate-spin" size={10} /> : <FaLayerGroup size={10} />} Cards
                                    </Button>
                                    <Button variant="outline" onClick={() => void generateMaterial("MINDMAP")} disabled={materialBusy !== null}
                                        className="flex-1 h-9 font-black text-[10px] uppercase tracking-wider">
                                        {materialBusy === "MINDMAP" ? <FaSpinner className="animate-spin" size={10} /> : <FaSitemap size={10} />} Mind map
                                    </Button>
                                </div>
                                {materialError ? (
                                    <p className="p-2 rounded-lg border border-destructive/20 bg-destructive/10 text-[10px] font-bold text-destructive">
                                        {materialError}
                                    </p>
                                ) : null}
                                {materialsLoading ? (
                                    <Skeleton className="h-16" />
                                ) : materials.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground py-3 text-center">No materials yet.</p>
                                ) : (
                                    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                                        {materials.map((material) => (
                                            <div key={material.id} className="flex items-center gap-1.5 rounded-lg border border-border/60 p-2">
                                                <button type="button" onClick={() => router.push(`/teacher/sources/materials/${material.id}/print`)}
                                                    className="flex flex-1 min-w-0 items-center gap-1.5 text-left cursor-pointer">
                                                    <span className="text-xs font-semibold truncate">{material.title}</span>
                                                    <Badge variant="outline" className="text-[8px] shrink-0">{MATERIAL_KIND_LABEL[material.kind]}</Badge>
                                                </button>
                                                <button type="button" aria-label={`Print ${material.title}`}
                                                    onClick={() => window.open(`/teacher/sources/materials/${material.id}/print`, "_blank")}
                                                    className="p-1 rounded text-muted-foreground hover:text-foreground">
                                                    <FaPrint size={10} />
                                                </button>
                                                <button type="button" aria-label={`Delete ${material.title}`}
                                                    onClick={() => void deleteMaterial(material)} disabled={deletingId === material.id}
                                                    className="p-1 rounded text-muted-foreground hover:text-destructive">
                                                    {deletingId === material.id ? <FaSpinner className="animate-spin" size={10} /> : <FaTrash size={10} />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            {/* ── Source detail dialog ─────────────────────────────── */}
            <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight">{detail?.filename}</DialogTitle>
                    </DialogHeader>

                    {detail?.summary ? (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                            <p className="text-[10px] font-black text-primary uppercase tracking-wider">Summary</p>
                            <p className="text-sm">
                                {detail.summary.summary ?? "No summary yet — the summarize step did not run for this upload."}
                            </p>
                            {(detail.summary.keyTopics?.length ?? 0) > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {detail.summary.keyTopics?.map((topic) => (
                                        <Badge key={topic} className="bg-primary/10 text-primary border-primary/20 text-[9px]">{topic}</Badge>
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
                        <Button variant="outline" onClick={() => useFor("plans", detail?.summary?.keyTopics ?? [])}
                            className="font-black text-xs uppercase tracking-wider">
                            <FaBookOpen size={12} /> Make lesson plan
                        </Button>
                        <Button variant="outline" onClick={() => useFor("tests", detail?.summary?.keyTopics ?? [])}
                            className="font-black text-xs uppercase tracking-wider">
                            <FaClipboardList size={12} /> Make test paper
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Ask about this source</p>
                        <div className="flex gap-2">
                            <Input placeholder="e.g. What is the distributive property?" value={detailQuestion}
                                onChange={(e) => setDetailQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") void askDetail();
                                }}
                                className="h-11" />
                            <Button onClick={() => void askDetail()} disabled={detailAsking || !detailQuestion.trim()}
                                className="font-black text-xs uppercase tracking-wider">
                                {detailAsking ? <FaSpinner className="animate-spin" size={12} /> : <FaPaperPlane size={12} />}
                            </Button>
                        </div>
                        {detailAsk ? (
                            <div className="p-4 rounded-xl border border-border/60 space-y-3">
                                <p className="text-sm">{detailAsk.answer}</p>
                                {detailAsk.citations.length > 0 ? (
                                    <div className="space-y-2 pt-2 border-t border-border/60">
                                        {detailAsk.citations.map((c, i) => (
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
                        {detail?.chunks.map((chunk, i) => (
                            <div key={i} className="p-3 rounded-lg border border-border/60 text-xs text-muted-foreground">
                                <span className="font-black text-primary text-[9px] uppercase">p.{chunk.page ?? "?"} </span>
                                {chunk.content}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
