"use client";

// components/shared/test-paper.tsx — the printable test-paper document.
//
// One canonical rendering of a paper, shared by the on-screen view
// (/teacher/tests/[id]) and the print route (/teacher/tests/[id]/print).
// The print route is a separate page so the sheet can be printed without
// the portal chrome; the layout below is what actually lands on paper.
//
// The document is styled in millimetres against an A4 sheet (210 × 297mm)
// and uses `print:` variants so the screen preview and the paper agree.

import { cn } from "@/lib/utils";

export interface PaperQuestion {
    id: string;
    type: "MCQ" | "SHORT" | "LONG";
    text: string;
    options: string[] | null;
    answer: string;
    explanation: string | null;
    difficulty: string;
    marks: number;
    order: number;
}

export interface PaperMeta {
    title: string;
    className: string;
    subjectName: string;
    totalMarks: number;
    durationMinutes: number;
    teacherName: string;
    questionCount: number;
}

export interface Letterhead {
    schoolName: string;
    schoolNameBn: string;
    address: string;
    phone: string;
    email: string;
    eiin: string;
    board: string;
}

const SECTION_LABEL: Record<PaperQuestion["type"], string> = {
    MCQ: "Multiple Choice",
    SHORT: "Short Answer",
    LONG: "Long Answer",
};

/** The three question groups in the order a paper presents them. */
const SECTION_ORDER: PaperQuestion["type"][] = ["MCQ", "SHORT", "LONG"];

/**
 * The paper document.
 *
 * `showAnswers` renders the answer key inline (the teacher's copy).
 * `answerSheet` renders a separate answer grid instead — what a student
 * receives when the key must not be on the same sheet.
 */
