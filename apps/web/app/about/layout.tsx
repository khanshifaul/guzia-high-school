import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About the school",
    description:
        "The history, mission and leadership of Guzia Bilateral High School, Bogura — a government-recognised secondary school since 1958.",
    alternates: { canonical: "/about" },
    openGraph: {
        url: "/about",
        title: "About the school | Guzia Bilateral High School",
        description:
            "The history, mission and leadership of Guzia Bilateral High School, Bogura — a government-recognised secondary school since 1958.",
    },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return children;
}
