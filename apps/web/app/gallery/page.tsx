"use client";

// app/gallery/page.tsx — public campus gallery: a masonry-ish grid of
// admin-managed images with lightbox-style expand.

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { FaImages, FaXmark } from "react-icons/fa6";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useLanguage } from "@/lib/language-context";

interface GalleryItem { id: string; title: string; titleBn?: string; caption?: string; url: string; category?: string }

export default function PublicGalleryPage() {
    const { language, t } = useLanguage();
    const [items, setItems] = React.useState<GalleryItem[]>([]);
    const [active, setActive] = React.useState<GalleryItem | null>(null);

    React.useEffect(() => {
        fetch("/api/gallery", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => setItems(Array.isArray(d) ? d : []))
            .catch(() => setItems([]));
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h1 className="text-[clamp(2rem,5vw,3rem)] font-black tracking-tight text-foreground mb-3 flex items-center justify-center gap-3">
                                <FaImages className="text-primary" /> {t("Campus Gallery", "ক্যাম্পাস গ্যালারি")}
                            </h1>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                {t("Moments from campus life — events, achievements, and everyday learning.", "ক্যাম্পাস জীবনের মুহূর্ত — অনুষ্ঠান, সাফল্য ও দৈনন্দিন শেখা।")}
                            </p>
                        </motion.div>
                    </div>
                </section>

                <section className="py-16 md:py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {items.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm">{t("No photos yet — check back soon!", "এখনো কোনো ছবি নেই — শীঘ্রই আবার দেখুন!")}</p>
                        ) : (
                            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
                                {items.map((it, i) => (
                                    <motion.button
                                        key={it.id}
                                        initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                        transition={{ delay: Math.min(i * 0.03, 0.4) }}
                                        onClick={() => setActive(it)}
                                        className="mb-4 block w-full break-inside-avoid group cursor-pointer"
                                    >
                                        <div className="relative overflow-hidden rounded-xl border border-border/60">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={it.url} alt={it.title} className="w-full group-hover:scale-105 transition-transform duration-300" />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left">
                                                <p className="text-white text-xs font-bold">{language === "bn" && it.titleBn ? it.titleBn : it.title}</p>
                                                {it.caption ? <p className="text-white/80 text-[10px]">{it.caption}</p> : null}
                                            </div>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Lightbox */}
            <AnimatePresence>
                {active ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setActive(null)}>
                        <button className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer" aria-label="Close" onClick={() => setActive(null)}>
                            <FaXmark size={24} />
                        </button>
                        <motion.figure initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={active.url} alt={active.title} className="max-w-full max-h-[80vh] rounded-lg mx-auto" />
                            <figcaption className="text-center text-white mt-3">
                                <p className="font-bold text-sm">{language === "bn" && active.titleBn ? active.titleBn : active.title}</p>
                                {active.caption ? <p className="text-white/70 text-xs">{active.caption}</p> : null}
                            </figcaption>
                        </motion.figure>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <Footer />
        </div>
    );
}
