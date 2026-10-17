"use client";

// app/(portal)/admin/fees/page.tsx — fee heads, generate invoices, record a
// payment (waterfall preview), student ledger lookup.

import * as React from "react";
import { FaMoneyBillWave, FaPlus, FaSpinner, FaMagnifyingGlass } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { api, RequestError } from "@/lib/api";

interface FeeHead { id: string; name: string; amount: number; class: { name: string } | null; _count: { invoices: number } }
interface Student { id: string; fullName: string; admissionNo: string; class: { name: string } }
interface Ledger { invoices: { id: string; feeHead: string; amount: number; outstanding: number; dueDate: string; status: string }[]; totalDue: number }

export default function AdminFeesPage() {
    const [heads, setHeads] = React.useState<FeeHead[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [students, setStudents] = React.useState<Student[]>([]);
    const [studentId, setStudentId] = React.useState<string | null>(null);
    const [ledger, setLedger] = React.useState<Ledger | null>(null);
    const [search, setSearch] = React.useState("");

    // Create fee head.
    const [openHead, setOpenHead] = React.useState(false);
    const [headName, setHeadName] = React.useState("");
    const [headAmount, setHeadAmount] = React.useState("");
    // Record payment.
    const [openPay, setOpenPay] = React.useState(false);
    const [payAmount, setPayAmount] = React.useState("");
    const [payMethod, setPayMethod] = React.useState("CASH");
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const loadHeads = React.useCallback(() => {
        api<FeeHead[]>("/fees/heads")
            .then((p) => setHeads(p))
            .catch(() => setHeads([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => { loadHeads(); }, [loadHeads]);

    React.useEffect(() => {
        const t = setTimeout(() => {
            api<{ data: Student[] }>(`/students${search ? `?search=${encodeURIComponent(search)}` : ""}`)
                .then((p) => setStudents(p.data))
                .catch(() => setStudents([]));
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    React.useEffect(() => {
        if (!studentId) { setLedger(null); return; }
        api<Ledger>(`/fees/ledger/${studentId}`)
            .then((p) => setLedger(p))
            .catch(() => setLedger(null));
    }, [studentId]);

    async function createHead() {
        setBusy(true); setFeedback(null);
        try {
            await api("/fees/heads", { method: "POST", body: { name: headName, amount: Number(headAmount) } });
            setFeedback({ kind: "ok", msg: "Fee head created" });
            setOpenHead(false); setHeadName(""); setHeadAmount("");
            loadHeads();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Create failed" });
        } finally { setBusy(false); }
    }

    async function recordPayment() {
        if (!studentId) return;
        setBusy(true); setFeedback(null);
        try {
            const res = await api<{ allocations: { invoiceId: string; amount: number }[] }>("/fees/payments", {
                method: "POST",
                body: { studentId, amount: Number(payAmount), method: payMethod },
            });
            setFeedback({ kind: "ok", msg: `Payment recorded across ${res.allocations.length} invoice(s) (waterfall)` });
            setOpenPay(false); setPayAmount("");
            api<Ledger>(`/fees/ledger/${studentId}`).then((p) => setLedger(p));
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Payment failed" });
        } finally { setBusy(false); }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Fees" icon={FaMoneyBillWave} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Fees & Payments" subtitle="Fee heads, invoices, and the payment waterfall" icon={FaMoneyBillWave}
                actions={
                    <Dialog open={openHead} onOpenChange={setOpenHead}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider"><FaPlus size={12} /> New Fee Head</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">New Fee Head</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <Input placeholder="Name (e.g. Monthly Tuition)" value={headName} onChange={(e) => setHeadName(e.target.value)} className="h-11" />
                                <Input type="number" min={0} placeholder="Amount (৳)" value={headAmount} onChange={(e) => setHeadAmount(e.target.value)} className="h-11" />
                                <Button onClick={createHead} disabled={busy || !headName || !headAmount} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <FaSpinner className="animate-spin" size={12} /> : "Create"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                } />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4"><CardTitle className="text-xl font-black uppercase tracking-tight">Fee Heads</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {heads.length === 0 ? <EmptyState title="No fee heads" description="Create one to assign fees." /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Scope</TableHead><TableHead className="text-right">Invoices</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {heads.map((h) => (
                                    <TableRow key={h.id}>
                                        <TableCell className="font-semibold">{h.name}</TableCell>
                                        <TableCell className="text-right">৳{h.amount}</TableCell>
                                        <TableCell className="text-xs">{h.class ? h.class.name : "School-wide"}</TableCell>
                                        <TableCell className="text-right"><Badge variant="outline">{h._count.invoices}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Record Payment</CardTitle>
                    {studentId && ledger ? (
                        <Button onClick={() => setOpenPay(true)} className="font-black text-xs uppercase tracking-wider"><FaMoneyBillWave size={12} /> Record Payment</Button>
                    ) : null}
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="relative max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground"><FaMagnifyingGlass size={12} /></div>
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…" className="pl-9 h-11" />
                    </div>
                    {students.length > 0 && search ? (
                        <div className="border border-border/60 rounded-xl divide-y divide-border/60 max-h-48 overflow-y-auto">
                            {students.map((s) => (
                                <button key={s.id} onClick={() => { setStudentId(s.id); setSearch(""); }}
                                    className="w-full text-left px-4 py-2 hover:bg-muted cursor-pointer flex items-center justify-between">
                                    <span className="text-sm font-semibold">{s.fullName}</span>
                                    <span className="text-[10px] text-muted-foreground">{s.admissionNo} · {s.class.name}</span>
                                </button>
                            ))}
                        </div>
                    ) : null}

                    {ledger ? (
                        <>
                            <div className="grid grid-cols-2 gap-4 max-w-md">
                                <StatCard value={`৳${ledger.totalDue}`} label="Total Due" />
                                <StatCard value={ledger.invoices.filter((i) => i.status !== "PAID").length} label="Open Invoices" />
                            </div>
                            <Table>
                                <TableHeader><TableRow><TableHead>Fee</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {ledger.invoices.map((inv) => (
                                        <TableRow key={inv.id}>
                                            <TableCell className="font-semibold">{inv.feeHead}</TableCell>
                                            <TableCell className="text-right">৳{inv.amount}</TableCell>
                                            <TableCell className="text-right font-bold">৳{inv.outstanding}</TableCell>
                                            <TableCell><Badge className={inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : inv.status === "PARTIAL" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}>{inv.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </>
                    ) : studentId ? <Skeleton className="h-32" /> : (
                        <EmptyState title="Select a student" description="Search and pick a student to view their ledger." />
                    )}
                </CardContent>
            </Card>

            <Dialog open={openPay} onOpenChange={setOpenPay}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Record Payment</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">Outstanding: <span className="font-black text-primary">৳{ledger?.totalDue}</span>. Payment clears oldest invoices first.</p>
                        <Input type="number" min={1} placeholder="Amount (৳)" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="h-11" />
                        <Select value={payMethod} onValueChange={setPayMethod}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="BKASH_ROCKET">bKash/Rocket</SelectItem>
                                <SelectItem value="BANK">Bank</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={recordPayment} disabled={busy || !payAmount} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                            {busy ? <FaSpinner className="animate-spin" size={12} /> : "Record Payment"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
