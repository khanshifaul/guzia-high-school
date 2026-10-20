import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/language-context";
import { SCHOOL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
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
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    title: {
        default: "Guzia High School — Bogura | Classes 6–10",
        template: "%s | Guzia High School",
    },
    description: SITE_DESCRIPTION,
    keywords: [
        "Guzia High School",
        "Bogura school",
        "Shibganj school",
        "secondary school Bangladesh",
        "Class 6 to 10",
        "MPO school Bogura",
        "school admission Bogura",
    ],
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        url: "/",
        siteName: SITE_NAME,
        title: "Guzia High School — Bogura | Classes 6–10",
        description: SITE_DESCRIPTION,
        locale: "en_US",
        alternateLocale: ["bn_BD"],
        images: [
            {
                url: SCHOOL.image,
                width: 2000,
                height: 1125,
                alt: "Guzia High School campus",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Guzia High School — Bogura",
        description: SITE_DESCRIPTION,
        images: [SCHOOL.image],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

const schoolSchema = {
    "@context": "https://schema.org",
    "@type": "HighSchool",
    name: SCHOOL.name,
    alternateName: SCHOOL.alternateName,
    url: SITE_URL,
    logo: `${SITE_URL}${SCHOOL.image}`,
    image: `${SITE_URL}${SCHOOL.image}`,
    description: SITE_DESCRIPTION,
    foundingDate: SCHOOL.founded,
    telephone: SCHOOL.phone,
    address: {
        "@type": "PostalAddress",
        streetAddress: SCHOOL.street,
        addressLocality: SCHOOL.city,
        addressRegion: SCHOOL.region,
        addressCountry: SCHOOL.country,
    },
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
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolSchema) }}
                />
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
