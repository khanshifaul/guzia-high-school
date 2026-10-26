"use client";

// lib/pages.ts — read a public page's blocks once per mount. The page is the
// only source of section content: nothing here falls back to a literal, so an
// unpublished block disappears instead of silently rendering stale copy.

import * as React from "react";
import type { PageBlock, PagePayload } from "./page-blocks";

/** Fetch one public page. An unpublished or unknown slug reads as null. */
export async function getPage(slug: string): Promise<PagePayload | null> {
    try {
        const res = await fetch(`/api/pages/${encodeURIComponent(slug)}`, {
            credentials: "include",
            cache: "no-store",
        });
        return res.ok ? ((await res.json()) as PagePayload) : null;
    } catch {
        return null;
    }
}

export interface PageState {
    page: PagePayload | null;
    loading: boolean;
}

/** Load a page and re-render when it arrives. `loading` separates "not yet" from "not published". */
export function usePage(slug: string): PageState {
    const [state, setState] = React.useState<PageState>({ page: null, loading: true });

    React.useEffect(() => {
        let live = true;
        getPage(slug).then((page) => {
            if (live) setState({ page, loading: false });
        });
        return () => {
            live = false;
        };
    }, [slug]);

    return state;
}

/** The published block with this key, or undefined when it is absent or unpublished. */
export function blockOf(page: PagePayload | null, key: string): PageBlock | undefined {
    return page?.blocks.find((block) => block.key === key);
}
