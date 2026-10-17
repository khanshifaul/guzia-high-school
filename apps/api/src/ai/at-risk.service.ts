// src/ai/at-risk.service.ts — feature extraction + scoring + persistence.
// Features (all 0–1, "higher = safer"): attendanceRate, invLateRate, gpaTrend,
// submissionRate, invOverdueFee. See specs/07 for exact definitions.
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { weightedAttendancePct } from '../attendance/attendance.util';
import {
    featureContributions,
    predictProbability,
    type TrainedModel,
} from './model';
import { loadTrainedModel } from './model/at-risk-model.loader';

export const RISK_FEATURES = [
    'attendanceRate',
    'invLateRate',
    'gpaTrend',
    'submissionRate',
    'invOverdueFee',
] as const;

const WINDOW_DAYS = 60;

@Injectable()
export class AtRiskService {
    private readonly logger = new Logger(AtRiskService.name);

    constructor(private readonly prisma: DatabaseService) {}

    /** Recompute risk for every active student and upsert AtRiskScore rows. */
    async recompute(): Promise<{ scored: number; flagged: number }> {
        const model = await this.loadModel();
        const students = await this.prisma.student.findMany({
            where: { status: 'ACTIVE' },
        });

        let flagged = 0;
        for (const student of students) {
            const features = await this.extractFeatures(student.id);
            if (!features) continue;

            const prob = predictProbability(model, features.vector);
            const factors = featureContributions(model, features.vector, 3);
            if (prob >= model.threshold) flagged++;

            await this.prisma.atRiskScore.upsert({
                where: { studentId: student.id },
                create: {
                    studentId: student.id,
                    score: prob,
                    atRisk: prob >= model.threshold,
                    factors: { features: features.raw, contributions: factors },
                },
                update: {
                    score: prob,
                    atRisk: prob >= model.threshold,
                    factors: { features: features.raw, contributions: factors },
                    computedAt: new Date(),
                },
            });
        }

        this.logger.log(`At-risk recompute: ${students.length} scored, ${flagged} flagged`);
        return { scored: students.length, flagged };
    }

    /** Board data: flagged (or all) students sorted by score desc. */
    async board(atRiskOnly: boolean) {
        const scores = await this.prisma.atRiskScore.findMany({
            where: atRiskOnly ? { atRisk: true } : {},
            include: {
                student: {
                    include: { class: true, section: true },
                },
            },
            orderBy: { score: 'desc' },
        });

        const model = await this.loadModel().catch(() => null);
        return {
            threshold: model?.threshold ?? 0.5,
            trainedAt: model?.trainedAt ?? null,
            metrics: model?.metrics ?? null,
            rows: scores.map((s) => {
                const raw = (s.factors as { features?: Record<string, number> })?.features ?? {};
                const contributions =
                    (s.factors as { contributions?: unknown })?.contributions ?? [];
                return {
                    studentId: s.studentId,
                    fullName: s.student.fullName,
                    className: s.student.class.name,
                    sectionName: s.student.section?.name ?? null,
                    score: Math.round(s.score * 1000) / 1000,
                    atRisk: s.atRisk,
                    factors: raw,
                    contributions,
                    computedAt: s.computedAt,
                };
            }),
        };
    }

    /** Build the 5-feature vector for one student, or null if insufficient data. */
    async extractFeatures(studentId: string): Promise<{ vector: number[]; raw: Record<string, number> } | null> {
        const since = new Date(Date.now() - WINDOW_DAYS * 86400000);

        const attendance = await this.prisma.attendanceRecord.findMany({
            where: { studentId, date: { gte: since } },
        });
        const marks = await this.prisma.examMark.findMany({
            where: { studentId, exam: { published: true } },
            include: { exam: true },
        });
        const assignments = await this.prisma.assignment.findMany({
            where: { dueDate: { gte: since } },
            select: { id: true },
        });
        const submissions = await this.prisma.submission.findMany({
            where: { studentId, assignmentId: { in: assignments.map((a) => a.id) } },
        });
        const invoices = await this.prisma.invoice.findMany({
            where: { studentId },
            include: { allocations: true },
        });

        // Feature 1: weighted attendance rate (0–1).
        const attendanceRate = attendance.length
            ? weightedAttendancePct(attendance) / 100
            : 0.5;

        // Feature 2: inverse late rate (fewer lates → safer → higher).
        const lateCount = attendance.filter((a) => a.status === 'LATE').length;
        const invLateRate = attendance.length ? 1 - lateCount / attendance.length : 0.5;

        // Feature 3: GPA trend across published exams, squashed to 0–1 (0.5 = flat).
        const gpaTrend = this.computeGpaTrend(marks);

        // Feature 4: on-time submission rate (no due work → neutral 0.5).
        const submissionRate = assignments.length
            ? submissions.filter((s) => s.status === 'ON_TIME').length / assignments.length
            : 0.5;

        // Feature 5: inverse overdue-fee ratio (no invoices → 0 = safe).
        const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
        const now = Date.now();
        const overdueAmount = invoices.reduce((s, i) => {
            if (i.status === 'PAID') return s;
            const allocated = i.allocations.reduce((a, b) => a + b.amount, 0);
            const due = i.amount - allocated;
            return due > 0 && i.dueDate.getTime() < now ? s + due : s;
        }, 0);
        const invOverdueFee = totalInvoiced > 0 ? 1 - overdueAmount / totalInvoiced : 1;

        const vector = [attendanceRate, invLateRate, gpaTrend, submissionRate, invOverdueFee];
        const raw = {
            attendanceRate: round3(attendanceRate),
            invLateRate: round3(invLateRate),
            gpaTrend: round3(gpaTrend),
            submissionRate: round3(submissionRate),
            invOverdueFee: round3(invOverdueFee),
        };

        // Need a minimal history to score meaningfully.
        if (attendance.length < 10 && marks.length === 0) return null;
        return { vector, raw };
    }

    /** Squashed GPA slope: declining → →0, flat → 0.5, improving → →1. */
    private computeGpaTrend(
        marks: { marksObtained: number; totalMarks: number; examId: string }[],
    ): number {
        const byExam = new Map<string, { sum: number; count: number }>();
        for (const m of marks) {
            const cur = byExam.get(m.examId) ?? { sum: 0, count: 0 };
            cur.sum += m.totalMarks > 0 ? m.marksObtained / m.totalMarks : 0;
            cur.count += 1;
            byExam.set(m.examId, cur);
        }
        const gpas = [...byExam.values()].map((v) => v.sum / v.count);
        if (gpas.length < 2) return 0.5;
        // Slope per exam step.
        const slope = gpas[gpas.length - 1] - gpas[0];
        // Map slope ∈ roughly [-0.5, 0.5] to (0,1) via logistic.
        return 1 / (1 + Math.exp(-slope * 4));
    }

    async loadModel(): Promise<TrainedModel> {
        // Model weights come from the committed JSON produced by ai:train.
        return loadTrainedModel();
    }
}

function round3(v: number): number {
    return Math.round(v * 1000) / 1000;
}
