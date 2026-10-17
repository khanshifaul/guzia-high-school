"use client";

// components/public/footer.tsx — public footer: brand + quick links + contact.

import Link from "next/link";
import { FaGraduationCap, FaPhone, FaEnvelope, FaLocationDot } from "react-icons/fa6";

export function Footer() {
    return (
        <footer className="bg-card border-t border-border/60">
            <div className="container mx-auto px-4 md:px-8 max-w-7xl py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <FaGraduationCap className="text-primary" size={22} />
                            <span className="font-black text-lg text-primary uppercase tracking-tight">
                                Guzia High School
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            Shaping tomorrow&apos;s leaders since 1958. A nurturing environment where
                            students excel academically and develop character.
                        </p>
                    </div>

                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">
                            Quick Links
                        </p>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
                            <li><Link href="/#programs" className="text-muted-foreground hover:text-primary transition-colors">Academics</Link></li>
                            <li><Link href="/#facilities" className="text-muted-foreground hover:text-primary transition-colors">Facilities</Link></li>
                            <li><Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">Portal Login</Link></li>
                        </ul>
                    </div>

                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Contact</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2"><FaLocationDot className="text-primary" size={12} /> Guzia, Bangladesh</li>
                            <li className="flex items-center gap-2"><FaPhone className="text-primary" size={12} /> +880 1XXX-XXXXXX</li>
                            <li className="flex items-center gap-2"><FaEnvelope className="text-primary" size={12} /> info@guziahs.edu</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-border/60 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                        © {new Date().getFullYear()} Guzia High School · Est. 1958
                    </p>
                </div>
            </div>
        </footer>
    );
}
