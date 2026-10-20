import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact",
    description:
        "Address, phone number and contact form for Guzia Bilateral High School, Guzia, Shibganj, Bogura.",
    alternates: { canonical: "/contact" },
    openGraph: {
        url: "/contact",
        title: "Contact | Guzia Bilateral High School",
        description:
            "Address, phone number and contact form for Guzia Bilateral High School, Guzia, Shibganj, Bogura.",
    },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return children;
}
