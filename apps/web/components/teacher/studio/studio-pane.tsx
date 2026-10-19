"use client";

// components/teacher/studio/studio-pane.tsx — the right pane: the artifacts
// generated from this workspace's sources (papers, plans, materials).
// Each row links to its own drill-down page, carrying the workspace back.
import * as React from "react";
import Link from "next/link";
import { FaDesktop, FaEye, FaPlus, FaPrint, FaSpinner, FaTrash, FaUsers } from "react-icons/fa6";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, RequestError } from "@/lib/api";

export type StudioView = "tests" | "plans" | "materials";

interface Paper {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    mode?: string;
    class: { name: string };
    subject: { name: string };
}
interface Plan {
    id: string;
    title: string;
    type: string;
    status: string;
    weeks: { status: string }[];
    class: { name: string };
    subject: { name: string };
}
interface Material {
    id: string;
    title: string;
    kind: "FLASHCARDS" | "MINDMAP";
    createdAt: string;
}

const MATERIAL_LABEL: Record<Material["kind"], string> = {
    FLASHCARDS: "Flashcards",
    MINDMAP: "Mind map",
};

export function StudioPane({
    workspaceId,
    classId,
    subjectId,
    view,
    onViewChange,
    topics,
}: {
    workspaceId: string;
    classId: string | null;
    subjectId: string | null;
    view: StudioView;
    onViewChange: (view: StudioView) => void;
    topics: string;
}) {
    const [papers, setPapers] = React.useState<Paper[]>([]);
    const [plans, setPlans] = React.useState<Plan[]>([]);
    const [materials, setMaterials] = React.useState<Material[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [busy, setBusy] = React.useState<"FLASHCARDS" | "MINDMAP" | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [deleting, setDeleting] = React.useState<string | null>(null);

    const loadMaterials = React.useCallback(() => {
        const query = new URLSearchParams();
        if (classId) query.set("classId", classId);
        if (subjectId) query.set("subjectId", subjectId);
        const qs = query.toString();
        api<Material[]>(`/ai/materials${qs ? `?${qs}` : ""}`)
            .then(setMaterials)
            .catch(() => setMaterials([]));
    }, [classId, subjectId]);

    React.useEffect(() => {
        setLoading(true);
        void Promise.all([
            api<Paper[]>("/ai/tests").then(setPapers).catch(() => setPapers([])),
            api<Plan[]>("/ai/plans").then(setPlans).catch(() => setPlans([])),
        ]).finally(() => setLoading(false));
        loadMaterials();
    }, [loadMaterials]);

    const suffix = [topics ? `topics=${encodeURIComponent(topics)}` : "", `workspaceId=${workspaceId}`]
        .filter(Boolean)
        .join("&");

    async function generate(kind: "FLASHCARDS" | "MINDMAP") {
        if (busy) return;
        setBusy(kind);
        setError(null);
        try {
            await api("/ai/materials", {
                method: "POST",
                body: { kind, classId: classId ?? undefined, subjectId: subjectId ?? undefined },
            });
            loadMaterials();
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not generate material");
        } finally {
            setBusy(null);
        }
    }

    async function remove(material: Material) {
        setDeleting(material.id);
        setError(null);
        try {
            await api(`/ai/materials/${material.id}`, { method: "DELETE" });
            setMaterials((current) => current.filter((item) => item.id !== material.id));
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not delete material");
        } finally {
            setDeleting(null);
        }
    }

    return (
        <div className="p-3 space-y-2">
            <Tabs value={view} onValueChange={(value) => onViewChange(value as StudioView)}>
                <TabsList className="w-full">
                    <TabsTrigger value="tests" className="flex-1 text-[10px] font-black uppercase tracking-wider">Papers</TabsTrigger>
                    <TabsTrigger value="plans" className="flex-1 text-[10px] font-black uppercase tracking-wider">Plans</TabsTrigger>
                    <TabsTrigger value="materials" className="flex-1 text-[10px] font-black uppercase tracking-wider">Materials</TabsTrigger>
                </TabsList>

                {error ? (
                    <p className="mt-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-[10px] font-bold text-destructive">
                        {error}
                    </p>
                ) : null}

                <TabsContent value="tests" className="space-y-2">
                    <Link href={`/teacher/tests/new?${suffix}`}>
                        <Button className="w-full h-9 font-black text-[10px] uppercase tracking-wider">
                            <FaPlus size={10} /> Generate paper
                        </Button>
                    </Link>
                    {loading ? <Skeleton className="h-16" /> : papers.length === 0 ? (
                        <p className="py-3 text-center text-[11px] text-muted-foreground">No papers yet.</p>
                    ) : (
                        <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
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
                                        <Link href={`/teacher/tests/${paper.id}?workspaceId=${workspaceId}`}>
                                            <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] font-black uppercase"><FaEye size={9} /> View</Button>
                                        </Link>
                                        <Link href={`/teacher/tests/${paper.id}/print`}>
                                            <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] font-black uppercase"><FaPrint size={9} /> Print</Button>
                                        </Link>
                                        {paper.mode === "ONLINE" ? (
                                            <Link href={`/teacher/tests/${paper.id}/attempts?workspaceId=${workspaceId}`}>
                                                <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] font-black uppercase"><FaUsers size={9} /> Attempts</Button>
                                            </Link>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="plans" className="space-y-2">
                    <Link href={`/teacher/plans/new?${suffix}`}>
                        <Button className="w-full h-9 font-black text-[10px] uppercase tracking-wider">
                            <FaPlus size={10} /> Generate plan
                        </Button>
                    </Link>
                    {loading ? <Skeleton className="h-16" /> : plans.length === 0 ? (
                        <p className="py-3 text-center text-[11px] text-muted-foreground">No plans yet.</p>
                    ) : (
                        <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
                            {plans.map((plan) => {
                                const done = plan.weeks.filter((week) => week.status === "DONE").length;
                                const percent = plan.weeks.length ? Math.round((done / plan.weeks.length) * 100) : 0;
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
                                            <Progress value={percent} className="flex-1 h-1.5" />
                                            <span className="text-[9px] text-muted-foreground">{done}/{plan.weeks.length}</span>
                                        </div>
                                        <Link href={`/teacher/plans/${plan.id}?workspaceId=${workspaceId}`}>
                                            <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] font-black uppercase">Open</Button>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="materials" className="space-y-2">
                    <div className="flex gap-1.5">
                        <Button onClick={() => void generate("FLASHCARDS")} disabled={busy !== null}
                            className="flex-1 h-9 font-black text-[10px] uppercase tracking-wider">
                            {busy === "FLASHCARDS" ? <FaSpinner className="animate-spin" size={10} /> : null} Cards
                        </Button>
                        <Button variant="outline" onClick={() => void generate("MINDMAP")} disabled={busy !== null}
                            className="flex-1 h-9 font-black text-[10px] uppercase tracking-wider">
                            {busy === "MINDMAP" ? <FaSpinner className="animate-spin" size={10} /> : null} Mind map
                        </Button>
                    </div>
                    {loading ? <Skeleton className="h-16" /> : materials.length === 0 ? (
                        <p className="py-3 text-center text-[11px] text-muted-foreground">No materials yet.</p>
                    ) : (
                        <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
                            {materials.map((material) => (
                                <div key={material.id} className="flex items-center gap-1.5 rounded-lg border border-border/60 p-2">
                                    <Link href={`/teacher/sources/materials/${material.id}/print?workspaceId=${workspaceId}`}
                                        className="flex min-w-0 flex-1 items-center gap-1.5">
                                        <span className="truncate text-xs font-semibold">{material.title}</span>
                                        <Badge variant="outline" className="shrink-0 text-[8px]">{MATERIAL_LABEL[material.kind]}</Badge>
                                    </Link>
                                    <button type="button" aria-label={`Print ${material.title}`}
                                        onClick={() => window.open(`/teacher/sources/materials/${material.id}/print`, "_blank")}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground">
                                        <FaPrint size={10} />
                                    </button>
                                    <button type="button" aria-label={`Delete ${material.title}`}
                                        onClick={() => void remove(material)} disabled={deleting === material.id}
                                        className="p-1 rounded text-muted-foreground hover:text-destructive">
                                        {deleting === material.id ? <FaSpinner className="animate-spin" size={10} /> : <FaTrash size={10} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
