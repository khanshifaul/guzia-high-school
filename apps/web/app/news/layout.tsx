import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "News & events",
    description:
        "School news, published notices and the upcoming events calendar at Guzia High School, Bogura.",
    alternates: { canonical: "/news" },
    openGraph: {
        url: "/news",
        title: "News & events | Guzia High School",
        description:
            "School news, published notices and the upcoming events calendar at Guzia High School, Bogura.",
    },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
