"use client";

// app/(portal)/parent/progress/page.tsx — the selected child's published
// results with canonical GPA/CGPA.

import * as React from "react";
import { FaGraduationCap } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";
import { ChildSelector, useMyChildren } from "../_components/child-selector";

interface GradedSubject { subject: string; marksObtained: number; totalMarks: number; percent: number; letter: string; point: number }
interface ExamResult { id: string; name: string; gpa: number; subjects: GradedSubject[] }
interface ResultsResp { exams: ExamResult[]; cgpa: number }

export default function ParentProgressPage() {
    const { children, loading, selected, setSelected } = useMyChildren();
    const [data, setData] = React.useState<ResultsResp | null>(null);
    const [loadingResults, setLoadingResults] = React.useState(false);

    React.useEffect(() => {
        if (!selected) return;
        setLoadingResults(true);
        api<ResultsResp>(`/exams/results/student/${selected}`)
            .then((p) => setData(p))
            .catch(() => setData({ exams: [], cgpa: 0 }))
            .finally(() => setLoadingResults(false));
    }, [selected]);

    return (
        <div className="space-y-6">
            <PageHeader title="Progress" subtitle="Published exam results & CGPA" icon={FaGraduationCap} />
            <ChildSelector children={children} loading={loading} selected={selected} onChange={setSelected} />

            {loading || loadingResults ? (
                <Skeleton className="h-64" />
            ) : !data || data.exams.length === 0 ? (
                <EmptyState title="No published results" description="Exam results will appear once published." />
            ) : (
                <>
                    <div className="text-4xl font-black text-primary">{data.cgpa.toFixed(2)} <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">CGPA</span></div>
                    {data.exams.map((exam) => (
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
                                                <TableCell className="text-center">
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{s.letter}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-bold">{s.point.toFixed(1)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))}
                </>
            )}
        </div>
    );
}
