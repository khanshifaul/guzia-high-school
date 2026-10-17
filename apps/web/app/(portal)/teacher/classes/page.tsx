"use client";

// app/(portal)/teacher/classes/page.tsx — the teacher's classes (those where
// they teach a subject) with rosters.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FaChalkboardUser } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";
import { useMyTeacher } from "@/lib/teacher-session";

interface ClassSubject { id: string; subject: { id: string; name: string }; teacher: { user: { fullName: string } } | null }
interface SchoolClass {
    id: string;
    name: string;
    sections: { id: string; name: string }[];
    subjects: ClassSubject[];
    _count: { students: number };
}

export default function TeacherClassesPage() {
    const { teacherId } = useMyTeacher();
    const [classes, setClasses] = React.useState<SchoolClass[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        api<{ classes: SchoolClass[] }>("/classes")
            .then((p) => setClasses(p.classes))
            .catch(() => setClasses([]))
            .finally(() => setLoading(false));
    }, []);

    // Only show classes where this teacher teaches at least one subject.
    const myClasses = classes.filter((c) =>
        c.subjects.some((cs) => cs.teacher?.user && teacherId),
    );

    if (loading) {
        return <div className="space-y-6"><PageHeader title="My Classes" icon={FaChalkboardUser} /><Skeleton className="h-32" /></div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader title="My Classes" subtitle="Classes where you teach a subject" icon={FaChalkboardUser} />

            {myClasses.length === 0 ? (
                <EmptyState title="No classes assigned" description="Ask the admin to assign you to a class-subject." />
            ) : (
                myClasses.map((cls) => (
                    <motion.div key={cls.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-black uppercase tracking-tight">{cls.name}</CardTitle>
                                <Badge className="bg-primary/10 text-primary border-primary/20">{cls._count.students} students</Badge>
                            </CardHeader>
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Your subjects</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {cls.subjects.filter((cs) => cs.teacher).map((cs) => (
                                        <Badge key={cs.id} className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                            {cs.subject.name}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Sections</p>
                                <div className="flex flex-wrap gap-2">
                                    {cls.sections.map((s) => (
                                        <Link key={s.id} href={`/teacher/attendance?sectionId=${s.id}`}>
                                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">{s.name}</Badge>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))
            )}
        </div>
    );
}
