// src/ai/llm/json.util.ts — tolerant JSON extraction for LLM replies.
// Providers do not always honour `response_format: json_object`: models may wrap
// the object in prose or a ```json fence. This pulls out the JSON object.

/** Parse the JSON object from an LLM reply. Throws if none is found. */
export function parseJsonObject(raw: string): unknown {
    const trimmed = raw.trim();
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
    const candidate = (fenced?.[1] ?? trimmed).trim();
    try {
        return JSON.parse(candidate);
    } catch {
        // Fall back to the outermost {...} span (prose before/after the object).
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return JSON.parse(candidate.slice(start, end + 1));
        }
        throw new SyntaxError('No JSON object found in the AI reply');
    }
}
