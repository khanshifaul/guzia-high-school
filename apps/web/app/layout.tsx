import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/language-context";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Guzia High School — Management Portal",
    description:
        "School management portal for Guzia High School (grades 6–10): students, teachers, attendance, exams, fees, and AI assistance.",
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full w-full antialiased`}
            suppressHydrationWarning
        >
            <body className="min-h-full flex flex-col bg-background text-foreground">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <LanguageProvider>
                        <main className="flex-1 flex flex-col">{children}</main>
                    </LanguageProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
