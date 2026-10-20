import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admission",
    description:
        "Admission requirements, dates and the online application form for Classes 6–10 at Guzia High School.",
    alternates: { canonical: "/admission" },
    openGraph: {
        url: "/admission",
        title: "Admission | Guzia High School",
        description:
            "Admission requirements, dates and the online application form for Classes 6–10 at Guzia High School.",
    },
};

export default function AdmissionLayout({ children }: { children: React.ReactNode }) {
    return children;
}
