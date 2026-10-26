"use client";

// app/(portal)/admin/pages/[slug]/page.tsx — edit one public page.
//
// The block editor is GENERATED from the field specs in lib/page-blocks.ts:
// a bilingual field is two inputs side by side (English / বাংলা), a structural
// field (icon, href, number, colour) is one input that both languages read.
// Saving rewrites the Bengali document from the English one, so the two always
// carry the same rows in the same order — the public renderer joins them by
// position and a short Bengali list would silently shift translations.

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    FaArrowDown,
    FaArrowLeft,
    FaArrowUp,
    FaFileLines,
    FaPlus,
    FaSpinner,
    FaTrash,
    FaUpload,
} from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";
import { ICON_NAMES } from "@/lib/icon-registry";
import {
    BLOCK_KIND_OPTIONS,
    emptyBody,
    kindSpec,
    parseBody,
    type BlockBody,
    type BlockItem,
    type BlockKind,
    type FieldSpec,
    type PageBlock,
} from "@/lib/page-blocks";

interface PageDetail {
    slug: string;
    title: string;
    titleBn: string;
    published: boolean;
    blocks: PageBlock[];
}

interface Draft {
    en: BlockBody;
    bn: BlockBody;
    imageUrl: string;
    linkUrl: string;
}

/**
 * The Bengali document to store: the English structure, with only the Bengali
 * text fields filled in. An empty Bengali value is omitted, so the public page
 * falls back to English instead of rendering a blank line.
 */
function bengaliDocument(kind: string, draft: Draft): BlockBody {
    const spec = kindSpec(kind);
    if (!spec) return draft.bn;

    const out: BlockBody = {};
    for (const field of spec.fields) {
        if (!field.bilingual) continue;
        const value = draft.bn[field.key];
        if (typeof value === "string" && value.trim()) out[field.key] = value;
    }

    if (spec.itemFields.length > 0) {
        const bnRows = draft.bn.items ?? [];
        out.items = (draft.en.items ?? []).map((_, index) => {
            const source = bnRows[index] ?? {};
            const row: BlockItem = {};
            for (const field of spec.itemFields) {
                if (!field.bilingual) continue;
                const value = source[field.key];
                if (field.type === "list") {
                    if (Array.isArray(value) && value.length > 0) row[field.key] = value;
                } else if (typeof value === "string" && value.trim()) {
                    row[field.key] = value;
                }
            }
            return row;
        });
    }

    return out;
}

