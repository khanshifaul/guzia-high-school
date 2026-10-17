"use client";

// app/(portal)/admin/settings/page.tsx — admin settings: AI provider control
// panel. Base URL + API key + "Fetch models" → select text/vision models from
// the provider's list. No temperature / provider-name fields (kept simple).

import * as React from "react";
import { FaGear, FaWifi, FaSpinner, FaDownload } from "react-icons/fa6";
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
import { SiteSettingsPanel } from "@/components/admin/site-settings-panel";
import { api, RequestError } from "@/lib/api";

interface ProviderConfig {
    id: string; name: string; baseUrl: string; textModel: string; visionModel: string | null;
    apiKeyHint: string | null; enabled: boolean;
}
interface TestResult { ok: boolean; latencyMs?: number; reply?: string; error?: string }

const NONE = "__none__";

/** Derive a short display label from the base URL host (replaces the old
 *  free-text provider name; keeps mock detection off when pointing at a real
 *  provider). */
function deriveLabel(baseUrl: string): string {
    try {
        const host = new URL(baseUrl).hostname.replace(/^www\./, "");
        return host.split(".")[0] || host;
    } catch {
        return "Mock";
    }
}

export default function AdminSettingsPage() {
    const [config, setConfig] = React.useState<ProviderConfig | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [baseUrl, setBaseUrl] = React.useState("");
    const [textModel, setTextModel] = React.useState("");
    const [visionModel, setVisionModel] = React.useState(NONE);
    const [apiKey, setApiKey] = React.useState("");
    const [enabled, setEnabled] = React.useState(true);
    const [models, setModels] = React.useState<string[]>([]);
    const [fetching, setFetching] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [test, setTest] = React.useState<TestResult | null>(null);
    const [testing, setTesting] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    React.useEffect(() => {
        api<ProviderConfig>("/ai/provider-config")
            .then((c) => {
                setConfig(c);
                setBaseUrl(c.baseUrl);
                setTextModel(c.textModel);
                setVisionModel(c.visionModel ?? NONE);
                setEnabled(c.enabled);
                // If a text model is already set, show it in the dropdown too.
                if (c.textModel) setModels((m) => (m.includes(c.textModel) ? m : [c.textModel, ...m]));
            })
            .catch(() => setConfig(null))
            .finally(() => setLoading(false));
    }, []);

    async function fetchModels() {
        setFetching(true);
        setFeedback(null);
        try {
            const body: Record<string, unknown> = { baseUrl };
            if (apiKey) body.apiKey = apiKey;
            const res = await api<{ models: string[] }>("/ai/provider-config/models", { method: "POST", body });
            setModels(res.models);
            setFeedback({ kind: "ok", msg: `Loaded ${res.models.length} models from provider` });
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Could not fetch models" });
        } finally {
            setFetching(false);
        }
    }

    async function save() {
        setBusy(true); setFeedback(null);
        try {
            // Keep the seeded mock mode unless the admin points at a real
            // provider (key entered or base URL changed).
            const keepMock =
                !!config?.name.toLowerCase().startsWith("mock") &&
                !apiKey &&
                baseUrl === config?.baseUrl;
            const body: Record<string, unknown> = {
                name: keepMock ? config?.name : deriveLabel(baseUrl),
                baseUrl,
                textModel,
                visionModel: visionModel === NONE ? null : visionModel,
                enabled,
            };
            if (apiKey) body.apiKey = apiKey;
            const updated = await api<ProviderConfig>("/ai/provider-config", { method: "PUT", body });
            setConfig(updated);
            setFeedback({ kind: "ok", msg: "Provider saved (applies within 60s)" });
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Save failed" });
        } finally { setBusy(false); }
    }

    async function testConnection() {
        setTesting(true); setTest(null);
        try {
            const body: Record<string, unknown> = { baseUrl, textModel };
            if (apiKey) body.apiKey = apiKey;
            setTest(await api<TestResult>("/ai/provider-config/test", { method: "POST", body }));
        } catch (err) {
            setTest({ ok: false, error: err instanceof RequestError ? err.messages.join("; ") : "Test failed" });
        } finally { setTesting(false); }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Settings" icon={FaGear} /><Skeleton className="h-64" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Settings" subtitle="AI provider & site configuration" icon={FaGear} />

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
                        OpenAI-compatible: DeepSeek, OpenAI, Groq, local Ollama… Enter the base URL + key, then fetch models to pick text/vision.
                    </p>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Base URL</label>
                        <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="h-11" placeholder="https://api.deepseek.com/v1" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                            API key {config?.apiKeyHint ? <span className="text-emerald-600">(stored: {config.apiKeyHint})</span> : <span className="text-muted-foreground">(none)</span>}
                        </label>
                        <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="h-11" placeholder="sk-… (leave blank to keep)" />
                    </div>

                    <Button onClick={fetchModels} disabled={fetching || !baseUrl} variant="outline"
                        className="w-full font-black text-xs uppercase tracking-wider border-dashed">
                        {fetching ? <><FaSpinner className="animate-spin" size={12} /> Fetching models…</> : <><FaDownload size={12} /> Fetch models from provider</>}
                    </Button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Text model</label>
                            <Select value={textModel || undefined} onValueChange={setTextModel}>
                                <SelectTrigger className="h-11 text-xs"><SelectValue placeholder={models.length ? "Select a model" : "Fetch models first"} /></SelectTrigger>
                                <SelectContent>
                                    {models.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Vision model (optional)</label>
                            <Select value={visionModel} onValueChange={setVisionModel}>
                                <SelectTrigger className="h-11 text-xs"><SelectValue placeholder="None (text-only)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>None (text-only)</SelectItem>
                                    {models.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Switch checked={enabled} onCheckedChange={setEnabled} />
                        <span className="text-sm font-semibold">Provider enabled</span>
                    </div>

                    {test ? (
                        <div className={`p-4 rounded-xl border text-sm ${test.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
                            {test.ok ? <>✓ Connected in {test.latencyMs}ms — “{test.reply}”</> : <>✗ {test.error}</>}
                        </div>
                    ) : null}

                    <div className="flex gap-3">
                        <Button onClick={testConnection} disabled={testing} variant="outline" className="font-black text-xs uppercase tracking-wider">
                            {testing ? <><FaSpinner className="animate-spin" size={12} /> Testing…</> : <><FaWifi size={12} /> Test Connection</>}
                        </Button>
                        <Button onClick={save} disabled={busy || !baseUrl || !textModel} className="font-black text-xs uppercase tracking-wider">
                            {busy ? <><FaSpinner className="animate-spin" size={12} /> Saving…</> : "Save Config"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <SiteSettingsPanel />
        </div>
    );
}
