"use client";

// app/(portal)/teacher/studio/page.tsx — notebook-style home: every workspace,
// newest first, with the card data the API already derived (counts, preview).
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaFolderOpen, FaPlus, FaSpinner } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceCard } from "@/components/teacher/studio/workspace-card";
import { api, RequestError } from "@/lib/api";
import { useMyTeacher } from "@/lib/teacher-session";
import { myClasses } from "@/lib/teacher-classes";
import { dedupeSubjects } from "@/lib/subjects";
import type { ClassOption, WorkspaceSummary } from "@/lib/studio";

interface Editor {
    mode: "create" | "rename";
    id?: string;
    title: string;
    classId: string;
    subjectId: string;
}

export default function StudioHomePage() {
    const router = useRouter();
    const { teacherId } = useMyTeacher();
    const [workspaces, setWorkspaces] = React.useState<WorkspaceSummary[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState("");
    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [editor, setEditor] = React.useState<Editor | null>(null);
    const [busy, setBusy] = React.useState(false);
    const [formError, setFormError] = React.useState<string | null>(null);

    const load = React.useCallback(() => {
        setLoading(true);
        setError(null);
        api<WorkspaceSummary[]>("/workspaces")
            .then(setWorkspaces)
            .catch((err) =>
                setError(err instanceof RequestError ? err.messages.join("; ") : "Could not load your workspaces"),
            )
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    React.useEffect(() => {
        if (!teacherId) return;
        api<{ classes: ClassOption[] }>("/classes")
            .then((payload) => setClasses(myClasses(payload.classes, teacherId)))
            .catch(() => setClasses([]));
    }, [teacherId]);

    const selectedClass = classes.find((item) => item.id === editor?.classId);
    const query = search.trim().toLowerCase();
    const shown = workspaces.filter((workspace) =>
        [workspace.title, workspace.class?.name ?? "", workspace.subject?.name ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(query),
    );

    async function save() {
        if (!editor) return;
        setBusy(true);
        setFormError(null);
        try {
            const body = {
                title: editor.title.trim(),
                classId: editor.classId,
                subjectId: editor.subjectId,
            };
            if (editor.mode === "create") {
                const created = await api<{ id: string }>("/workspaces", { method: "POST", body });
                router.push(`/teacher/studio/${created.id}`);
                return;
            }
            await api(`/workspaces/${editor.id}`, { method: "PATCH", body });
            setEditor(null);
            load();
        } catch (err) {
            setFormError(err instanceof RequestError ? err.messages.join("; ") : "Could not save");
        } finally {
            setBusy(false);
        }
    }

    async function remove(workspace: WorkspaceSummary) {
        if (!window.confirm(`Delete "${workspace.title}"? Its sources stay in the library.`)) return;
        try {
            await api(`/workspaces/${workspace.id}`, { method: "DELETE" });
            setWorkspaces((current) => current.filter((item) => item.id !== workspace.id));
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not delete");
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Studio"
                subtitle="Your workspaces"
                icon={FaFolderOpen}
                actions={
                    <div className="flex gap-2">
                        <Link href="/teacher/studio/library">
                            <Button variant="outline" className="font-black text-xs uppercase tracking-wider">Library</Button>
                        </Link>
                        <Button
                            onClick={() => setEditor({ mode: "create", title: "", classId: "", subjectId: "" })}
                            className="font-black text-xs uppercase tracking-wider"
                        >
                            <FaPlus size={12} /> New workspace
                        </Button>
                    </div>
                }
            />

            <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search workspaces by title, class or subject…"
                className="h-11 max-w-md"
            />

            {error ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-bold text-destructive">
                    <span>{error}</span>
                    <Button size="sm" variant="outline" onClick={load}>Retry</Button>
                </div>
            ) : null}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                </div>
            ) : workspaces.length === 0 ? (
                <EmptyState
                    title="No workspaces yet"
                    description="A workspace holds your sources and the conversation about them."
                    action={
                        <Button onClick={() => setEditor({ mode: "create", title: "", classId: "", subjectId: "" })}>
                            Create workspace
                        </Button>
                    }
                />
            ) : shown.length === 0 ? (
                <EmptyState
                    title={`No workspaces match “${search.trim()}”`}
                    description="Try a different title, class or subject."
                    action={<Button variant="outline" onClick={() => setSearch("")}>Clear search</Button>}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {shown.map((workspace) => (
                        <WorkspaceCard
                            key={workspace.id}
                            workspace={workspace}
                            onOpen={() => router.push(`/teacher/studio/${workspace.id}`)}
                            onRename={() =>
                                setEditor({
                                    mode: "rename",
                                    id: workspace.id,
                                    title: workspace.title,
                                    classId: workspace.class?.id ?? "",
                                    subjectId: workspace.subject?.id ?? "",
                                })
                            }
                            onDelete={() => void remove(workspace)}
                        />
                    ))}
                </div>
            )}

            <Dialog open={editor !== null} onOpenChange={(open) => setEditor(open ? editor : null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight">
                            {editor?.mode === "create" ? "New workspace" : "Rename workspace"}
                        </DialogTitle>
                    </DialogHeader>
                    {editor ? (
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void save();
                            }}
                        >
                            <div className="space-y-1.5">
                                <Label htmlFor="ws-title" className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Title</Label>
                                <Input
                                    id="ws-title"
                                    value={editor.title}
                                    onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                                    placeholder="e.g. Bangla 1st Paper"
                                    className="h-11"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Class</Label>
                                    <Select
                                        value={editor.classId || "none"}
                                        onValueChange={(value) =>
                                            setEditor({ ...editor, classId: value === "none" ? "" : value, subjectId: "" })
                                        }
                                    >
                                        <SelectTrigger className="h-11"><SelectValue placeholder="None" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {classes.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Subject</Label>
                                    <Select
                                        value={editor.subjectId || "none"}
                                        onValueChange={(value) => setEditor({ ...editor, subjectId: value === "none" ? "" : value })}
                                        disabled={!editor.classId}
                                    >
                                        <SelectTrigger className="h-11"><SelectValue placeholder="None" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {dedupeSubjects(selectedClass?.subjects).map((subject) => (
                                                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {formError ? <p className="text-[11px] font-semibold text-destructive">{formError}</p> : null}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setEditor(null)} disabled={busy}>Cancel</Button>
                                <Button type="submit" disabled={busy || !editor.title.trim()} className="w-auto">
                                    {busy ? <FaSpinner className="animate-spin" size={12} /> : "Save"}
                                </Button>
                            </div>
                        </form>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
