"use client";

// app/(portal)/admin/classes/page.tsx — academic structure: classes, sections,
// subjects, and teacher assignment per class-subject.

import * as React from "react";
import { motion } from "motion/react";
import { FaLayerGroup } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface ClassSubject { id: string; subject: { id: string; name: string }; teacher: { user: { fullName: string } } | null }
interface SchoolClass {
    id: string; name: string; _count: { students: number };
    sections: { id: string; name: string; _count?: { students: number } }[];
    subjects: ClassSubject[];
}
interface Teacher { id: string; user: { fullName: string } }

export default function AdminClassesPage() {
    const [classes, setClasses] = React.useState<SchoolClass[]>([]);
    const [teachers, setTeachers] = React.useState<Teacher[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const load = React.useCallback(() => {
        api<{ classes: SchoolClass[] }>("/classes")
            .then((p) => setClasses(p.classes))
            .catch(() => setClasses([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        load();
        api<{ data: Teacher[] }>("/teachers")
            .then((p) => setTeachers(p.data))
            .catch(() => setTeachers([]));
    }, [load]);

    async function assign(classSubjectId: string, teacherId: string) {
        setFeedback(null);
        try {
            await api(`/classes/assign/${classSubjectId}`, { method: "POST", body: { teacherId } });
            setFeedback({ kind: "ok", msg: "Teacher assigned" });
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Assign failed" });
        }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Classes" icon={FaLayerGroup} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Classes & Subjects" subtitle="Academic structure and teacher assignments" icon={FaLayerGroup} />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {classes.length === 0 ? (
                <EmptyState title="No classes" description="Classes are seeded; add via the API." />
            ) : (
                classes.map((cls) => (
                    <motion.div key={cls.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-black uppercase tracking-tight">{cls.name}</CardTitle>
                                <div className="flex gap-2">
                                    <Badge className="bg-primary/10 text-primary border-primary/20">{cls._count.students} students</Badge>
                                    <Badge variant="outline">{cls.sections.length} sections</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Sections</p>
                                    <div className="flex flex-wrap gap-2">
                                        {cls.sections.map((s) => (
                                            <Badge key={s.id} variant="outline">{s.name}</Badge>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Subjects & teachers</p>
                                    <div className="space-y-2">
                                        {cls.subjects.map((cs) => (
                                            <div key={cs.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/60">
                                                <span className="text-sm font-semibold">{cs.subject.name}</span>
                                                <Select value={cs.teacher ? cs.teacher.user.fullName : undefined}
                                                    onValueChange={(v) => { const t = teachers.find((x) => x.user.fullName === v); if (t) assign(cs.id, t.id); }}>
                                                    <SelectTrigger className="w-56 h-9 text-xs"><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                                                    <SelectContent>
                                                        {teachers.map((t) => (
                                                            <SelectItem key={t.id} value={t.user.fullName}>{t.user.fullName}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))
            )}
        </div>
    );
}
