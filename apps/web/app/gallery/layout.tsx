import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Gallery",
    description:
        "Photos of Guzia High School — the campus, classrooms and school events.",
    alternates: { canonical: "/gallery" },
    openGraph: {
        url: "/gallery",
        title: "Gallery | Guzia High School",
        description:
            "Photos of Guzia High School — the campus, classrooms and school events.",
    },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
    return children;
}
