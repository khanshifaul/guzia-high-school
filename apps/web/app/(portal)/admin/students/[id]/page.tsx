"use client";

// app/(portal)/admin/students/[id]/page.tsx — student detail: stats, transcript,
// fee ledger.

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FaArrowLeft, FaGraduationCap, FaCalendarCheck, FaMoneyBillWave } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { api } from "@/lib/api";

interface GradedSubject { subject: string; marksObtained: number; totalMarks: number; percent: number; letter: string; point: number }
interface Detail {
    id: string; admissionNo: string; fullName: string; rollNo: number;
    class: { name: string }; section: { name: string } | null;
    user: { email: string } | null;
    stats: { attendancePct: number; cgpa: number; totalDue: number };
    transcript: { exams: { id: string; name: string; gpa: number; subjects: GradedSubject[] }[] };
}

export default function AdminStudentDetailPage() {
    const params = useParams<{ id: string }>();
    const [student, setStudent] = React.useState<Detail | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        api<Detail>(`/students/${params.id}`)
            .then((p) => setStudent(p))
            .catch(() => setError("Failed to load student"))
            .finally(() => setLoading(false));
    }, [params.id]);

    if (loading) return <div className="space-y-6"><PageHeader title="Student" icon={FaGraduationCap} /><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
    if (error || !student) return <EmptyState title="Not found" description={error ?? "Student not found"} />;

    return (
        <div className="space-y-6">
            <PageHeader title={student.fullName} subtitle={`${student.admissionNo} · ${student.class.name}${student.section ? `-${student.section.name}` : ""} · Roll ${student.rollNo}`}
                icon={FaGraduationCap}
                actions={
                    <Link href="/admin/students">
                        <button className="inline-flex items-center gap-2 font-black text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer">
                            <FaArrowLeft size={12} /> Back
                        </button>
                    </Link>
                } />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard value={`${student.stats.attendancePct}%`} label="Attendance" />
                <StatCard value={student.stats.cgpa.toFixed(2)} label="CGPA" />
                <StatCard value={`৳${student.stats.totalDue}`} label="Pending Fees" />
            </div>

            {student.transcript.exams.length === 0 ? (
                <EmptyState title="No published results" description="Exam results will appear once published." />
            ) : (
                student.transcript.exams.map((exam) => (
                    <Card key={exam.id} className="border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-black uppercase tracking-tight">{exam.name}</CardTitle>
                            <Badge className="bg-primary/10 text-primary border-primary/20">GPA {exam.gpa.toFixed(2)}</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead className="text-right">Marks</TableHead>
                                        <TableHead className="text-center">Grade</TableHead>
                                        <TableHead className="text-right">Point</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {exam.subjects.map((s) => (
                                        <TableRow key={s.subject}>
                                            <TableCell className="font-semibold">{s.subject}</TableCell>
                                            <TableCell className="text-right">{s.marksObtained}/{s.totalMarks}</TableCell>
                                            <TableCell className="text-center"><Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{s.letter}</Badge></TableCell>
                                            <TableCell className="text-right font-bold">{s.point.toFixed(1)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
