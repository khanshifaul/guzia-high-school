"use client";

// app/(portal)/admin/notices/page.tsx — post & manage notices (admin can
// target any audience or all).

import * as React from "react";
import { FaBullhorn, FaPlus, FaSpinner } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { NoticesList } from "@/components/shared/notices-list";
import { api, RequestError } from "@/lib/api";

export default function AdminNoticesPage() {
    const [open, setOpen] = React.useState(false);
    const [title, setTitle] = React.useState("");
    const [body, setBody] = React.useState("");
    const [audience, setAudience] = React.useState<string>("ALL");
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);
    const [refreshKey, setRefreshKey] = React.useState(0);

    async function create() {
        setBusy(true); setFeedback(null);
        try {
            await api("/notices", { method: "POST", body: { title, body, ...(audience !== "ALL" ? { audience } : {}) } });
            setFeedback({ kind: "ok", msg: "Notice posted" });
            setOpen(false); setTitle(""); setBody("");
            setRefreshKey((k) => k + 1);
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Post failed" });
        } finally { setBusy(false); }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Notices" subtitle="Post announcements to any audience" icon={FaBullhorn}
                actions={
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider"><FaPlus size={12} /> New Notice</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">New Notice</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
                                <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
                                <Select value={audience} onValueChange={setAudience}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Audience" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Everyone</SelectItem>
                                        <SelectItem value="STUDENT">Students</SelectItem>
                                        <SelectItem value="PARENT">Parents</SelectItem>
                                        <SelectItem value="TEACHER">Teachers</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={create} disabled={busy || !title || !body} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <><FaSpinner className="animate-spin" size={12} /> Posting…</> : "Post Notice"}
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

            <NoticesList key={refreshKey} />
        </div>
    );
}
