"use client";

// components/teacher/studio/composer.tsx — the chat input.
// Enter sends, Shift+Enter inserts a newline; it grows to four rows.
import * as React from "react";
import { FaPaperPlane, FaSpinner } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_HEIGHT = 120;

export function Composer({
    value,
    onChange,
    onSend,
    busy,
    disabled,
    hint,
}: {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    busy: boolean;
    disabled: boolean;
    hint?: string;
}) {
    const ref = React.useRef<HTMLTextAreaElement>(null);

    // Grow with the content, capped so the pane does not jump.
    React.useEffect(() => {
        const element = ref.current;
        if (!element) return;
        element.style.height = "auto";
        element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
    }, [value]);

    return (
        <div className="flex items-end gap-2 border-t border-border/60 p-2">
            <Textarea
                ref={ref}
                rows={1}
                value={value}
                disabled={disabled || busy}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        onSend();
                    }
                }}
                placeholder={hint ?? "Ask about these sources…  (Enter to send · Shift+Enter newline)"}
                className="min-h-10 resize-none py-2"
            />
            <Button
                onClick={onSend}
                disabled={disabled || busy || !value.trim()}
                className="h-10 shrink-0 font-black text-xs uppercase tracking-wider"
            >
                {busy ? <FaSpinner className="animate-spin" size={12} /> : <FaPaperPlane size={12} />}
            </Button>
        </div>
    );
}
