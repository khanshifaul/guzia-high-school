"use client";

// app/(portal)/student/fees/page.tsx — fee ledger: outstanding invoices +
// payment history + total due (waterfall-sourced from the API).

import * as React from "react";
import { FaMoneyBillWave } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { api } from "@/lib/api";
import { useMyStudent } from "@/lib/student-session";

interface Invoice {
    id: string; feeHead: string; amount: number; dueDate: string;
    status: string; outstanding: number; overdueDays: number;
}
interface Payment { id: string; amount: number; method: string; paidAt: string }
interface LedgerResp { invoices: Invoice[]; payments: Payment[]; totalDue: number }

const STATUS_STYLE: Record<string, string> = {
    PAID: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    PARTIAL: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    PENDING: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export default function StudentFeesPage() {
    const { studentId, loading: loadingMe } = useMyStudent();
    const [data, setData] = React.useState<LedgerResp | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!studentId) return;
        api<LedgerResp>(`/fees/ledger/${studentId}`)
            .then((p) => setData(p))
            .catch(() => setData({ invoices: [], payments: [], totalDue: 0 }))
            .finally(() => setLoading(false));
    }, [studentId]);

    if (loadingMe || loading) {
        return <div className="space-y-6"><PageHeader title="Fees" icon={FaMoneyBillWave} /><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;
    }
    if (!studentId) return <EmptyState title="No student profile" description="Your account is not linked to a student record." />;

    return (
        <div className="space-y-6">
            <PageHeader title="Fees" subtitle="Your ledger and payment history" icon={FaMoneyBillWave} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard value={`৳${data?.totalDue ?? 0}`} label="Total Due" />
                <StatCard value={data?.payments.length ?? 0} label="Payments Made" />
            </div>

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Invoices</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {!data || data.invoices.length === 0 ? (
                        <EmptyState title="No invoices" description="No fees have been assigned to you." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fee</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Due</TableHead>
                                    <TableHead className="text-right">Outstanding</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.invoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-semibold">{inv.feeHead}</TableCell>
                                        <TableCell className="text-right">৳{inv.amount}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(inv.dueDate).toLocaleDateString()}
                                            {inv.overdueDays > 0 && inv.status !== "PAID" ? (
                                                <Badge className="ml-2 bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px]">
                                                    {inv.overdueDays}d overdue
                                                </Badge>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">৳{inv.outstanding}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={STATUS_STYLE[inv.status] ?? ""}>{inv.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Payment History</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {!data || data.payments.length === 0 ? (
                        <EmptyState title="No payments" description="Payments recorded by the school will appear here." />
                    ) : (
                        <div className="space-y-3">
                            {data.payments.map((p) => (
                                <div key={p.id} className="flex items-center justify-between bg-card border border-border/60 rounded-xl p-4">
                                    <div>
                                        <p className="text-sm font-bold">৳{p.amount}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.method.replace("_", " ")}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{new Date(p.paidAt).toLocaleDateString()}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
