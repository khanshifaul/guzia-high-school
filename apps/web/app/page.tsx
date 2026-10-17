// app/page.tsx — public landing. Simple hero + demo-login CTA (kept minimal;
// the portal is the product).

import Link from "next/link";
import { FaGraduationCap, FaArrowRight } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATS = [
    { value: "6–10", label: "Grades" },
    { value: "15", label: "Students" },
    { value: "3", label: "Teachers" },
    { value: "6", label: "Subjects" },
];

export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col">
            <nav className="sticky top-0 z-50 w-full bg-background border-b shadow-sm">
                <div className="container mx-auto px-4 md:px-8 max-w-7xl h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FaGraduationCap className="text-primary" size={22} />
                        <span className="font-black text-xl text-primary uppercase tracking-tight">
                            Guzia High School
                        </span>
                    </div>
                    <Link href="/login">
                        <Button className="font-black text-xs uppercase tracking-wider px-4 py-2.5 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform duration-200">
                            Sign In <FaArrowRight size={12} />
                        </Button>
                    </Link>
                </div>
            </nav>

            <main className="flex-1">
                <section className="container mx-auto px-4 md:px-8 max-w-7xl py-20 md:py-28">
                    <div className="max-w-2xl">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-3">
                            Management Portal
                        </p>
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground leading-tight">
                            One school, one source of truth
                        </h1>
                        <p className="text-muted-foreground text-sm font-semibold mt-4 max-w-xl">
                            Students, teachers, attendance, canonical GPA grading, fee ledgers,
                            and an AI early-warning board — built for Guzia High School (grades 6–10).
                        </p>
                        <div className="mt-8">
                            <Link href="/login">
                                <Button className="font-black text-xs uppercase tracking-wider px-6 py-3 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform duration-200">
                                    Enter Portal <FaArrowRight size={12} />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
                        {STATS.map((s) => (
                            <Card key={s.label} className="border-border/60 shadow-sm">
                                <CardContent className="p-6 text-center">
                                <p className="text-3xl font-black text-primary">{s.value}</p>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                                    {s.label}
                                </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="border-t border-border/60 py-8">
                <div className="container mx-auto px-4 md:px-8 max-w-7xl text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                        Guzia High School · Management Portal
                    </p>
                </div>
            </footer>
        </div>
    );
}
