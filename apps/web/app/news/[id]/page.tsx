// app/news/[id]/page.tsx — public detail page for a global notice.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowLeft, FaCalendarDays, FaNewspaper } from "react-icons/fa6";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const API = process.env.API_BASE_URL ?? "http://localhost:4000";

interface PublicNotice {
    id: string;
    title: string;
    body: string;
    createdAt: string;
}

async function getNotice(id: string): Promise<PublicNotice | null> {
    try {
        const res = await fetch(`${API}/api/notices/public/${id}`, { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as PublicNotice;
    } catch {
        return null;
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const notice = await getNotice(id);
    if (!notice) return { title: "Notice not found", robots: { index: false } };

    const description = notice.body.replace(/\s+/g, " ").trim().slice(0, 160);
    return {
        title: notice.title,
        description,
        alternates: { canonical: `/news/${id}` },
        openGraph: {
            type: "article",
            url: `/news/${id}`,
            title: `${notice.title} | ${SITE_NAME}`,
            description,
        },
    };
}

export default async function NoticePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const notice = await getNotice(id);
    if (!notice) notFound();

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Link
                            href="/news"
                            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mb-6"
                        >
                            <FaArrowLeft size={11} /> All news &amp; events
                        </Link>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-wider mb-4">
                            <FaNewspaper className="mr-1" size={9} /> Notice
                        </Badge>
                        <h1 className="text-[clamp(1.7rem,4.5vw,2.6rem)] font-black tracking-tight text-foreground leading-tight mb-4">
                            {notice.title}
                        </h1>
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FaCalendarDays size={12} />
                            {new Date(notice.createdAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                            <span className="opacity-60">·</span>
                            {SITE_NAME}
                        </p>
                    </div>
                </section>

                <section className="py-12 md:py-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Card className="border-border/60">
                            <CardContent className="p-6 md:p-8">
                                <div className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">
                                    {notice.body}
                                </div>
                            </CardContent>
                        </Card>
                        <p className="mt-6 text-xs text-muted-foreground">
                            Published by {SITE_NAME},{" "}
                            <a href={SITE_URL} className="text-primary hover:underline">
                                guzia-high-school.vercel.app
                            </a>
                            . <Link href="/news" className="text-primary hover:underline">Back to the news feed</Link>.
                        </p>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
