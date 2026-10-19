"use client";

// app/admission/success/page.tsx — POST/redirect/GET receipt page after a
// successful admission submit. Reads the receipt from sessionStorage so a
// refresh/back never resubmits the application.

import * as React from "react";
import { FaCircleCheck, FaPrint } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";

interface Receipt {
    id: string;
    username: string;
    password: string;
    studentName: string;
    classWanted: string;
    emailSent: boolean;
}

export default function AdmissionSuccessPage() {
    const [receipt, setReceipt] = React.useState<Receipt | null>(null);

    React.useEffect(() => {
        try {
            const raw = sessionStorage.getItem("admissionReceipt");
            if (raw) setReceipt(JSON.parse(raw));
        } catch {
            setReceipt(null);
        }
    }, []);

    if (!receipt) {
        return (
            <div className="min-h-screen flex flex-col bg-muted/30">
                <Navbar />
                <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
                    <Card className="border-destructive/20 shadow-sm">
                        <CardContent className="p-12 text-center">
                            <h2 className="text-2xl font-black text-destructive uppercase tracking-tight mb-2">
                                Application Not Found
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                Please <a href="/admission" className="underline">submit an application</a> first.
                            </p>
                        </CardContent>
                    </Card>
                </main>
                <div className="no-print"><Footer /></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-muted/30">
            <div className="no-print"><Navbar /></div>
            <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 text-emerald-600 font-black uppercase tracking-wider text-sm">
                        <FaCircleCheck size={18} /> Application Submitted
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        {receipt.emailSent
                            ? "Your credentials have also been emailed to you."
                            : "Save or print this form — it contains your portal credentials."}
                    </p>
                </div>
                <Card className="border-2 border-border bg-card shadow-sm">
                    <CardContent className="p-8">
                        <div className="text-center border-b border-border pb-4 mb-6">
                            <h1 className="text-2xl font-black text-primary uppercase tracking-tight">Guzia High School</h1>
                            <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase mt-1">
                                Admission Application · Receipt #{receipt.id.slice(-8).toUpperCase()}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Student Name</p>
                                <p className="font-semibold">{receipt.studentName}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Class Applied</p>
                                <p className="font-semibold">{receipt.classWanted}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Username</p>
                                <p className="font-mono font-bold">{receipt.username}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Password</p>
                                <p className="font-mono font-bold text-primary">{receipt.password}</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-4">
                            Use these credentials to log in and track your application. Change your password after first login.
                        </p>
                    </CardContent>
                </Card>
                <div className="no-print flex flex-col sm:flex-row gap-3 mt-6 justify-center">
                    <Button onClick={() => window.print()} className="gap-2 font-black text-xs uppercase tracking-wider">
                        <FaPrint size={12} /> Print / Save as PDF
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            sessionStorage.removeItem("admissionReceipt");
                            window.location.replace("/admission");
                        }}
                        className="font-black text-xs uppercase tracking-wider"
                    >
                        New Application
                    </Button>
                </div>
            </main>
            <div className="no-print"><Footer /></div>
        </div>
    );
}
