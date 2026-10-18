"use client";

// components/ui/theme-switcher.tsx — theme toggle, two variants:
//  • "dropdown" (default): a DropdownMenuItem for use inside a menu (sidebar
//    footer) — icon + "Theme: <mode>" label.
//  • "icon": a standalone icon-only button for the navbar utility bar, styled
//    to match the language switcher (just the icon, muted, hover to foreground).

import * as React from "react";
import { useTheme } from "next-themes";
import { FiSun, FiMoon, FiMonitor } from "react-icons/fi";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeSwitcherProps {
    variant?: "dropdown" | "icon";
    className?: string;
}

export function ThemeSwitcher({ variant = "dropdown", className }: ThemeSwitcherProps) {
    const { setTheme, theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Avoid hydration mismatch.
    React.useEffect(() => {
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        // Cycle: light → dark → system → light
        if (theme === "light") setTheme("dark");
        else if (theme === "dark") setTheme("system");
        else setTheme("light");
    };

    const current = mounted ? theme : undefined;
    const Icon = !mounted ? FiSun : theme === "system" ? FiMonitor : resolvedTheme === "dark" ? FiMoon : FiSun;
    const label = !mounted ? "Theme" : theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light";

    if (variant === "icon") {
        return (
            <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Theme: ${label}. Click to change.`}
                title={`Theme: ${label}`}
                className={cn(
                    "flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                    className,
                )}
            >
                <Icon size={13} />
            </button>
        );
    }

    return (
        <DropdownMenuItem onClick={toggleTheme} closeOnSelect={false}>
            <Icon className="mr-2 h-4 w-4" />
            <span>Theme: {label}</span>
            {current === undefined ? <span className="sr-only">Theme</span> : null}
        </DropdownMenuItem>
    );
}
