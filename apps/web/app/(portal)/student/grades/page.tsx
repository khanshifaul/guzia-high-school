"use client";

// app/(portal)/student/grades/page.tsx — published results: per-exam subject
// tables with canonical letters/points + CGPA banner (single grading source).

import * as React from "react";
import { FaGraduationCap } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";
import { useMyStudent } from "@/lib/student-session";

interface GradedSubject {
    subject: string;
    marksObtained: number;
    totalMarks: number;
    percent: number;
    letter: string;
    point: number;
    passed: boolean;
}
interface ExamResult { id: string; name: string; gpa: number; subjects: GradedSubject[] }
interface ResultsResp { exams: ExamResult[]; cgpa: number }

export default function StudentGradesPage() {
    const { studentId, loading: loadingMe } = useMyStudent();
    const [data, setData] = React.useState<ResultsResp | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!studentId) return;
        api<ResultsResp>(`/exams/results/student/${studentId}`)
            .then((p) => setData(p))
            .catch(() => setData({ exams: [], cgpa: 0 }))
            .finally(() => setLoading(false));
    }, [studentId]);

    if (loadingMe || loading) {
        return <div className="space-y-6"><PageHeader title="Grades" icon={FaGraduationCap} /><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
    }
    if (!studentId) return <EmptyState title="No student profile" description="Your account is not linked to a student record." />;

    return (
        <div className="space-y-6">
            <PageHeader title="Grades" subtitle="Published exam results with GPA & CGPA" icon={FaGraduationCap} />

            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-4xl font-black text-primary">{(data?.cgpa ?? 0).toFixed(2)}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">Cumulative GPA</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{data?.exams.length ?? 0} published exam(s)</p>
                </CardContent>
            </Card>

            {!data || data.exams.length === 0 ? (
                <EmptyState title="No published results" description="Your teacher has not published exam results yet." />
            ) : (
                data.exams.map((exam) => (
                    <Card key={exam.id} className="border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-xl font-black uppercase tracking-tight">{exam.name}</CardTitle>
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-wider">
                                GPA {exam.gpa.toFixed(2)}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead className="text-right">Marks</TableHead>
                                        <TableHead className="text-right">%</TableHead>
                                        <TableHead className="text-center">Grade</TableHead>
                                        <TableHead className="text-right">Point</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {exam.subjects.map((s) => (
                                        <TableRow key={s.subject}>
                                            <TableCell className="font-semibold">{s.subject}</TableCell>
                                            <TableCell className="text-right">{s.marksObtained}/{s.totalMarks}</TableCell>
                                            <TableCell className="text-right">{s.percent}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={s.passed ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}>
                                                    {s.letter}
                                                </Badge>
                                            </TableCell>
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