export function TestPaperDocument({
    paper,
    meta,
    letterhead,
    showAnswers = false,
    answerSheet = false,
    className,
}: {
    paper: PaperQuestion[];
    meta: PaperMeta;
    letterhead: Letterhead;
    showAnswers?: boolean;
    answerSheet?: boolean;
    className?: string;
}) {
    const grouped = SECTION_ORDER.map((type) => ({
        type,
        questions: paper.filter((q) => q.type === type),
    })).filter((g) => g.questions.length > 0);

    // Running number across sections, so a student can cite "Q7" not "Q2 of B".
    const runningNumbers = new Map<string, number>();
    let running = 0;
    for (const g of grouped) {
        for (const q of g.questions) {
            running += 1;
            runningNumbers.set(q.id, running);
        }
    }

    return (
        <div
            className={cn(
                "mx-auto bg-white text-black",
                // A4 sheet. On screen it is a white page with a shadow; in print
                // it becomes the page itself.
                "w-[210mm] min-h-[297mm] p-[16mm] shadow-lg print:w-full print:min-h-0 print:p-0 print:shadow-none",
                className,
            )}
        >
            <LetterheadBlock letterhead={letterhead} meta={meta} />

            {grouped.map((group) => (
                <section key={group.type} className="mt-7">
                    <h2 className="mb-3 border-b-2 border-black pb-1 text-[13px] font-black uppercase tracking-wider">
                        Section {String.fromCharCode(65 + SECTION_ORDER.indexOf(group.type))} — {SECTION_LABEL[group.type]}
                        <span className="ml-2 text-[10px] font-bold normal-case tracking-normal text-black/60">
                            ({group.questions.length} question{group.questions.length === 1 ? "" : "s"}, {group.questions[0].marks} mark{group.questions[0].marks === 1 ? "" : "s"} each)
                        </span>
                    </h2>

                    <ol className="space-y-4">
                        {group.questions.map((q) => (
                            <li key={q.id} className="break-inside-avoid pl-1">
                                <div className="flex items-start gap-2">
                                    <span className="font-bold">{runningNumbers.get(q.id)}.</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[12.5px] leading-relaxed">{q.text}</p>

                                        {q.options && q.options.length > 0 ? (
                                            <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
                                                {q.options.map((opt, oi) => (
                                                    <li key={oi} className="text-[12px]">
                                                        <span className="font-bold">{String.fromCharCode(97 + oi)})</span> {opt}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : null}

                                        {q.type !== "MCQ" ? (
                                            <div className="mt-2 space-y-2">
                                                {Array.from({ length: q.type === "LONG" ? 4 : 2 }, (_, line) => (
                                                    <div key={line} className="h-4 border-b border-dashed border-black/25" />
                                                ))}
                                            </div>
                                        ) : null}

                                        {showAnswers ? (
                                            <div className="mt-1.5 border-l-2 border-emerald-600 pl-2">
                                                <p className="text-[11.5px] font-bold text-emerald-800">
                                                    Answer: {q.answer}
                                                </p>
                                                {q.explanation ? (
                                                    <p className="text-[10.5px] italic leading-snug text-black/70">{q.explanation}</p>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                    <span className="shrink-0 text-[10px] font-bold text-black/50">({q.marks})</span>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
            ))}

            {answerSheet ? <AnswerSheetGrid questions={paper} runningNumbers={runningNumbers} /> : null}

            <footer className="mt-8 border-t border-black/30 pt-3 text-center text-[9px] leading-relaxed text-black/60">
                <p>
                    {meta.teacherName} · {meta.className} · {meta.subjectName} · {meta.totalMarks} marks · {meta.durationMinutes} minutes
                </p>
                <p className="mt-0.5">
                    {letterhead.schoolName} · EIIN {letterhead.eiin} · {letterhead.board}
                </p>
            </footer>
        </div>
    );
}

/** School identity block at the top of the sheet. */
function LetterheadBlock({ letterhead, meta }: { letterhead: Letterhead; meta: PaperMeta }) {
    return (
        <header className="border-b-2 border-black pb-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-[20px] font-black uppercase leading-tight tracking-tight">
                        {letterhead.schoolName}
                    </h1>
                    <p className="text-[13px] font-semibold leading-tight">{letterhead.schoolNameBn}</p>
                    <p className="mt-1 text-[10px] leading-snug text-black/70">
                        {letterhead.address} · {letterhead.phone} · {letterhead.email}
                    </p>
                    <p className="text-[10px] leading-snug text-black/70">
                        EIIN {letterhead.eiin} · {letterhead.board}
                    </p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-[15px] font-black uppercase tracking-wider">Test Paper</p>
                    <p className="text-[11px] font-bold">{meta.className}</p>
                    <p className="text-[11px]">{meta.subjectName}</p>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t border-black/20 pt-3 text-[11px]">
                <p className="max-w-[60%] font-semibold leading-snug">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-black/50">Title</span>
                    {meta.title}
                </p>
                <div className="flex gap-6">
                    <MetaCell label="Total Marks" value={String(meta.totalMarks)} />
                    <MetaCell label="Time" value={`${meta.durationMinutes} min`} />
                    <MetaCell label="Questions" value={String(meta.questionCount)} />
                </div>
            </div>
        </header>
    );
}

function MetaCell({ label, value }: { label: string; value: string }) {
    return (
        <p className="text-center">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-black/50">{label}</span>
            <span className="text-[13px] font-black">{value}</span>
        </p>
    );
}

/** Detachable answer grid — what a student fills in, without the key. */
function AnswerSheetGrid({
    questions,
    runningNumbers,
}: {
    questions: PaperQuestion[];
    runningNumbers: Map<string, number>;
}) {
    return (
        <section className="mt-8 break-inside-avoid">
            <h2 className="mb-2 border-b-2 border-black pb-1 text-[13px] font-black uppercase tracking-wider">
                Answer Sheet
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                {questions.map((q) => (
                    <p key={q.id} className="flex items-baseline gap-2 text-[11.5px]">
                        <span className="w-8 shrink-0 font-bold">{runningNumbers.get(q.id)}.</span>
                        <span className="flex-1 border-b border-dotted border-black/40" />
                    </p>
                ))}
            </div>
        </section>
    );
}
