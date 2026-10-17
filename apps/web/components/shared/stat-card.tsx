"use client";

// components/shared/stat-card.tsx — big-number stat card (orange design).

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
    value,
    label,
    hint,
}: {
    value: string | number;
    label: string;
    hint?: string;
}) {
    return (
        <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
                <p className="text-3xl font-black text-primary">{value}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                    {label}
                </p>
                {hint ? (
                    <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
                ) : null}
            </CardContent>
        </Card>
    );
}
