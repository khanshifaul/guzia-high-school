"use client";

// components/admin/site-settings-panel.tsx — admin editor for the public site
// info shown in the header/footer (name, contact, EIIN, board, socials,
// important links). Backed by the /site-settings API.

import * as React from "react";
import { FaGlobe, FaSpinner, FaPlus, FaTrash } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api, RequestError } from "@/lib/api";

/** Bangladeshi education boards ( selectable in the admin portal ). */
export const BD_BOARDS = [
    "Dhaka Board",
    "Rajshahi Board",
    "Cumilla Board",
    "Jashore Board",
    "Chattogram Board",
    "Barishal Board",
    "Sylhet Board",
    "Dinajpur Board",
    "Mymensingh Board",
    "Madrasah Board",
];

interface ImportantLink { label: string; labelBn?: string; href: string }
interface SiteSettings {
    schoolName: string; schoolNameBn: string; phone: string; hotline: string;
    email: string; eiin: string; board: string; address: string; addressBn: string;
    established: string; tagline: string; taglineBn: string;
    facebookUrl: string; twitterUrl: string;
    instagramUrl: string; youtubeUrl: string; linkedinUrl: string; websiteUrl: string;
    mapEmbedUrl: string;
    admissionTypes: string;
    shifts: string;
    importantLinks: ImportantLink[];
}

const FIELDS: { key: keyof Omit<SiteSettings, "importantLinks">; label: string; col?: 2 }[] = [
    { key: "schoolName", label: "School name (EN)" },
    { key: "schoolNameBn", label: "School name (BN)" },
    { key: "eiin", label: "EIIN" },
    { key: "phone", label: "Phone" },
    { key: "hotline", label: "Hotline" },
    { key: "email", label: "Email" },
    { key: "established", label: "Established" },
    { key: "address", label: "Address (EN)" },
    { key: "addressBn", label: "Address (BN)" },
    { key: "tagline", label: "Tagline (EN)" },
    { key: "taglineBn", label: "Tagline (BN)" },
    { key: "facebookUrl", label: "Facebook URL" },
    { key: "twitterUrl", label: "Twitter URL" },
    { key: "instagramUrl", label: "Instagram URL" },
    { key: "youtubeUrl", label: "YouTube URL" },
    { key: "linkedinUrl", label: "LinkedIn URL" },
    { key: "websiteUrl", label: "Website URL" },
    { key: "mapEmbedUrl", label: "Google Maps embed URL" },
    { key: "admissionTypes", label: "Admission types offered (day,residential)" },
    { key: "shifts", label: "Shifts (comma separated, max 2 · blank = none)" },
];

export function SiteSettingsPanel() {
    const [settings, setSettings] = React.useState<SiteSettings | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    React.useEffect(() => {
        api<SiteSettings>("/site-settings")
            .then(setSettings)
            .catch(() => setSettings(null))
            .finally(() => setLoading(false));
    }, []);

    const set = (k: keyof Omit<SiteSettings, "importantLinks">, v: string) =>
        setSettings((s) => (s ? { ...s, [k]: v } : s));

    const setLink = (i: number, patch: Partial<ImportantLink>) =>
        setSettings((s) =>
            s ? { ...s, importantLinks: s.importantLinks.map((l, li) => (li === i ? { ...l, ...patch } : l)) } : s,
        );

    async function save() {
        if (!settings) return;
        setBusy(true); setFeedback(null);
        try {
            // Send only editable settings: the GET response also carries `id`
            // and `updatedAt`, which the API refuses as unknown fields.
            const body = {
                ...FIELDS.reduce<Record<string, string>>((acc, f) => {
                    acc[f.key] = String(settings[f.key] ?? "");
                    return acc;
                }, {}),
                board: settings.board,
                importantLinks: settings.importantLinks,
            };
            await api("/site-settings", { method: "PUT", body });
            setFeedback({ kind: "ok", msg: "Site settings saved — header & footer update immediately." });
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Save failed" });
        } finally { setBusy(false); }
    }

    if (loading) return <Skeleton className="h-64" />;
    if (!settings) return null;

    return (
        <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <FaGlobe className="text-primary" size={16} /> Site Settings
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                    Contact, EIIN, board, socials, and footer links shown on the public site.
                </p>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
                {feedback ? (
                    <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                        {feedback.msg}
                    </div>
                ) : null}

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Education board</label>
                    <Select value={settings.board} onValueChange={(v) => set("board", v)} searchable>
                        <SelectTrigger className="h-11 text-xs font-semibold"><SelectValue placeholder="Select board" /></SelectTrigger>
                        <SelectContent>
                            {BD_BOARDS.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FIELDS.map((f) => (
                        <div key={f.key} className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{f.label}</label>
                            <Input className="h-11" value={String(settings[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-border/60">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Important Links (footer)</p>
                        <Button size="sm" variant="outline" className="font-black text-[10px] uppercase tracking-wider"
                            onClick={() => setSettings((s) => s ? { ...s, importantLinks: [...s.importantLinks, { label: "", labelBn: "", href: "" }] } : s)}>
                            <FaPlus size={10} /> Add
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {settings.importantLinks.map((l, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                <Input className="h-9 col-span-4 text-xs" placeholder="Label (EN)" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
                                <Input className="h-9 col-span-4 text-xs" placeholder="Label (BN)" value={l.labelBn ?? ""} onChange={(e) => setLink(i, { labelBn: e.target.value })} />
                                <Input className="h-9 col-span-3 text-xs" placeholder="https://…" value={l.href} onChange={(e) => setLink(i, { href: e.target.value })} />
                                <button className="col-span-1 text-destructive hover:text-destructive/80 cursor-pointer flex justify-center"
                                    onClick={() => setSettings((s) => s ? { ...s, importantLinks: s.importantLinks.filter((_, li) => li !== i) } : s)}>
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <Button onClick={save} disabled={busy} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                    {busy ? <><FaSpinner className="animate-spin" size={12} /> Saving…</> : "Save Site Settings"}
                </Button>
            </CardContent>
        </Card>
    );
}
