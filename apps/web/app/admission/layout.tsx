import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admission",
    description:
        "Admission requirements, dates and the online application form for Classes 6–10 at Guzia Bilateral High School.",
    alternates: { canonical: "/admission" },
    openGraph: {
        url: "/admission",
        title: "Admission | Guzia Bilateral High School",
        description:
            "Admission requirements, dates and the online application form for Classes 6–10 at Guzia Bilateral High School.",
    },
};

export default function AdmissionLayout({ children }: { children: React.ReactNode }) {
    return children;
}
