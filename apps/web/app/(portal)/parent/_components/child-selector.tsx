"use client";

// app/(portal)/parent/_components/child-selector.tsx — pick which child to
// view; auto-selects when there's only one.

import * as React from "react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Child { id: string; fullName: string; className: string }

export function useMyChildren() {
    const [children, setChildren] = React.useState<Child[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selected, setSelected] = React.useState<string | null>(null);

    React.useEffect(() => {
        api<{ data: { childIds?: string[] } }>("/auth/me")
            .then(async (me) => {
                const ids = me.data.childIds ?? [];
                if (ids.length === 0) return;
                const results = await Promise.all(
                    ids.map((id) =>
                        api<{ id: string; fullName: string; class: { name: string } }>(`/students/${id}`)
                            .then((s) => ({ id: s.id, fullName: s.fullName, className: s.class.name }))
                            .catch(() => null),
                    ),
                );
                const valid = results.filter((c): c is Child => c !== null);
                setChildren(valid);
                if (valid.length > 0) setSelected(valid[0].id);
            })
            .catch(() => setChildren([]))
            .finally(() => setLoading(false));
    }, []);

    return { children, loading, selected, setSelected };
}

export function ChildSelector({
    children: kids,
    loading,
    selected,
    onChange,
}: {
    children: Child[];
    loading: boolean;
    selected: string | null;
    onChange: (id: string) => void;
}) {
    if (loading) return <Skeleton className="h-11 w-full max-w-sm" />;
    if (kids.length === 0) {
        return <EmptyState title="No children linked" description="Contact the school office to link your account to your child." />;
    }
    if (kids.length === 1) {
        return (
            <p className="text-sm font-bold text-foreground">
                Viewing: <span className="text-primary">{kids[0].fullName}</span>
                <span className="text-muted-foreground font-semibold"> · {kids[0].className}</span>
            </p>
        );
    }
    return (
        <Select value={selected ?? undefined} onValueChange={onChange}>
            <SelectTrigger className="w-full max-w-sm h-11 text-xs font-semibold uppercase tracking-wider">
                <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
                {kids.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                        {c.fullName} — {c.className}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
