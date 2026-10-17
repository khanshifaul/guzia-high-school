"use client";

// components/portal/sidebar.tsx — session-gated pill sidebar (alumni-app
// admin-shell recipe). Desktop: w-72 sticky card; mobile: spring drawer.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FaGraduationCap, FaArrowRightFromBracket, FaXmark, FaBars } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { logout, useSession, type SessionUser } from "@/lib/auth-client";
import { NAV_BY_ROLE, type NavSection } from "./role-nav";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
    ADMIN: "Admin",
    TEACHER: "Teacher",
    STUDENT: "Student",
    PARENT: "Parent",
};

function NavSections({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
    const pathname = usePathname();
    return (
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {sections.map((section) => (
                <div key={section.title}>
                    <p className="px-4 mb-2 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                        {section.title}
                    </p>
                    <div className="space-y-1.5">
                        {section.items.map((item) => {
                            const active =
                                item.href === pathname ||
                                (item.href !== "/admin" &&
                                    item.href !== "/teacher" &&
                                    item.href !== "/student" &&
                                    item.href !== "/parent" &&
                                    pathname.startsWith(item.href));
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onNavigate}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 relative group cursor-pointer",
                                        active
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                                    )}
                                >
                                    <Icon
                                        size={16}
                                        className={cn(
                                            "shrink-0",
                                            !active && "group-hover:text-primary transition-colors",
                                        )}
                                    />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function PortalSidebar({ children }: { children: React.ReactNode }) {
    const { user, loading } = useSession();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = React.useState(false);

    // Session gate: pending → spinner; none → /login with callback.
    React.useEffect(() => {
        if (!loading && !user) {
            router.replace(`/login?callbackUrl=${window.location.pathname}`);
        }
    }, [loading, user, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-muted/10">
                <FaGraduationCap className="animate-spin text-4xl text-primary mb-4" />
                <p className="text-sm font-semibold text-muted-foreground animate-pulse">
                    Loading session…
                </p>
            </div>
        );
    }

    const sections = NAV_BY_ROLE[user.role];

    async function handleLogout() {
        await logout();
        router.replace("/login");
    }

    return (
        <div className="min-h-screen bg-muted/10 flex flex-col md:flex-row relative">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Mobile header */}
            <div className="md:hidden w-full bg-card border-b border-border/60 flex items-center justify-between px-4 py-4 sticky top-0 z-30 shadow-md">
                <span className="font-black text-lg text-primary tracking-wider uppercase">
                    GHS {ROLE_LABEL[user.role]}
                </span>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Open menu"
                >
                    <FaBars size={20} />
                </button>
            </div>

            {/* Mobile drawer */}
            <AnimatePresence>
                {mobileOpen ? (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="fixed inset-0 bg-black/40 z-40 md:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 bottom-0 left-0 w-80 bg-card border-r border-border/60 z-50 shadow-2xl flex flex-col md:hidden"
                        >
                            <div className="p-6 border-b border-border/60 flex items-center justify-between">
                                <span className="font-black text-xl text-primary tracking-wider uppercase">
                                    GHS {ROLE_LABEL[user.role]}
                                </span>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                                    aria-label="Close menu"
                                >
                                    <FaXmark size={18} />
                                </button>
                            </div>
                            <NavSections sections={sections} onNavigate={() => setMobileOpen(false)} />
                            <div className="p-4 border-t border-border/60">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                    <FaArrowRightFromBracket size={16} />
                                    Sign out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                ) : null}
            </AnimatePresence>

            {/* Desktop sidebar */}
            <aside className="hidden md:flex flex-col w-72 bg-card border-r border-border/60 shrink-0 sticky top-0 h-screen shadow-xl z-20">
                <div className="p-6 border-b border-border/60">
                    <div className="flex items-center gap-2">
                        <FaGraduationCap className="text-primary" size={22} />
                        <span className="font-black text-xl text-primary tracking-wider uppercase">
                            GHS
                        </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase font-semibold mt-1">
                        {ROLE_LABEL[user.role]} Portal
                    </p>
                </div>
                <NavSections sections={sections} />
                <div className="p-4 border-t border-border/60">
                    <div className="px-4 py-2 mb-2">
                        <p className="text-xs font-bold truncate">{user.fullName}</p>
                        <p className="text-[9px] font-semibold text-primary uppercase tracking-wider">
                            {ROLE_LABEL[user.role]}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                        <FaArrowRightFromBracket size={16} />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Content column */}
            <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen md:h-screen">
                <div className="hidden md:flex items-center justify-between px-8 py-5 bg-card border-b border-border/60 shrink-0 sticky top-0 z-10">
                    <span className="text-lg font-bold text-foreground tracking-tight">
                        {ROLE_LABEL[user.role]} Portal
                    </span>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold">{user.fullName}</span>
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs">
                            {user.fullName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
                <main className="flex-1 p-6 md:p-8">{children}</main>
            </div>
        </div>
    );
}
