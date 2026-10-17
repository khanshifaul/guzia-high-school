"use client";

// components/portal/sidebar.tsx — session-gated portal sidebar built on the
// ui/sidebar primitives (zylosync pattern): collapsible to icons with a rail
// toggle, grouped nav, and a footer user dropdown (profile · theme · logout).

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaGraduationCap, FaArrowRightFromBracket, FaGear } from "react-icons/fa6";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { logout, useSession, type SessionUser } from "@/lib/auth-client";
import { NAV_BY_ROLE } from "./role-nav";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
    ADMIN: "Admin",
    TEACHER: "Teacher",
    STUDENT: "Student",
    PARENT: "Parent",
};

const PROFILE_URL: Record<SessionUser["role"], string> = {
    ADMIN: "/admin/settings",
    TEACHER: "/teacher",
    STUDENT: "/student",
    PARENT: "/parent",
};

export function PortalSidebar({ children }: { children: React.ReactNode }) {
    const { user, loading } = useSession();
    const router = useRouter();

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
                <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading session…</p>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <PortalSidebarInner user={user} />
            <SidebarInsetShell>{children}</SidebarInsetShell>
        </SidebarProvider>
    );
}

function PortalSidebarInner({ user }: { user: SessionUser }) {
    const pathname = usePathname();
    const router = useRouter();
    const { isMobile } = useSidebar();
    const sections = NAV_BY_ROLE[user.role];

    async function handleLogout() {
        await logout();
        router.replace("/login");
    }

    return (
        <Sidebar collapsible="icon" className="border-r border-border/60 bg-card">
            {/* Brand */}
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="h-auto data-[state=open]:bg-sidebar-accent">
                            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary/10">
                                <FaGraduationCap className="size-5 text-primary" />
                            </div>
                            <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate font-black text-base tracking-tight text-primary uppercase">GHS</span>
                                <span className="truncate text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                                    {ROLE_LABEL[user.role]} Portal
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {sections.map((section) => (
                    <SidebarGroup key={section.title}>
                        <SidebarGroupLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            {section.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const active =
                                        item.href === pathname ||
                                        (!["/admin", "/teacher", "/student", "/parent"].includes(item.href) &&
                                            pathname.startsWith(item.href));
                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                tooltip={item.label}
                                                isActive={active}
                                                className="h-9 gap-2.5 px-3 text-sm font-semibold"
                                            >
                                                <Link href={item.href}>
                                                    <Icon className="size-4" />
                                                    <span>{item.label}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            {/* Footer: collapse trigger + user dropdown */}
            <SidebarFooter>
                <Separator className="mb-1 bg-border/60" />
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                                >
                                    <Avatar className="size-8 rounded-lg">
                                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                                            {user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                                        <span className="truncate text-sm font-semibold">{user.fullName}</span>
                                        <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
                                    </div>
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side={isMobile ? "bottom" : "top"}
                                align="end"
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="size-8 rounded-lg">
                                            <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                                                {user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left leading-tight">
                                            <span className="truncate text-sm font-semibold">{user.fullName}</span>
                                            <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
                                            <span className="truncate text-[11px] text-primary font-semibold uppercase tracking-wider">
                                                {ROLE_LABEL[user.role]}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={PROFILE_URL[user.role]} className="cursor-pointer font-medium">
                                        <FaGear className="mr-2 size-4" /> Settings
                                    </Link>
                                </DropdownMenuItem>
                                <ThemeSwitcher />
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
                                    <FaArrowRightFromBracket className="mr-2 size-4" /> Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}

function SidebarInsetShell({ children }: { children: React.ReactNode }) {
    // Built-in SidebarInset handles the width offset from the fixed sidebar.
    return (
        <SidebarInset>
            <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/60 bg-card px-4 py-3 md:px-6 shrink-0">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <Separator orientation="vertical" className="mr-2 h-4 bg-border/60" />
                <span className="text-sm font-bold text-foreground tracking-tight">Guzia High School</span>
            </header>
            <main className="flex-1 p-4 md:p-6 bg-muted/10">{children}</main>
        </SidebarInset>
    );
}
