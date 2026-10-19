// lib/teacher-classes.ts — the /classes payload lists every class; a teacher's
// pickers must only offer the classes where they actually teach a subject.

/** Classes in which `teacherId` teaches at least one subject. */
export function myClasses<T extends { subjects: { teacher?: { id: string } | null }[] }>(
    classes: T[] | undefined,
    teacherId: string | null,
): T[] {
    if (!classes || !teacherId) return [];
    return classes.filter((c) => c.subjects.some((cs) => cs.teacher?.id === teacherId));
}
