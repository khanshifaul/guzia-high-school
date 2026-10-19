"use client";

// app/(portal)/parent/fees/page.tsx — the selected child's fee ledger.

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
import { ChildSelector, useMyChildren } from "../_components/child-selector";

interface Invoice { id: string; feeHead: string; amount: number; dueDate: string; status: string; outstanding: number; overdueDays: number }
interface LedgerResp { invoices: Invoice[]; payments: { id: string; amount: number; paidAt: string }[]; totalDue: number }

const STATUS_STYLE: Record<string, string> = {
    PAID: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    PARTIAL: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    PENDING: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export default function ParentFeesPage() {
    const { children, loading, selected, setSelected } = useMyChildren();
    const [data, setData] = React.useState<LedgerResp | null>(null);
    const [loadingData, setLoadingData] = React.useState(false);

    React.useEffect(() => {
        if (!selected) return;
        setLoadingData(true);
        api<LedgerResp>(`/fees/ledger/${selected}`)
            .then((p) => setData(p))
            .catch(() => setData({ invoices: [], payments: [], totalDue: 0 }))
            .finally(() => setLoadingData(false));
    }, [selected]);

    return (
        <div className="space-y-6">
            <PageHeader title="Fees" subtitle="Your child's fee ledger" icon={FaMoneyBillWave} />
            <ChildSelector children={children} loading={loading} selected={selected} onChange={setSelected} />

            {loading || loadingData ? (
                <Skeleton className="h-64" />
            ) : !selected ? (
                <EmptyState title="Select a child" description="Choose a child above to view fees." />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <StatCard value={`৳${data?.totalDue ?? 0}`} label="Total Due" />
                        <StatCard value={data?.payments.length ?? 0} label="Payments" />
                    </div>
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/60 pb-4">
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Invoices</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!data || data.invoices.length === 0 ? (
                                <EmptyState title="No invoices" description="No fees assigned." />
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
                                                        <Badge className="ml-2 bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px]">{inv.overdueDays}d</Badge>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">৳{inv.outstanding}</TableCell>
                                                <TableCell className="text-center"><Badge className={STATUS_STYLE[inv.status] ?? ""}>{inv.status}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