/** One input control for a field, chosen by its declared type. */
function FieldInput({
    spec,
    value,
    onChange,
}: {
    spec: FieldSpec;
    value: unknown;
    onChange: (value: unknown) => void;
}) {
    if (spec.type === "icon") {
        const current = typeof value === "string" ? value : "";
        return (
            <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={current}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">—</option>
                {ICON_NAMES.map((name) => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>
        );
    }

    if (spec.type === "select") {
        const current = typeof value === "string" ? value : "";
        return (
            <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={current}
                onChange={(e) => onChange(e.target.value)}
            >
                {(spec.options ?? []).map((option) => (
                    <option key={option} value={option}>{option || "none"}</option>
                ))}
            </select>
        );
    }

    if (spec.type === "textarea") {
        return (
            <Textarea
                className="min-h-[72px]"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(e.target.value)}
            />
        );
    }

    if (spec.type === "list") {
        const text = Array.isArray(value) ? value.filter((v) => typeof v === "string").join(", ") : "";
        return (
            <Input
                value={text}
                placeholder={spec.placeholder}
                onChange={(e) =>
                    onChange(
                        e.target.value
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean),
                    )
                }
            />
        );
    }

    if (spec.type === "number") {
        return (
            <Input
                type="number"
                value={typeof value === "number" || typeof value === "string" ? String(value) : ""}
                onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            />
        );
    }

    return (
        <Input
            value={typeof value === "string" ? value : ""}
            placeholder={spec.placeholder}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}

export default function AdminPageEditor() {
    const params = useParams<{ slug: string }>();
    const slug = params.slug;

    const [page, setPage] = React.useState<PageDetail | null>(null);
    const [meta, setMeta] = React.useState({ title: "", titleBn: "" });
    const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
    const [loading, setLoading] = React.useState(true);
    const [savingId, setSavingId] = React.useState<string | null>(null);
    const [uploadingId, setUploadingId] = React.useState<string | null>(null);
    const [savingMeta, setSavingMeta] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const [newKey, setNewKey] = React.useState("");
    const [newKind, setNewKind] = React.useState<BlockKind>(BLOCK_KIND_OPTIONS[0].kind);

    const load = React.useCallback(() => {
        setLoading(true);
        api<PageDetail>(`/admin/pages/${slug}`)
            .then((detail) => {
                setPage(detail);
                setMeta({ title: detail.title, titleBn: detail.titleBn });
                const next: Record<string, Draft> = {};
                for (const block of detail.blocks) {
                    next[block.id] = {
                        en: parseBody(block.bodyEn),
                        bn: parseBody(block.bodyBn),
                        imageUrl: block.imageUrl,
                        linkUrl: block.linkUrl,
                    };
                }
                setDrafts(next);
            })
            .catch((err: unknown) => {
                setFeedback({
                    kind: "err",
                    msg: err instanceof RequestError ? err.messages.join("; ") : "Failed to load page",
                });
                setPage(null);
            })
            .finally(() => setLoading(false));
    }, [slug]);

    React.useEffect(() => {
        load();
    }, [load]);

    const fail = (err: unknown, fallback: string) => {
        setFeedback({
            kind: "err",
            msg: err instanceof RequestError ? err.messages.join("; ") : fallback,
        });
    };

    function patchDraft(id: string, update: (draft: Draft) => Draft) {
        setDrafts((prev) => {
            const current = prev[id];
            if (!current) return prev;
            return { ...prev, [id]: update(current) };
        });
    }

    function setTopField(id: string, lang: "en" | "bn", key: string, value: unknown) {
        patchDraft(id, (draft) => ({
            ...draft,
            [lang]: { ...draft[lang], [key]: value },
        }));
    }

    function setItemField(id: string, lang: "en" | "bn", index: number, key: string, value: unknown) {
        patchDraft(id, (draft) => {
            const doc = draft[lang];
            const items = [...(doc.items ?? [])];
            while (items.length <= index) items.push({});
            items[index] = { ...items[index], [key]: value };
            return { ...draft, [lang]: { ...doc, items } };
        });
    }

    function addRow(id: string) {
        patchDraft(id, (draft) => ({
            ...draft,
            en: { ...draft.en, items: [...(draft.en.items ?? []), {}] },
            bn: { ...draft.bn, items: [...(draft.bn.items ?? []), {}] },
        }));
    }

    function removeRow(id: string, index: number) {
        patchDraft(id, (draft) => {
            const en = [...(draft.en.items ?? [])];
            const bn = [...(draft.bn.items ?? [])];
            en.splice(index, 1);
            bn.splice(index, 1);
            return { ...draft, en: { ...draft.en, items: en }, bn: { ...draft.bn, items: bn } };
        });
    }

    function moveRow(id: string, index: number, delta: -1 | 1) {
        patchDraft(id, (draft) => {
            const en = [...(draft.en.items ?? [])];
            const bn = [...(draft.bn.items ?? [])];
            const target = index + delta;
            if (target < 0 || target >= en.length) return draft;
            [en[index], en[target]] = [en[target], en[index]];
            [bn[index], bn[target]] = [bn[target], bn[index]];
            return { ...draft, en: { ...draft.en, items: en }, bn: { ...draft.bn, items: bn } };
        });
    }

    async function saveMeta() {
        setSavingMeta(true);
        setFeedback(null);
        try {
            await api(`/admin/pages/${slug}`, { method: "PATCH", body: meta });
            setFeedback({ kind: "ok", msg: "Page saved" });
            load();
        } catch (err) {
            fail(err, "Save failed");
        } finally {
            setSavingMeta(false);
        }
    }

    async function togglePagePublished(published: boolean) {
        setPage((prev) => (prev ? { ...prev, published } : prev));
        try {
            await api(`/admin/pages/${slug}`, { method: "PATCH", body: { published } });
        } catch (err) {
            setPage((prev) => (prev ? { ...prev, published: !published } : prev));
            fail(err, "Could not change the page's publish state");
        }
    }

    async function toggleBlockPublished(block: PageBlock, published: boolean) {
        try {
            await api(`/admin/pages/${slug}/blocks/${block.id}`, {
                method: "PATCH",
                body: { published },
            });
            load();
        } catch (err) {
            fail(err, "Could not change the block's publish state");
        }
    }

    async function saveBlock(block: PageBlock) {
        const draft = drafts[block.id];
        if (!draft) return;
        setSavingId(block.id);
        setFeedback(null);
        try {
            await api(`/admin/pages/${slug}/blocks/${block.id}`, {
                method: "PATCH",
                body: {
                    bodyEn: JSON.stringify(draft.en),
                    bodyBn: JSON.stringify(bengaliDocument(block.kind, draft)),
                    imageUrl: draft.imageUrl,
                    linkUrl: draft.linkUrl,
                    published: block.published,
                },
            });
            setFeedback({ kind: "ok", msg: `Saved “${block.key}”` });
            load();
        } catch (err) {
            fail(err, "Save failed");
        } finally {
            setSavingId(null);
        }
    }

    async function reorder(blocks: PageBlock[], from: number, to: number) {
        const order = blocks.map((block) => block.id);
        const moved = order.splice(from, 1);
        order.splice(to, 0, ...moved);
        try {
            await api(`/admin/pages/${slug}/blocks/reorder`, { method: "POST", body: { order } });
            load();
        } catch (err) {
            fail(err, "Reorder failed");
        }
    }

    async function removeBlock(block: PageBlock) {
        if (!confirm(`Delete the “${block.key}” block? The public section disappears.`)) return;
        try {
            await api(`/admin/pages/${slug}/blocks/${block.id}`, { method: "DELETE" });
            setFeedback({ kind: "ok", msg: `Deleted “${block.key}”` });
            load();
        } catch (err) {
            fail(err, "Delete failed");
        }
    }

    async function addBlock() {
        setFeedback(null);
        try {
            await api(`/admin/pages/${slug}/blocks`, {
                method: "POST",
                body: {
                    key: newKey.trim(),
                    kind: newKind,
                    bodyEn: JSON.stringify(emptyBody(newKind)),
                    bodyBn: JSON.stringify(emptyBody(newKind)),
                },
            });
            setNewKey("");
            load();
        } catch (err) {
            fail(err, "Could not add the block");
        }
    }

    async function uploadImage(block: PageBlock, file: File) {
        setUploadingId(block.id);
        setFeedback(null);
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("folder", "pages");
            const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
            const payload: unknown = await res.json();
            const url =
                payload !== null && typeof payload === "object" && "url" in payload && typeof payload.url === "string"
                    ? payload.url
                    : "";
            if (!res.ok || !url) throw new Error("Upload failed");
            await api(`/admin/pages/${slug}/blocks/${block.id}`, {
                method: "PATCH",
                body: { imageUrl: url },
            });
            setDrafts((prev) => {
                const current = prev[block.id];
                return current ? { ...prev, [block.id]: { ...current, imageUrl: url } } : prev;
            });
            setFeedback({ kind: "ok", msg: "Image uploaded and applied" });
        } catch (err) {
            fail(err, "Upload failed");
        } finally {
            setUploadingId(null);
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Page" icon={FaFileLines} />
                <Skeleton className="h-24" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="space-y-6">
                <PageHeader title="Page" icon={FaFileLines} />
                <EmptyState
                    title="Page not found"
                    description={feedback?.msg ?? "This page does not exist."}
                    action={
                        <Link href="/admin/pages">
                            <Button variant="outline" size="sm">Back to pages</Button>
                        </Link>
                    }
                />
            </div>
        );
    }

    const blocks = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder);

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${page.title} · ${page.slug}`}
                subtitle={`${blocks.length} blocks`}
                icon={FaFileLines}
                actions={
                    <Link href="/admin/pages">
                        <Button variant="outline" size="sm" className="gap-2 font-black text-xs uppercase tracking-wider">
                            <FaArrowLeft size={12} /> All pages
                        </Button>
                    </Link>
                }
            />

            {feedback ? (
                <div
                    className={`p-3 text-xs font-bold text-center rounded-xl border ${
                        feedback.kind === "ok"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                >
                    {feedback.msg}
                </div>
            ) : null}

            {/* Page itself */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Page</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Title (English)</Label>
                            <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Title (বাংলা)</Label>
                            <Input value={meta.titleBn} onChange={(e) => setMeta({ ...meta, titleBn: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-3">
                            <Switch checked={page.published} onCheckedChange={togglePagePublished} />
                            <span className="text-xs font-semibold text-muted-foreground">
                                {page.published ? "Published — the public page renders" : "Unpublished — the public page is hidden"}
                            </span>
                        </div>
                        <Button onClick={saveMeta} disabled={savingMeta} size="sm" className="font-black text-xs uppercase tracking-wider">
                            {savingMeta ? <><FaSpinner className="animate-spin" size={12} /> Saving…</> : "Save page"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Blocks */}
            {blocks.length === 0 ? (
                <EmptyState title="No blocks" description="Add the first section below." />
            ) : (
                blocks.map((block, index) => {
                    const draft = drafts[block.id];
                    const spec = kindSpec(block.kind);
                    const open = expanded[block.id] ?? false;
                    return (
                        <Card key={block.id} className="border-border/60 shadow-sm">
                            <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <CardTitle className="text-sm font-black truncate">{block.key}</CardTitle>
                                    <Badge variant="outline" className="text-[9px] uppercase">{block.kind}</Badge>
                                    <Switch checked={block.published} onCheckedChange={(v) => toggleBlockPublished(block, v)} />
                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                        {block.published ? "published" : "hidden"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => reorder(blocks, index, index - 1)} aria-label="Move up">
                                        <FaArrowUp size={12} />
                                    </Button>
                                    <Button size="sm" variant="ghost" disabled={index === blocks.length - 1} onClick={() => reorder(blocks, index, index + 1)} aria-label="Move down">
                                        <FaArrowDown size={12} />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => removeBlock(block)} aria-label="Delete block">
                                        <FaTrash size={12} />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setExpanded((prev) => ({ ...prev, [block.id]: !open }))}>
                                        {open ? "Collapse" : "Edit"}
                                    </Button>
                                </div>
                            </CardHeader>
                            {open && draft && spec ? (
                                <CardContent className="p-6 space-y-5">
                                    {/* Top-level fields */}
                                    {spec.fields.map((field) => (
                                        <div key={field.key} className="space-y-1.5">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                                {field.label}{field.bilingual ? "" : " (shared by both languages)"}
                                            </Label>
                                            {field.bilingual ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] text-muted-foreground">English</span>
                                                        <FieldInput spec={field} value={draft.en[field.key]} onChange={(v) => setTopField(block.id, "en", field.key, v)} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] text-muted-foreground">বাংলা</span>
                                                        <FieldInput spec={field} value={draft.bn[field.key]} onChange={(v) => setTopField(block.id, "bn", field.key, v)} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <FieldInput spec={field} value={draft.en[field.key]} onChange={(v) => setTopField(block.id, "en", field.key, v)} />
                                            )}
                                        </div>
                                    ))}

                                    {/* Rows */}
                                    {spec.itemFields.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                                    {spec.itemNoun ?? "row"}s
                                                </span>
                                                <Button size="sm" variant="outline" onClick={() => addRow(block.id)} className="gap-1">
                                                    <FaPlus size={10} /> Add {spec.itemNoun ?? "row"}
                                                </Button>
                                            </div>
                                            {(draft.en.items ?? []).map((item, rowIndex) => (
                                                <Card key={rowIndex} className="border-border/40">
                                                    <CardContent className="p-4 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                                                {spec.itemNoun ?? "row"} {rowIndex + 1}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <Button size="sm" variant="ghost" disabled={rowIndex === 0} onClick={() => moveRow(block.id, rowIndex, -1)} aria-label="Move row up">
                                                                    <FaArrowUp size={10} />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    disabled={rowIndex === (draft.en.items ?? []).length - 1}
                                                                    onClick={() => moveRow(block.id, rowIndex, 1)}
                                                                    aria-label="Move row down"
                                                                >
                                                                    <FaArrowDown size={10} />
                                                                </Button>
                                                                <Button size="sm" variant="ghost" onClick={() => removeRow(block.id, rowIndex)} aria-label="Remove row">
                                                                    <FaTrash size={10} />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        {spec.itemFields.map((field) => (
                                                            <div key={field.key} className="space-y-1.5">
                                                                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                                                    {field.label}{field.bilingual ? "" : " (shared)"}
                                                                </Label>
                                                                {field.bilingual ? (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] text-muted-foreground">English</span>
                                                                            <FieldInput
                                                                                spec={field}
                                                                                value={item[field.key]}
                                                                                onChange={(v) => setItemField(block.id, "en", rowIndex, field.key, v)}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] text-muted-foreground">বাংলা</span>
                                                                            <FieldInput
                                                                                spec={field}
                                                                                value={(draft.bn.items ?? [])[rowIndex]?.[field.key]}
                                                                                onChange={(v) => setItemField(block.id, "bn", rowIndex, field.key, v)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <FieldInput
                                                                        spec={field}
                                                                        value={item[field.key]}
                                                                        onChange={(v) => setItemField(block.id, "en", rowIndex, field.key, v)}
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : null}

                                    {/* Block image + link */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Block image URL</Label>
                                            <Input value={draft.imageUrl} onChange={(e) => patchDraft(block.id, (d) => ({ ...d, imageUrl: e.target.value }))} />
                                            <div className="flex items-center gap-3 pt-1">
                                                <label className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground cursor-pointer hover:border-primary/40">
                                                    {uploadingId === block.id ? <FaSpinner className="animate-spin" size={12} /> : <FaUpload size={12} />}
                                                    Upload image
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) uploadImage(block, file);
                                                        }}
                                                    />
                                                </label>
                                                {draft.imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={draft.imageUrl} alt="" className="h-12 w-16 rounded border border-border object-cover" />
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Block link URL</Label>
                                            <Input value={draft.linkUrl} onChange={(e) => patchDraft(block.id, (d) => ({ ...d, linkUrl: e.target.value }))} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end pt-1">
                                        <Button onClick={() => saveBlock(block)} disabled={savingId === block.id} className="font-black text-xs uppercase tracking-wider">
                                            {savingId === block.id ? <><FaSpinner className="animate-spin" size={12} /> Saving…</> : "Save block"}
                                        </Button>
                                    </div>
                                </CardContent>
                            ) : null}
                        </Card>
                    );
                })
            )}

            {/* Add block */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Add block</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <div className="space-y-1.5 flex-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Key</Label>
                        <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="lowercase, digits, dashes" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Kind</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                            value={newKind}
                            onChange={(e) => setNewKind(e.target.value as BlockKind)}
                        >
                            {BLOCK_KIND_OPTIONS.map((option) => (
                                <option key={option.kind} value={option.kind}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <Button onClick={addBlock} disabled={!newKey.trim()} className="font-black text-xs uppercase tracking-wider gap-1">
                        <FaPlus size={12} /> Add block
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
