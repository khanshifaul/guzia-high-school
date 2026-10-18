"use client";

// app/contact/page.tsx — public Contact page: contact form (client-side,
// posts to /api/contact), address block, and an OpenStreetMap embed.

import * as React from "react";
import { motion } from "motion/react";
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaPaperPlane } from "react-icons/fa";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useLanguage } from "@/lib/language-context";
import { useSiteConfig } from "@/lib/site-config";

const fadeIn = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function ContactPage() {
    const { t } = useLanguage();
    const cfg = useSiteConfig();
    const [form, setForm] = React.useState({ name: "", email: "", message: "" });
    const [status, setStatus] = React.useState<"idle" | "sending" | "sent" | "error">("idle");

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("sending");
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("failed");
            setStatus("sent");
            setForm({ name: "", email: "", message: "" });
        } catch {
            setStatus("error");
        }
    };

    // Google Maps embed is admin-controlled via Site Settings (mapEmbedUrl).
    const mapSrc = cfg.mapEmbedUrl;

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <motion.div initial="hidden" animate="visible">
                            <motion.h1 variants={fadeIn} className="text-[clamp(2rem,5vw,3rem)] font-black tracking-tight text-foreground mb-3">
                                {t("Contact Us", "যোগাযোগ করুন")}
                            </motion.h1>
                            <motion.p variants={fadeIn} className="text-muted-foreground max-w-2xl mx-auto">
                                {t("We'd love to hear from you. Reach out with any question.", "আমরা আপনার কাছ থেকে শুনতে ভালোবাসি। যেকোনো প্রশ্নে যোগাযোগ করুন।")}
                            </motion.p>
                        </motion.div>
                    </div>
                </section>

                <section className="py-16 md:py-20">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Info + Map */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="space-y-6">
                            <Card className="border-border/60">
                                <CardContent className="p-6 space-y-4">
                                    <h2 className="font-black text-lg text-foreground">{t("Reach Us", "যোগাযোগের ঠিকানা")}</h2>
                                    <ul className="space-y-3 text-sm text-muted-foreground">
                                        <li className="flex items-start gap-3"><FaMapMarkerAlt className="text-primary mt-1 shrink-0" size={14} /> {cfg.address}</li>
                                        <li className="flex items-center gap-3"><FaPhone className="text-primary shrink-0" size={14} /> {cfg.phone}</li>
                                        <li className="flex items-center gap-3"><FaEnvelope className="text-primary shrink-0" size={14} /> {cfg.email}</li>
                                    </ul>
                                </CardContent>
                            </Card>
                            <Card className="border-border/60 overflow-hidden">
                                <iframe title="School location" src={mapSrc} className="w-full h-72 border-0" loading="lazy" />
                            </Card>
                        </motion.div>

                        {/* Form */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                            <Card className="border-border/60">
                                <CardContent className="p-6">
                                    <h2 className="font-black text-lg text-foreground mb-4">{t("Send a Message", "বার্তা পাঠান")}</h2>
                                    <form onSubmit={onSubmit} className="space-y-4">
                                        <Input placeholder={t("Your name", "আপনার নাম")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                        <Input type="email" placeholder={t("Email address", "ইমেইল ঠিকানা")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                                        <Textarea placeholder={t("Your message", "আপনার বার্তা")} rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                                        <Button type="submit" disabled={status === "sending"} className="w-full font-bold uppercase tracking-wider">
                                            <FaPaperPlane className="mr-2" size={12} />
                                            {status === "sending" ? t("Sending...", "পাঠানো হচ্ছে...") : t("Send Message", "বার্তা পাঠান")}
                                        </Button>
                                        {status === "sent" && <p className="text-sm text-emerald-600 font-semibold">{t("Message sent! We'll get back to you soon.", "বার্তা পাঠানো হয়েছে! আমরা শীঘ্রই যোগাযোগ করব।")}</p>}
                                        {status === "error" && <p className="text-sm text-red-600 font-semibold">{t("Something went wrong. Please try again.", "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।")}</p>}
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
