"use client";

// app/login/page.tsx — centered-card login (alumni-app auth-center recipe).
// On success, redirect to the caller's ?callbackUrl or the role home.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { FaGraduationCap, FaExclamation, FaSpinner } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type SessionUser } from "@/lib/auth-client";

const ROLE_HOME: Record<SessionUser["role"], string> = {
    ADMIN: "/admin",
    TEACHER: "/teacher",
    STUDENT: "/student",
    PARENT: "/parent",
};

// Demo credentials shown as clickable chips (fill the form).
const DEMO = [
    { label: "Admin", email: "admin@guziahs.edu" },
    { label: "Teacher", email: "teacher1@guziahs.edu" },
    { label: "Student", email: "student01@guziahs.edu" },
    { label: "Parent", email: "parent01@guziahs.edu" },
];

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const user = await login(email, password);
            const callback = searchParams.get("callbackUrl");
            router.replace(callback ?? ROLE_HOME[user.role]);
        } catch (err) {
            const message =
                err instanceof Error && err.message ? err.message : "Login failed";
            setError(message);
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="border-border/50 shadow-xl">
                    <div className="h-1.5 bg-gradient-brand w-full rounded-t-xl" />
                    <CardContent className="p-6 pt-6">
                        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <FaGraduationCap className="text-3xl text-primary" />
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground text-center">
                            Guzia High School
                        </h1>
                        <p className="text-muted-foreground text-xs font-semibold mt-1 text-center tracking-[0.2em] uppercase">
                            Management Portal
                        </p>

                        <form onSubmit={onSubmit} className="space-y-5 mt-6">
                            {error ? (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2.5"
                                >
                                    <FaExclamation size={14} />
                                    {error}
                                </motion.div>
                            ) : null}

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="email"
                                    className="text-[10px] font-black text-muted-foreground uppercase tracking-wider"
                                >
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11"
                                    placeholder="you@guziahs.edu"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="password"
                                    className="text-[10px] font-black text-muted-foreground uppercase tracking-wider"
                                >
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11"
                                    placeholder="••••••••"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 font-black text-xs uppercase tracking-wider"
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="animate-spin" size={12} />
                                        Signing in…
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 pt-4 border-t border-border/60">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center mb-2">
                                Demo logins · password123
                            </p>
                            <div className="flex flex-wrap gap-1.5 justify-center">
                                {DEMO.map((d) => (
                                    <button
                                        key={d.email}
                                        type="button"
                                        onClick={() => {
                                            setEmail(d.email);
                                            setPassword("password123");
                                        }}
                                        className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 cursor-pointer"
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
