import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Academics",
    description:
        "Academic programmes and the NCTB curriculum for Classes 6–10 at Guzia Bilateral High School, Bogura.",
    alternates: { canonical: "/academics" },
    openGraph: {
        url: "/academics",
        title: "Academics | Guzia Bilateral High School",
        description:
            "Academic programmes and the NCTB curriculum for Classes 6–10 at Guzia Bilateral High School, Bogura.",
    },
};

export default function AcademicsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
