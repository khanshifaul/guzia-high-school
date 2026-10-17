"use client";

// app/(portal)/admin/settings/page.tsx — admin settings: AI provider control
// panel (base URL, models, masked key, test-connection). The "switch LLM
// without restart" demo.

import * as React from "react";
import { FaGear, FaWifi, FaSpinner } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface ProviderConfig {
    id: string; name: string; baseUrl: string; textModel: string; visionModel: string | null;
    apiKeyHint: string | null; temperature: number; maxTokens: number; enabled: boolean;
}
interface TestResult { ok: boolean; latencyMs?: number; reply?: string; error?: string }

export default function AdminSettingsPage() {
    const [config, setConfig] = React.useState<ProviderConfig | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [form, setForm] = React.useState({ name: "", baseUrl: "", textModel: "", visionModel: "", apiKey: "", temperature: 0.3, enabled: true });
    const [busy, setBusy] = React.useState(false);
    const [test, setTest] = React.useState<TestResult | null>(null);
    const [testing, setTesting] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    React.useEffect(() => {
        api<{ data: ProviderConfig }>("/ai/provider-config")
            .then((p) => {
                const c = p.data;
                setConfig(c);
                setForm({ name: c.name, baseUrl: c.baseUrl, textModel: c.textModel, visionModel: c.visionModel ?? "", apiKey: "", temperature: c.temperature, enabled: c.enabled });
            })
            .catch(() => setConfig(null))
            .finally(() => setLoading(false));
    }, []);

    async function save() {
        setBusy(true); setFeedback(null);
        try {
            const body: Record<string, unknown> = {
                name: form.name,
                baseUrl: form.baseUrl,
                textModel: form.textModel,
                visionModel: form.visionModel || null,
                temperature: form.temperature,
                enabled: form.enabled,
            };
            if (form.apiKey) body.apiKey = form.apiKey;
            const updated = await api<{ data: ProviderConfig }>("/ai/provider-config", { method: "PUT", body });
            setConfig(updated.data);
            setFeedback({ kind: "ok", msg: "Provider config saved (applies within 60s)" });
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Save failed" });
        } finally { setBusy(false); }
    }

    async function testConnection() {
        setTesting(true); setTest(null);
        try {
            const body: Record<string, unknown> = { name: form.name, baseUrl: form.baseUrl, textModel: form.textModel };
            if (form.apiKey) body.apiKey = form.apiKey;
            const res = await api<TestResult>("/ai/provider-config/test", { method: "POST", body });
            setTest(res);
        } catch (err) {
            setTest({ ok: false, error: err instanceof RequestError ? err.messages.join("; ") : "Test failed" });
        } finally { setTesting(false); }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Settings" icon={FaGear} /><Skeleton className="h-64" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Settings" subtitle="AI provider configuration" icon={FaGear} />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">LLM Provider</CardTitle>
                    <Badge className={config?.enabled ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}>
                        {config?.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    <p className="text-xs text-muted-foreground">
                        Point the app at any OpenAI-compatible API (DeepSeek, OpenAI, Groq, local Ollama…). Changes apply within 60s — no restart.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Provider name</label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" placeholder="DeepSeek" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Base URL</label>
                            <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} className="h-11" placeholder="https://api.deepseek.com/v1" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Text model</label>
                            <Input value={form.textModel} onChange={(e) => setForm({ ...form, textModel: e.target.value })} className="h-11" placeholder="deepseek-chat" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Vision model (optional)</label>
                            <Input value={form.visionModel} onChange={(e) => setForm({ ...form, visionModel: e.target.value })} className="h-11" placeholder="for image OCR" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                API key {config?.apiKeyHint ? <span className="text-emerald-600">(stored: {config.apiKeyHint})</span> : <span className="text-muted-foreground">(none)</span>}
                            </label>
                            <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} className="h-11" placeholder="sk-… (leave blank to keep)" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Temperature ({form.temperature})</label>
                            <input type="range" min={0} max={2} step={0.1} value={form.temperature}
                                onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                                className="w-full mt-3 accent-[var(--primary)]" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                        <span className="text-sm font-semibold">Provider enabled</span>
                    </div>

                    {test ? (
                        <div className={`p-4 rounded-xl border text-sm ${test.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
                            {test.ok ? (
                                <>✓ Connected in {test.latencyMs}ms — “{test.reply}”</>
                            ) : (
                                <>✗ {test.error}</>
                            )}
                        </div>
                    ) : null}

                    <div className="flex gap-3">
                        <Button onClick={testConnection} disabled={testing} variant="outline" className="font-black text-xs uppercase tracking-wider">
                            {testing ? <><FaSpinner className="animate-spin" size={12} /> Testing…</> : <><FaWifi size={12} /> Test Connection</>}
                        </Button>
                        <Button onClick={save} disabled={busy} className="font-black text-xs uppercase tracking-wider">
                            {busy ? <><FaSpinner className="animate-spin" size={12} /> Saving…</> : "Save Config"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
