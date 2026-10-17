// scripts/check-docs-links.mjs — verify internal markdown links resolve.
// Scans README.md + specs/*.md for relative links and reports broken ones.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const files = ["README.md", ...readdirSync(join(root, "specs")).map((f) => join("specs", f))];

let broken = 0;
for (const rel of files) {
  const path = join(root, rel);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, "utf8");
  const base = dirname(path);
  // Markdown links: [text](target)
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = m[1].trim();
    if (/^(https?:|mailto:|#)/.test(target)) continue; // skip external/anchors
    const [filePart] = target.split("#");
    if (!filePart) continue;
    const resolved = resolve(base, filePart);
    if (!existsSync(resolved)) {
      console.error(`✗ ${rel} → ${target}`);
      broken++;
    }
  }
}

if (broken === 0) {
  console.log(`✔ All internal links resolve (${files.length} files checked).`);
} else {
  console.error(`\n${broken} broken link(s).`);
  process.exit(1);
}
