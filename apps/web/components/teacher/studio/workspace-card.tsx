"use client";

// components/teacher/studio/workspace-card.tsx — one workspace on the home grid.
import * as React from "react";
import { FaPen, FaTrash } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workspaceScope, type WorkspaceSummary } from "@/lib/studio";

export function WorkspaceCard({
    workspace,
    onOpen,
    onRename,
    onDelete,
}: {
    workspace: WorkspaceSummary;
    onOpen: () => void;
    onRename: () => void;
    onDelete: () => void;
}) {
    const scope = workspaceScope(workspace);
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onOpen();
            }}
            className="cursor-pointer h-full"
        >
            <Card className="border-border/60 shadow-sm hover:border-primary/40 transition-colors h-full">
                <CardHeader className="border-b border-border/60 pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-black uppercase tracking-tight">{workspace.title}</CardTitle>
                        {workspace.hasProcessing ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[8px]">processing</Badge>
                        ) : null}
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                        {scope || "No class or subject"} · {workspace.sourceCount} source
                        {workspace.sourceCount === 1 ? "" : "s"} · {workspace.chatCount ? "1 chat" : "no chats"}
                    </p>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">
                        {workspace.lastMessage ?? "No conversations yet"}
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 border-t border-border/60">
                        <Button size="sm" className="font-black text-[10px] uppercase tracking-wider">Open</Button>
                        <span className="flex-1" />
                        <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Rename ${workspace.title}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onRename();
                            }}
                            className="size-7 text-muted-foreground hover:text-foreground"
                        >
                            <FaPen size={10} />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete ${workspace.title}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onDelete();
                            }}
                            className="size-7 text-muted-foreground hover:text-destructive"
                        >
                            <FaTrash size={10} />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
