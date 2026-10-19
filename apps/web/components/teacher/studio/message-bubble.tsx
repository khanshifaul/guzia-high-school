"use client";

// components/teacher/studio/message-bubble.tsx — one chat turn.
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/studio";
import { CitationChip } from "./citation-chip";

export function MessageBubble({
    message,
    onCitation,
    onMakePaper,
    onMakePlan,
}: {
    message: ChatMessage;
    onCitation?: (index: number) => void;
    onMakePaper?: () => void;
    onMakePlan?: () => void;
}) {
    const mine = message.role === "USER";
    const citations = message.citations ?? [];

    return (
        <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm",
                    mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted/60 border border-border/60 rounded-bl-sm",
                )}
            >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {!mine && citations.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {citations.map((citation, index) => (
                            <CitationChip
                                key={`${citation.sourceId ?? "s"}-${index}`}
                                citation={citation}
                                onOpen={() => onCitation?.(index)}
                            />
                        ))}
                    </div>
                ) : null}
                {!mine && (onMakePaper || onMakePlan) ? (
                    <div className="mt-2 flex gap-1.5 pt-2 border-t border-border/50">
                        {onMakePaper ? (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[9px] font-black uppercase" onClick={onMakePaper}>
                                Make paper
                            </Button>
                        ) : null}
                        {onMakePlan ? (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[9px] font-black uppercase" onClick={onMakePlan}>
                                Make plan
                            </Button>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
