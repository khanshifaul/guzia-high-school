"use client";

// app/(portal)/admin/students/import/page.tsx — bulk student import via CSV.
// Parse a CSV client-side → resolve class/section names to ids → preview →
// POST /students/bulk → show created/skipped counts + per-row errors.

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaFileCsv, FaSpinner, FaArrowLeft, FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, RequestError } from "@/lib/api";

interface ClassOption { id: string; name: string; sections: { id: string; name: string }[] }
interface ParsedRow {
    line: number; fullName: string; email: string; rollNo: string;
    classId?: string; sectionId?: string; password: string; dateOfBirth?: string; gender?: string;
    error?: string;
}
interface BulkResult { created: number; skipped: number; errors: { index: number; email: string; reason: string }[] }

const REQUIRED_HEADERS = ["fullname", "email", "class", "rollno"];

function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) { out.push(cur); cur = ""; }
        else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
}

export default function ImportStudentsPage() {
    const router = useRouter();
    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [rows, setRows] = React.useState<ParsedRow[]>([]);
    const [fileName, setFileName] = React.useState("");
    const [headerError, setHeaderError] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);
    const [result, setResult] = React.useState<BulkResult | null>(null);
    const [submitError, setSubmitError] = React.useState<string | null>(null);

    React.useEffect(() => {
        api<{ classes: ClassOption[] }>("/classes").then((p) => setClasses(p.classes)).catch(() => setClasses([]));
    }, []);

    function parse(text: string) {
        setHeaderError(null); setResult(null); setSubmitError(null);
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) { setHeaderError("CSV must have a header row and at least one data row."); setRows([]); return; }
        const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
        const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
        if (missing.length) { setHeaderError(`Missing required column(s): ${missing.join(", ")}.`); setRows([]); return; }
        const idx = (names: string[]) => { for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; } return -1; };
        const iFull = idx(["fullname", "name"]);
        const iEmail = idx(["email"]);
        const iClass = idx(["class", "classname", "class"]);
        const iSection = idx(["section", "sectionname"]);
        const iRoll = idx(["rollno", "roll"]);
        const iPwd = idx(["password", "pwd"]);
        const iDob = idx(["dob", "dateofbirth"]);
        const iGender = idx(["gender", "sex"]);

        const parsed: ParsedRow[] = lines.slice(1).map((line, i) => {
            const c = splitCsvLine(line);
            const fullName = c[iFull] ?? "";
            const email = c[iEmail] ?? "";
            const className = (c[iClass] ?? "").toLowerCase();
            const sectionName = (c[iSection] ?? "").toLowerCase();
            const rollNo = c[iRoll] ?? "";
            const cls = classes.find((x) => x.name.toLowerCase() === className);
            const section = cls?.sections.find((s) => s.name.toLowerCase() === sectionName);
            let error: string | undefined;
            if (!fullName || fullName.length < 2) error = "Invalid name";
            else if (!/\S+@\S+\.\S+/.test(email)) error = "Invalid email";
            else if (!cls) error = `Unknown class "${c[iClass] ?? ""}"`;
            else if (sectionName && !section) error = `Unknown section "${c[iSection]}"`;
            else if (!(Number(rollNo) >= 1)) error = "Invalid roll number";
            return {
                line: i + 2, fullName, email, rollNo, classId: cls?.id, sectionId: section?.id,
                password: (c[iPwd] && c[iPwd].length >= 8) ? c[iPwd] : "password123",
                dateOfBirth: iDob >= 0 ? c[iDob] || undefined : undefined,
                gender: iGender >= 0 ? c[iGender] || undefined : undefined,
                error,
            };
        });
        setRows(parsed);
    }

    const validRows = rows.filter((r) => !r.error);
    const invalidRows = rows.filter((r) => r.error);

    async function importNow() {
        setBusy(true); setSubmitError(null); setResult(null);
        try {
            const res = await api<BulkResult>("/students/bulk", {
                method: "POST",
                body: {
                    students: validRows.map((r) => ({
                        fullName: r.fullName, email: r.email, password: r.password,
                        classId: r.classId!, sectionId: r.sectionId, rollNo: Number(r.rollNo),
                        dateOfBirth: r.dateOfBirth, gender: r.gender,
                    })),
                },
            });
            setResult(res);
        } catch (err) {
            setSubmitError(err instanceof RequestError ? err.messages.join("; ") : "Import failed");
        } finally { setBusy(false); }
    }

    function onFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => parse(String(reader.result));
        reader.readAsText(file);
    }

    function downloadSample() {
        const csv = "fullName,email,class,section,rollNo,password\nAyaan Rahman,ayaan@guziahs.edu,Class 8,A,10,password123\nFatema Akter,fatema@guziahs.edu,Class 8,B,11,password123";
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "students-sample.csv"; a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2"><FaFileCsv className="text-primary" /> Bulk Import Students</h1>
                    <p className="text-xs text-muted-foreground mt-1">Upload a CSV of students. Required columns: <code className="font-semibold">fullName, email, class, rollNo</code>. Optional: <code className="font-semibold">section, password, dob, gender</code>.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={downloadSample} className="font-black text-xs uppercase tracking-wider cursor-pointer">Download sample CSV</Button>
                    <Link href="/admin/students"><Button variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer"><FaArrowLeft size={12} /> Back</Button></Link>
                </div>
            </div>

            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6">
                    <input type="file" accept=".csv,text/csv" onChange={onFile} className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:font-bold file:text-xs file:uppercase file:cursor-pointer hover:file:bg-primary/20" />
                    {fileName ? <p className="text-xs text-muted-foreground mt-2">Loaded: <span className="font-semibold">{fileName}</span></p> : null}
                    {headerError ? <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">{headerError}</div> : null}
                </CardContent>
            </Card>

            {rows.length > 0 ? (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Preview</CardTitle>
                        <div className="flex gap-2">
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">{validRows.length} ready</Badge>
                            {invalidRows.length ? <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]">{invalidRows.length} will be skipped</Badge> : null}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/50 sticky top-0">
                                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                                        <th className="px-4 py-2">Line</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Roll</th><th className="px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.line} className="border-t border-border/40">
                                            <td className="px-4 py-2 text-muted-foreground">{r.line}</td>
                                            <td className="px-4 py-2 font-semibold">{r.fullName}</td>
                                            <td className="px-4 py-2">{r.email}</td>
                                            <td className="px-4 py-2">{r.rollNo}</td>
                                            <td className="px-4 py-2">
                                                {r.error ? <span className="text-rose-600 font-semibold flex items-center gap-1"><FaTriangleExclamation size={10} /> {r.error}</span>
                                                    : <span className="text-emerald-600 font-semibold flex items-center gap-1"><FaCircleCheck size={10} /> Ready</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-border/60 flex items-center gap-3">
                            <Button onClick={importNow} disabled={busy || validRows.length === 0} className="font-black text-xs uppercase tracking-wider">
                                {busy ? <><FaSpinner className="animate-spin" size={12} /> Importing…</> : <>Import {validRows.length} students</>}
                            </Button>
                            {submitError ? <span className="text-rose-600 text-xs font-semibold">{submitError}</span> : null}
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {result ? (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4"><CardTitle className="text-lg font-black uppercase tracking-tight">Import Result</CardTitle></CardHeader>
                    <CardContent className="p-6 space-y-3">
                        <div className="flex gap-4">
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{result.created} created</Badge>
                            {result.skipped ? <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">{result.skipped} skipped</Badge> : null}
                        </div>
                        {result.errors.length ? (
                            <ul className="space-y-1 text-xs text-rose-600">
                                {result.errors.map((e) => <li key={e.index}>Row {e.index + 1} ({e.email}): {e.reason}</li>)}
                            </ul>
                        ) : <p className="text-xs text-emerald-600 font-semibold">All rows imported successfully.</p>}
                        <Button onClick={() => router.push("/admin/students")} className="font-black text-xs uppercase tracking-wider cursor-pointer">View students</Button>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
