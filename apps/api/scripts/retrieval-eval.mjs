// scripts/retrieval-eval.mjs — retrieval evaluation for cross-source ask.
// Runs a small labelled set against POST /ai/sources/ask and reports recall@k
// (did the expected source appear among the returned citations?).
// Usage: node scripts/retrieval-eval.mjs   (API must be running, DB seeded)
import { writeFileSync, mkdirSync } from 'node:fs';

const API = process.env.API_URL ?? 'http://localhost:4000';
const EMAIL = process.env.EVAL_EMAIL ?? 'teacher1@guziahs.edu';
const PASSWORD = process.env.EVAL_PASSWORD ?? 'password123';

/** question -> filenames that would be a correct hit. */
const CASES = [
    { q: 'What does the water cycle describe?', expect: ['verify.txt'] },
    { q: 'What do mitochondria produce?', expect: ['office-test.docx'] },
    { q: 'সালোকসংশ্লেষণ কীভাবে কাজ করে?', expect: ['source-page.png'] },
    { q: 'What is the discriminant of a quadratic equation?', expect: ['notes.md', 'org.txt'] },
    { q: 'How are quadratic equations solved?', expect: ['notes.md', 'org.txt'] },
];

const login = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!login.ok) throw new Error(`login failed: ${login.status}`);
const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];

const rows = [];
let hits = 0;
for (const c of CASES) {
    const t0 = Date.now();
    const res = await fetch(`${API}/api/ai/sources/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ question: c.q }),
    });
    const ms = Date.now() - t0;
    const body = await res.json().catch(() => ({}));
    const got = (body.citations ?? []).map((x) => x.filename);
    const hit = got.some((f) => c.expect.includes(f));
    if (hit) hits += 1;
    rows.push({ q: c.q, expect: c.expect.join(' | '), got: got.join(', ') || '(none)', hit, ms, status: res.status });
}

const recall = rows.length ? hits / rows.length : 0;
const lines = [
    '# Cross-source retrieval evaluation',
    '',
    `Generated ${new Date().toISOString()} · ${rows.length} labelled questions · metric: recall@k (expected source present in citations).`,
    '',
    '| # | Question | Expected | Returned | Hit | ms |',
    '|---|---|---|---|---|---|',
    ...rows.map((r, i) => `| ${i + 1} | ${r.q} | ${r.expect} | ${r.got} | ${r.hit ? '✅' : '❌'} | ${r.ms} |`),
    '',
    `**Recall@k: ${hits}/${rows.length} (${(recall * 100).toFixed(0)}%)**`,
    '',
    '> Small, hand-labelled set over the current demo corpus. It measures retrieval',
    '> (did the right source surface), not answer faithfulness.',
];
mkdirSync('test-reports', { recursive: true });
writeFileSync('test-reports/retrieval-eval.md', lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nrecall@k = ${hits}/${rows.length}`);
