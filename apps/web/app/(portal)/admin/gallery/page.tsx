"use client";

// app/(portal)/admin/gallery/page.tsx — manage campus gallery images: add
// (with upload), list, delete. Public display at /gallery.

import * as React from "react";
import { motion } from "motion/react";
import { FaImages, FaPlus, FaSpinner, FaTrash, FaUpload } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface GalleryItem { id: string; title: string; titleBn?: string; caption?: string; url: string; category?: string }

const CATEGORIES = ["campus", "events", "science-fair", "sports", "culture"];

export default function AdminGalleryPage() {
    const [items, setItems] = React.useState<GalleryItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [form, setForm] = React.useState({ title: "", titleBn: "", caption: "", category: "" });
    const [url, setUrl] = React.useState<string | null>(null);
    const [uploading, setUploading] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [busyId, setBusyId] = React.useState<string | null>(null);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const load = React.useCallback(() => {
        api<GalleryItem[]>("/gallery").then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
    }, []);
    React.useEffect(() => { load(); }, [load]);

    async function upload(file: File) {
        setUploading(true); setFeedback(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("folder", "gallery");
            const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message?.[0] ?? "Upload failed");
            setUrl(data.url);
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof Error ? err.message : "Upload failed" });
        } finally { setUploading(false); }
    }

    async function add() {
        setBusy(true); setFeedback(null);
        try {
            await api("/gallery", { method: "POST", body: { title: form.title, titleBn: form.titleBn || undefined, caption: form.caption || undefined, category: form.category || undefined, url } });
            setFeedback({ kind: "ok", msg: "Image added to gallery" });
            setForm({ title: "", titleBn: "", caption: "", category: "" });
            setUrl(null);
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Add failed" });
        } finally { setBusy(false); }
    }

    async function remove(id: string) {
        if (!confirm("Delete this image from the gallery?")) return;
        setBusyId(id); setFeedback(null);
        try {
            await api(`/gallery/${id}`, { method: "DELETE" });
            setFeedback({ kind: "ok", msg: "Image deleted" });
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Delete failed" });
        } finally { setBusyId(null); }
    }

    const valid = form.title.trim().length >= 1 && !!url;

    return (
        <div className="space-y-6">
            <PageHeader title="Campus Gallery" subtitle={`${items.length} images`} icon={FaImages} />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {/* Add form */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4"><CardTitle className="text-lg font-black uppercase tracking-tight">Add Image</CardTitle></CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Title *</Label>
                        <Input className="h-11" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Science Fair 2026" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Title (Bangla)</Label>
                        <Input className="h-11" value={form.titleBn} onChange={(e) => setForm({ ...form, titleBn: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Caption</Label>
                        <Input className="h-11" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Category</Label>
                        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="flex h-11 w-full items-center rounded-md border border-input bg-transparent px-3 text-sm cursor-pointer">
                            <option value="">None</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-4">
                        <label className="flex items-center justify-center gap-2 h-24 w-40 rounded-lg border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer">
                            {uploading ? <FaSpinner className="animate-spin text-primary" size={16} /> : <FaUpload className="text-muted-foreground" size={16} />}
                            <span className="text-[10px] text-muted-foreground font-semibold">Upload image</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
                        </label>
                        {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt="preview" className="h-24 w-40 object-cover rounded-lg border border-border" />
                        ) : null}
                        <Button onClick={add} disabled={busy || !valid} className="font-black text-xs uppercase tracking-wider">
                            {busy ? <><FaSpinner className="animate-spin" size={12} /> Adding…</> : <><FaPlus size={12} /> Add to Gallery</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Grid */}
            {loading ? (
                <Skeleton className="h-64" />
            ) : items.length === 0 ? (
                <EmptyState title="No images yet" description="Add your first gallery image above." />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((it, i) => (
                        <motion.div key={it.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                            <Card className="border-border/60 overflow-hidden h-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={it.url} alt={it.title} className="w-full h-40 object-cover" />
                                <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold truncate">{it.title}</p>
                                            {it.category ? <Badge variant="outline" className="text-[9px] mt-1">{it.category}</Badge> : null}
                                        </div>
                                        <button onClick={() => remove(it.id)} disabled={busyId === it.id}
                                            className="text-destructive hover:text-destructive/80 cursor-pointer shrink-0" aria-label="Delete">
                                            {busyId === it.id ? <FaSpinner className="animate-spin" size={12} /> : <FaTrash size={12} />}
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
