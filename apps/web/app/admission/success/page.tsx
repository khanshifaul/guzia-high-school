"use client";

// app/admission/success/page.tsx — POST/redirect/GET receipt page after a
// successful admission submit. Reads the receipt from sessionStorage so a
// refresh/back never resubmits the application.
//
// The applicant's copy is the full application form, so the form is what
// this page shows — not a receipt card with a link to the form. The one
// action left is printing it, and printing prints the form.

import * as React from "react";
import { FaCircleCheck, FaPrint } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useSiteConfig } from "@/lib/site-config";
import {
    AdmissionApplicationSheet,
    printApplicationSheet,
    type ApplicationLetterhead,
} from "@/components/shared/admission-application";
import {
    EMPTY_APPLICATION,
    applicationNumber,
    type AdmissionReceipt,
    type ApplicationFiles,
    type ApplicationForm,
} from "@/lib/admission-application";

export default function AdmissionSuccessPage() {
    const cfg = useSiteConfig();
    const [receipt, setReceipt] = React.useState<AdmissionReceipt | null>(null);
    // The form and its attachments are what the sheet is printed from; they
    // travel with the receipt in the session.
    const [form, setForm] = React.useState<ApplicationForm | null>(null);
    const [files, setFiles] = React.useState<ApplicationFiles>({});

    React.useEffect(() => {
        try {
            const rawReceipt = sessionStorage.getItem("admissionReceipt");
            const rawPrint = sessionStorage.getItem("admissionPrintData");
            if (rawReceipt) setReceipt(JSON.parse(rawReceipt) as AdmissionReceipt);
            if (rawPrint) {
                const stored = JSON.parse(rawPrint) as { form: ApplicationForm; files: ApplicationFiles };
                setForm({ ...EMPTY_APPLICATION, ...stored.form });
                setFiles(stored.files ?? {});
            }
        } catch {
            // A corrupt entry leaves the page on its "not found" state.
        }
    }, []);

    const letterhead: ApplicationLetterhead = {
        schoolName: cfg.schoolName,
        schoolNameBn: cfg.schoolNameBn,
        address: cfg.address,
        phone: cfg.phone,
        email: cfg.email,
        eiin: cfg.eiin,
        board: cfg.board,
    };

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
                <div className="print:hidden"><Footer /></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-muted/30 print:bg-white">
            <div className="print:hidden"><Navbar /></div>
            <main className="flex-1 container mx-auto px-4 py-10 print:max-w-none print:p-0">
                <div className="text-center mb-8 print:hidden">
                    <div className="inline-flex items-center gap-2 text-emerald-600 font-black uppercase tracking-wider text-sm">
                        <FaCircleCheck size={18} /> Application Submitted
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        {receipt.emailSent
                            ? "A confirmation has also been emailed to you."
                            : "Save or print this page — keep your application number."}
                    </p>
                    <p className="mt-3 text-sm">
                        Application No.{" "}
                        <span className="font-mono font-bold text-primary">{applicationNumber(receipt)}</span>
                    </p>
                    <Button onClick={() => void printApplicationSheet()} className="gap-2 mt-5 font-black text-xs uppercase tracking-wider">
                        <FaPrint size={12} /> Print / Save as PDF
                    </Button>
                </div>

                {/* The receipt may be in the session while the form is not
                    (a cleared tab, or a link opened elsewhere). The form is
                    what makes this page worth printing, so without it the
                    page falls back to the receipt itself. */}
                {form ? (
                    <div className="flex justify-center py-6 print:p-0">
                        <AdmissionApplicationSheet
                            form={form}
                            files={files}
                            receipt={receipt}
                            letterhead={letterhead}
                        />
                    </div>
                ) : (
                    <Card className="border-2 border-border bg-card shadow-sm">
                        <CardContent className="p-8">
                            <div className="text-center border-b border-border pb-4 mb-6">
                                <h1 className="text-2xl font-black text-primary uppercase tracking-tight">{cfg.schoolName}</h1>
                                <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase mt-1">
                                    Admission Application · Receipt #{applicationNumber(receipt)}
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
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Application No</p>
                                    <p className="font-mono font-bold text-primary">{applicationNumber(receipt)}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Status</p>
                                    <p className="font-semibold">Submitted — under review</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-4">
                                Keep this application number. The admission result will be published in the school notices.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </main>
            <div className="print:hidden"><Footer /></div>
        </div>
    );
}
