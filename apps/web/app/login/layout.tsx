import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign in",
    description:
        "Sign in to the Guzia Bilateral High School portal for admins, teachers, students and parents.",
    alternates: { canonical: "/login" },
    robots: { index: false, follow: false },
    openGraph: {
        url: "/login",
        title: "Sign in | Guzia Bilateral High School",
        description:
            "Sign in to the Guzia Bilateral High School portal for admins, teachers, students and parents.",
    },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}
