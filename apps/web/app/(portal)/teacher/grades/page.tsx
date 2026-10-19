"use client";

// app/(portal)/teacher/grades/page.tsx — enter marks for an exam. Pick exam +
// subject, then a marks grid with server-validated 0..total range.

import * as React from "react";
import { FaGraduationCap, FaSpinner } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";
import { dedupeSubjects } from "@/lib/subjects";

interface Exam { id: string; name: string; published: boolean; subjects: { subjectId: string; totalMarks: number }[]; class: { id: string; name: string; subjects: { subjectId: string; subject: { id: string; name: string } }[] } }
interface Student { id: string; rollNo: number; fullName: string }

/** The server's fallback total for a subject with no explicit row. */
const DEFAULT_TOTAL_MARKS = 100;

export default function TeacherGradesPage() {
    const [exams, setExams] = React.useState<Exam[]>([]);
    const [examId, setExamId] = React.useState<string | null>(null);
    const [subjectId, setSubjectId] = React.useState<string | null>(null);
    const [students, setStudents] = React.useState<Student[]>([]);
    const [marks, setMarks] = React.useState<Record<string, string>>({});

    const [loading, setLoading] = React.useState(true);
    const [loadingStudents, setLoadingStudents] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    React.useEffect(() => {
        api<Exam[]>("/exams")
            .then((p) => setExams(p))
            .catch(() => setExams([]))
            .finally(() => setLoading(false));
    }, []);

    const exam = exams.find((e) => e.id === examId);
    const subjects = dedupeSubjects(exam?.class.subjects);
    // The server owns the total for each subject of this exam.
    const totalMarks =
        exam?.subjects.find((s) => s.subjectId === subjectId)?.totalMarks ?? DEFAULT_TOTAL_MARKS;

    React.useEffect(() => {
        if (!exam) return;
        setLoadingStudents(true);
        setFeedback(null);
        api<{ data: Student[] }>(`/students?classId=${exam.class.id}`)
            .then((p) => setStudents(p.data))
            .catch((err) => {
                // Do not swallow this: an empty roster reads as "no students",
                // which hides a permissions or fetch failure.
                setStudents([]);
                setFeedback({
                    kind: "err",
                    msg: err instanceof RequestError ? err.messages.join("; ") : "Could not load the class roster",
                });
            })
            .finally(() => setLoadingStudents(false));
    }, [exam]);

    async function save() {
        setBusy(true);
        setFeedback(null);
        try {
            // The total is the server's; the client sends only the mark.
            const payload = students
                .filter((s) => marks[s.id] !== undefined && marks[s.id] !== "")
                .map((s) => ({
                    studentId: s.id,
                    subjectId,
                    marksObtained: Number(marks[s.id]),
                }));
            if (payload.length === 0) {
                setFeedback({ kind: "err", msg: "Enter marks for at least one student" });
                return;
            }
            await api(`/exams/${examId}/marks`, { method: "POST", body: { marks: payload } });
            setFeedback({ kind: "ok", msg: `Saved ${payload.length} marks` });
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Save failed" });
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Grades" icon={FaGraduationCap} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Enter Grades" subtitle="Marks are validated 0–100 server-side" icon={FaGraduationCap} />

            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Exam</label>
                        <Select value={examId ?? undefined} onValueChange={(v) => { setExamId(v); setSubjectId(null); setMarks({}); }}>
                            <SelectTrigger className="h-11 text-xs font-semibold"><SelectValue placeholder="Select exam" /></SelectTrigger>
                            <SelectContent>
                                {exams.map((e) => (
                                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.class.name})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Subject</label>
                        <Select value={subjectId ?? undefined} onValueChange={setSubjectId} disabled={!exam}>
                            <SelectTrigger className="h-11 text-xs font-semibold"><SelectValue placeholder="Select subject" /></SelectTrigger>
                            <SelectContent>
                                {subjects.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button onClick={save} disabled={busy || !subjectId || students.length === 0}
                            className="w-full h-11 font-black text-xs uppercase tracking-wider">
                            {busy ? <><FaSpinner className="animate-spin" size={12} /> Saving…</> : "Save Marks"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {!examId || !subjectId ? (
                <EmptyState title="Select exam & subject" description="Choose an exam and subject to load the roster." />
            ) : loadingStudents ? (
                <Skeleton className="h-64" />
            ) : students.length === 0 ? (
                <EmptyState title="No students" description="No students in this class." />
            ) : (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">
                            {exam?.name} · {subjects.find((s) => s.id === subjectId)?.name}
                            <Badge className="ml-2 bg-primary/10 text-primary border-primary/20">out of {totalMarks}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Roll</TableHead>
                                    <TableHead>Student</TableHead>
                                    <TableHead className="text-right w-32">Marks (0–{totalMarks})</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((s) => {
                                    const val = marks[s.id] ?? "";
                                    const num = Number(val);
                                    const invalid = val !== "" && (isNaN(num) || num < 0 || num > totalMarks);
                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell><Badge variant="outline" className="text-[10px] font-black">{s.rollNo}</Badge></TableCell>
                                            <TableCell className="font-semibold">{s.fullName}</TableCell>
                                            <TableCell className="text-right">
                                                <input type="number" min={0} max={totalMarks} value={val}
                                                    onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                                                    className={`w-24 h-9 px-2 border rounded-lg text-sm text-right ${invalid ? "border-destructive text-destructive" : "border-input"}`} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
