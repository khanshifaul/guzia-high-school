// lib/subjects.ts — a class's `subjects` array is one row per (subject,
// section), so the same subject id repeats. Dedupe by subject id so React keys
// stay unique and pickers don't list the same subject twice.

/** Unique subjects from a ClassSubject row list. */
export function dedupeSubjects<S extends { id: string }>(
    rows: { subject: S }[] | undefined,
): S[] {
    if (!rows) return [];
    return [...new Map(rows.map((cs) => [cs.subject.id, cs.subject])).values()];
}
