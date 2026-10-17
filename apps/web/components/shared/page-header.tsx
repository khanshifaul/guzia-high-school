"use client";

// components/shared/page-header.tsx — consistent orange page header (specs/03).

import * as React from "react";
import type { IconType } from "react-icons";

export function PageHeader({
    title,
    subtitle,
    icon: Icon,
    actions,
}: {
    title: string;
    subtitle?: string;
    icon: IconType;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                    <Icon className="text-primary text-xl" /> {title}
                </h1>
                {subtitle ? (
                    <p className="text-muted-foreground text-xs font-semibold mt-1">{subtitle}</p>
                ) : null}
            </div>
            {actions ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">{actions}</div>
            ) : null}
        </div>
    );
}
