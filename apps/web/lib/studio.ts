// lib/studio.ts — shapes shared by the three Studio routes.
// The server owns every derived value (counts, citations); these are just the
// payload types the API returns.

export interface WorkspaceSummary {
    id: string;
    title: string;
    class: { id: string; name: string } | null;
    subject: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
    sourceCount: number;
    chatCount: number;
    lastMessage: string | null;
    hasProcessing: boolean;
}

export interface StudioSource {
    id: string;
    filename: string;
    kind: string;
    pages: number | null;
    status: string;
    classId?: string | null;
    subjectId?: string | null;
    createdAt: string;
    /** Why the ingest failed, when status is FAILED. */
    error?: string | null;
    usedIn?: number;
    class?: { id: string; name: string } | null;
    subject?: { id: string; name: string } | null;
}

export interface Citation {
    sourceId?: string;
    filename?: string;
    page: number | null;
    snippet: string;
}

export interface ChatMessage {
    id: string;
    role: "USER" | "ASSISTANT";
    content: string;
    citations: Citation[] | null;
    createdAt: string;
}

export interface WorkspaceDetail {
    id: string;
    title: string;
    classId: string | null;
    subjectId: string | null;
    class: { id: string; name: string } | null;
    subject: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
    sources: StudioSource[];
    messages: ChatMessage[];
}

export interface ClassOption {
    id: string;
    name: string;
    subjects: { subject: { id: string; name: string }; teacher?: { id: string } | null }[];
}

/** "Class 8 · Bangla 1st Paper", skipping whichever side is missing. */
export function workspaceScope(workspace: {
    class: { name: string } | null;
    subject: { name: string } | null;
}): string {
    return [workspace.class?.name, workspace.subject?.name].filter(Boolean).join(" · ");
}
