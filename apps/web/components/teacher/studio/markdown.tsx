"use client";

// components/teacher/studio/markdown.tsx — assistant answers are Markdown, and
// the model writes math as \( … \) / \[ … \] (OpenAI style). remark-math reads
// $ … $ / $$ … $$, so the delimiters are normalised first.
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/** \[ … \] → $$ … $$, \( … \) → $ … $. Idempotent for plain $ math. */
export function normalizeMath(text: string): string {
    return text
        .replace(/\\\[([\s\S]*?)\\\]/g, (_match, body: string) => `\n$$\n${body.trim()}\n$$\n`)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_match, body: string) => `$${body.trim()}$`);
}

export function Markdown({ children }: { children: string }) {
    return (
        <div
            className={[
                "text-sm leading-relaxed break-words",
                "[&_p]:mb-2 [&_p:last-child]:mb-0",
                "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5",
                "[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5",
                "[&_li]:mb-0.5",
                "[&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px]",
                "[&_pre]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/5 [&_pre]:p-2",
                "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
                "[&_strong]:font-bold",
                "[&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-black",
                "[&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-bold",
                "[&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-bold",
                "[&_table]:mb-2 [&_table]:w-full [&_th]:pb-1 [&_th]:text-left [&_th]:font-bold [&_td]:py-0.5",
                "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground",
                "[&_a]:underline",
                // Long equations scroll inside the bubble instead of stretching it.
                "[&_.katex-display]:overflow-x-auto [&_.katex-display]:py-1",
                "[&_.katex]:text-[1.02em]",
            ].join(" ")}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    a: ({ href, children: label }) => (
                        <a href={href} target="_blank" rel="noreferrer">{label}</a>
                    ),
                }}
            >
                {normalizeMath(children)}
            </ReactMarkdown>
        </div>
    );
}
