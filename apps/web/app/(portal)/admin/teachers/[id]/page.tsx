"use client";

// app/(portal)/admin/teachers/[id]/page.tsx — teacher view page: full profile,
// subjects taught, and assignments.

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FaArrowLeft, FaChalkboardUser, FaEnvelope, FaPhone, FaIdCard, FaDroplet, FaGraduationCap, FaBuilding } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";

interface TeacherDetail {
    id: string; employeeId: string;
    photoUrl?: string | null; phone?: string | null; emergencyPhone?: string | null;
    nid?: string | null; bloodGroup?: string | null; religion?: string | null;
    qualification?: string | null; designation?: string | null; department?: string | null;
    address?: string | null; joinDate?: string | null;
    user: { email: string; fullName: string; status: string };
    subjects: { subject: { name: string }; class: { name: string } }[];
    assignments: { subject: { name: string }; class: { name: string } }[];
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value?: string | null }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
            <Icon size={13} className="text-primary mt-0.5 shrink-0" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider w-40 shrink-0">{label}</span>
            <span className="text-sm text-foreground">{value || <span className="text-muted-foreground">—</span>}</span>
        </div>
    );
}

export default function AdminTeacherDetailPage() {
    const params = useParams<{ id: string }>();
    const [t, setT] = React.useState<TeacherDetail | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        api<TeacherDetail>(`/teachers/${params.id}`)
            .then(setT)
            .catch(() => setError("Failed to load teacher"))
            .finally(() => setLoading(false));
    }, [params.id]);

    if (loading) return <div className="space-y-6"><PageHeader title="Teacher" icon={FaChalkboardUser} /><Skeleton className="h-64" /></div>;
    if (error || !t) return <EmptyState title="Not found" description={error ?? "Teacher not found"} />;

    const d = t.joinDate ? new Date(t.joinDate).toLocaleDateString("en-GB") : null;

    return (
        <div className="space-y-6">
            <PageHeader title={t.user.fullName} subtitle={`${t.employeeId}${t.designation ? ` · ${t.designation}` : ""}`}
                icon={FaChalkboardUser}
                actions={
                    <Link href="/admin/teachers">
                        <button className="inline-flex items-center gap-2 font-black text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer">
                            <FaArrowLeft size={12} /> Back
                        </button>
                    </Link>
                } />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile */}
                <Card className="border-border/60 shadow-sm lg:col-span-1">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center mb-5">
                            {t.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={t.photoUrl} alt={t.user.fullName} className="size-24 rounded-full object-cover border-2 border-primary/20 mb-3" />
                            ) : (
                                <div className="size-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-3xl mb-3">
                                    {t.user.fullName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <p className="font-black text-lg">{t.user.fullName}</p>
                            <Badge className={t.user.status === "BLOCKED" ? "bg-rose-500/10 text-rose-600 border-rose-500/20 mt-1" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 mt-1"}>
                                {t.user.status}
                            </Badge>
                        </div>
                        <Row icon={FaEnvelope} label="Email" value={t.user.email} />
                        <Row icon={FaPhone} label="Phone" value={t.phone} />
                        <Row icon={FaPhone} label="Emergency" value={t.emergencyPhone} />
                        <Row icon={FaIdCard} label="NID" value={t.nid} />
                        <Row icon={FaDroplet} label="Blood Group" value={t.bloodGroup} />
                    </CardContent>
                </Card>

                {/* Details */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/60 pb-4"><CardTitle className="text-lg font-black uppercase tracking-tight">Profile Details</CardTitle></CardHeader>
                        <CardContent className="p-6">
                            <Row icon={FaGraduationCap} label="Qualification" value={t.qualification} />
                            <Row icon={FaBuilding} label="Department" value={t.department} />
                            <Row icon={FaChalkboardUser} label="Designation" value={t.designation} />
                            <Row icon={FaIdCard} label="Religion" value={t.religion} />
                            <Row icon={FaBuilding} label="Join Date" value={d} />
                            <Row icon={FaBuilding} label="Address" value={t.address} />
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Subjects Taught</CardTitle>
                            <Badge variant="outline" className="text-[10px]">{t.subjects.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-6">
                            {t.subjects.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No subjects assigned yet.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {t.subjects.map((s, i) => (
                                        <Badge key={i} className="bg-primary/10 text-primary border-primary/20">{s.subject.name} · {s.class.name}</Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Assignments</CardTitle>
                            <Badge variant="outline" className="text-[10px]">{t.assignments.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-6">
                            {t.assignments.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No assignments yet.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {t.assignments.map((a, i) => (
                                        <Badge key={i} className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{a.subject.name} · {a.class.name}</Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
