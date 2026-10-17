"use client";

// components/public/navbar.tsx — public sticky navbar (alumni-app 3-layer
// recipe, condensed): brand lockup + nav links + theme switcher + sign in.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FaGraduationCap, FaBars, FaXmark } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { cn } from "@/lib/utils";

const LINKS = [
    { label: "Home", href: "/" },
    { label: "Academics", href: "/#programs" },
    { label: "Facilities", href: "/#facilities" },
    { label: "Admissions", href: "/#cta" },
];

export function Navbar() {
    const pathname = usePathname();
    const [open, setOpen] = React.useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b border-border/60 shadow-sm">
            <div className="container mx-auto px-4 md:px-8 max-w-7xl h-14 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <FaGraduationCap className="text-primary" size={22} />
                    <span className="font-black text-lg text-primary uppercase tracking-tight">
                        Guzia High School
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-1">
                    {LINKS.map((l) => {
                        const active = pathname === l.href;
                        return (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={cn(
                                    "relative px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                                    active ? "text-primary" : "text-foreground/80 hover:text-primary",
                                )}
                            >
                                {l.label}
                                {active ? (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                ) : null}
                            </Link>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <ThemeSwitcher />
                    <Link href="/login">
                        <Button className="font-black text-xs uppercase tracking-wider px-4 py-2 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform duration-200">
                            Sign In
                        </Button>
                    </Link>
                    <button
                        className="md:hidden text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setOpen((o) => !o)}
                        aria-label="Toggle menu"
                    >
                        {open ? <FaXmark size={20} /> : <FaBars size={20} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {open ? (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden overflow-hidden border-t border-border/60 bg-background"
                    >
                        <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
                            {LINKS.map((l) => (
                                <Link
                                    key={l.href}
                                    href={l.href}
                                    onClick={() => setOpen(false)}
                                    className="px-3 py-2 rounded-md text-sm font-semibold hover:bg-muted"
                                >
                                    {l.label}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </nav>
    );
}
