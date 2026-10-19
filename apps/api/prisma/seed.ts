// prisma/seed.ts — deterministic demo dataset (specs/04). Same seed every run:
// mulberry32 RNG, fixed timestamps. Re-run with `bun run db:seed`.
import { PrismaClient } from "../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// mulberry32: tiny deterministic PRNG (same sequence every run).
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng(42);
const GRADE_BANDS = [
  { minPercent: 80, maxPercent: 100, letter: "A+", point: 4.0 },
  { minPercent: 70, maxPercent: 79, letter: "A", point: 3.5 },
  { minPercent: 60, maxPercent: 69, letter: "A-", point: 3.0 },
  { minPercent: 50, maxPercent: 59, letter: "B", point: 2.5 },
  { minPercent: 40, maxPercent: 49, letter: "C", point: 2.0 },
  { minPercent: 33, maxPercent: 39, letter: "D", point: 1.0 },
  { minPercent: 0, maxPercent: 32, letter: "F", point: 0.0 },
];

const SUBJECTS = [
  { name: "Bangla 1st Paper", code: "BAN1" },
  { name: "English 1st Paper", code: "ENG1" },
  { name: "Mathematics", code: "MATH" },
  { name: "Science", code: "SCI" },
  { name: "ICT", code: "ICT" },
  { name: "Bangladesh & Global Studies", code: "BGS" },
];

const FIRST_NAMES = [
  "Ayaan", "Tanvir", "Nusrat", "Rafi", "Sadia", "Imran", "Farhan", "Zara",
  "Mahin", "Tasnim", "Arif", "Nabila", "Sakib", "Ruma", "Fahim", "Anika",
  "Rakib", "Mim", "Hasan", "Priya", "Sohel", "Lamia", "Jamal", "Sumaiya",
];
const LAST_NAMES = ["Rahman", "Hossain", "Akter", "Islam", "Khan", "Ahmed", "Chowdhury", "Uddin"];

// Weak students (0-indexed in class 8-A): guaranteed AI-demo at-risk cases.
const WEAK_STUDENTS = new Set([2, 7, 12]);

function admissionNo(i: number): string {
  return `GHS-2026-${String(i + 1).padStart(3, "0")}`;
}

async function main(): Promise<void> {
  console.log("🌱 Seeding guzia-high-school demo data...");

  // Wipe in FK-safe order (idempotent re-seed).
  await prisma.$transaction([
    prisma.paymentAllocation.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.feeHead.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.examMark.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.gradeBand.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.timetableSlot.deleteMany(),
    prisma.classSubject.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.section.deleteMany(),
    prisma.student.deleteMany(),
    prisma.teacher.deleteMany(),
    prisma.parent.deleteMany(),
    prisma.notice.deleteMany(),
    prisma.admissionApplication.deleteMany(),
    prisma.atRiskScore.deleteMany(),
    prisma.aiProviderConfig.deleteMany(),
    prisma.teachingPlan.deleteMany(),
    prisma.questionPaper.deleteMany(),
    prisma.sourceDocument.deleteMany(),
    prisma.user.deleteMany(),
    prisma.class.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);

  // Canonical grade bands (specs/04) — the single source of truth for grading.
  await prisma.gradeBand.createMany({ data: GRADE_BANDS });

  // Users: 1 admin, 3 teachers, 15 students (class 8-A), 8 parents.
  const admin = await prisma.user.create({
    data: {
      email: "admin@guziahs.edu",
      passwordHash,
      fullName: "Principal Admin",
      role: "ADMIN",
    },
  });

  const teacherUsers = await Promise.all(
    [1, 2, 3].map((n) =>
      prisma.user.create({
        data: {
          email: `teacher${n}@guziahs.edu`,
          passwordHash,
          fullName: `Teacher ${n}`,
          role: "TEACHER",
        },
      }),
    ),
  );
  const teachers = await Promise.all(
    teacherUsers.map((u, i) =>
      prisma.teacher.create({
        data: { userId: u.id, employeeId: `T-00${i + 1}`, phone: `0171100000${i + 1}` },
      }),
    ),
  );

  const parentUsers = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      prisma.user.create({
        data: {
          email: `parent0${i + 1}@guziahs.edu`,
          passwordHash,
          fullName: `Parent ${i + 1}`,
          role: "PARENT",
        },
      }),
    ),
  );
  const parents = await Promise.all(
    parentUsers.map((u) => prisma.parent.create({ data: { userId: u.id } })),
  );

  // Academic structure: 5 classes × 2 sections; focus class = "Class 8" section A.
  const classNames = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
  const classes = await Promise.all(
    classNames.map((name) => prisma.class.create({ data: { name } })),
  );
  const focusClass = classes[2];

  const sectionsA = await prisma.section.create({
    data: { name: "A", classId: focusClass.id },
  });
  const sectionsB = await prisma.section.create({
    data: { name: "B", classId: focusClass.id },
  });
  for (const cls of [classes[0], classes[1], classes[3], classes[4]]) {
    await prisma.section.createMany({
      data: [
        { name: "A", classId: cls.id },
        { name: "B", classId: cls.id },
      ],
    });
  }

  const subjects = await Promise.all(
    SUBJECTS.map((s) => prisma.subject.create({ data: s })),
  );

  // ClassSubject: teacher assignment per SECTION — same subject can have a
  // different teacher for section A vs B (e.g. Bangla: teacher1 for A,
  // teacher2 for B). Demo: section A gets teacher i, section B gets teacher i+1.
  await prisma.classSubject.createMany({
    data: subjects.flatMap((s, i) => [
      {
        classId: focusClass.id,
        sectionId: sectionsA.id,
        subjectId: s.id,
        teacherId: teachers[i % teachers.length].id,
      },
      {
        classId: focusClass.id,
        sectionId: sectionsB.id,
        subjectId: s.id,
        // Different teacher for the same subject in section B.
        teacherId: teachers[(i + 1) % teachers.length].id,
      },
    ]),
  });

  // Students: 15 in class 8-A, linked to parents (first 8 parents, wrap).
  const studentUsers: { id: string; fullName: string }[] = [];
  const students = [];
  for (let i = 0; i < 15; i++) {
    const fullName = `${FIRST_NAMES[i]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
    const u = await prisma.user.create({
      data: {
        email: `student${String(i + 1).padStart(2, "0")}@guziahs.edu`,
        passwordHash,
        fullName,
        role: "STUDENT",
      },
    });
    studentUsers.push(u);
    const s = await prisma.student.create({
      data: {
        userId: u.id,
        admissionNo: admissionNo(i),
        fullName,
        gender: i % 2 === 0 ? "male" : "female",
        classId: focusClass.id,
        sectionId: sectionsA.id,
        parentId: parents[i % parents.length].id,
        rollNo: i + 1,
      },
    });
    students.push(s);
  }

  // Attendance: last 60 school days (skip Fridays=5, Saturdays=6 — BD weekend Fri).
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const attendanceRows: { studentId: string; date: Date; status: "PRESENT" | "ABSENT" | "LATE" }[] = [];
  let daysCollected = 0;
  for (let d = 1; daysCollected < 60 && d < 120; d++) {
    const date = new Date(today.getTime() - d * 86400000);
    const dow = date.getUTCDay();
    if (dow === 5 || dow === 6) continue; // weekend
    daysCollected++;
    for (let i = 0; i < students.length; i++) {
      const weak = WEAK_STUDENTS.has(i);
      const r = random();
      let status: "PRESENT" | "ABSENT" | "LATE";
      if (weak) {
        status = r < 0.45 ? "ABSENT" : r < 0.65 ? "LATE" : "PRESENT";
      } else {
        status = r < 0.9 ? "PRESENT" : r < 0.97 ? "LATE" : "ABSENT";
      }
      attendanceRows.push({ studentId: students[i].id, date, status });
    }
  }
  await prisma.attendanceRecord.createMany({ data: attendanceRows });

  // Exams: First Term (80 days ago) + Mid-Year (30 days ago), published.
  const examDate = (daysAgo: number) => new Date(today.getTime() - daysAgo * 86400000);
  const firstTerm = await prisma.exam.create({
    data: {
      name: "First Term 2026",
      classId: focusClass.id,
      startDate: examDate(85),
      endDate: examDate(80),
      published: true,
    },
  });
  const midYear = await prisma.exam.create({
    data: {
      name: "Mid-Year 2026",
      classId: focusClass.id,
      startDate: examDate(35),
      endDate: examDate(30),
      published: true,
    },
  });

  // Marks: strong students 70-95, weak students declining 45→30.
  const markRows: {
    examId: string; studentId: string; subjectId: string; marksObtained: number; totalMarks: number;
  }[] = [];
  for (const [examIdx, exam] of [firstTerm, midYear].entries()) {
    for (let i = 0; i < students.length; i++) {
      for (const subject of subjects) {
        const weak = WEAK_STUDENTS.has(i);
        let marks: number;
        if (weak) {
          const base = examIdx === 0 ? 45 : 30;
          marks = Math.max(5, Math.round(base + random() * 15 - 8));
        } else {
          const base = 70 + Math.floor(random() * 20);
          marks = Math.min(98, base + examIdx * 2); // slight improvement mid-year
        }
        markRows.push({
          examId: exam.id,
          studentId: students[i].id,
          subjectId: subject.id,
          marksObtained: marks,
          totalMarks: 100,
        });
      }
    }
  }
  await prisma.examMark.createMany({ data: markRows });

  // Assignments + submissions (weak students miss/submit late).
  const teacherOfSubject = subjects.map((s, i) => ({ subjectId: s.id, teacher: teachers[i % 3] }));
  for (const [i, { subjectId, teacher }] of teacherOfSubject.entries()) {
    const due = examDate(7 - i); // due within last week
    const assignment = await prisma.assignment.create({
      data: {
        title: `${SUBJECTS[i].name} Assignment ${i + 1}`,
        description: `Practice questions from chapter ${i + 1}.`,
        subjectId,
        classId: focusClass.id,
        teacherId: teacher.id,
        dueDate: due,
      },
    });
    for (let s = 0; s < students.length; s++) {
      const weak = WEAK_STUDENTS.has(s);
      if (weak && random() < 0.5) continue; // missing submission
      const late = weak && random() < 0.6;
      await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: students[s].id,
          content: `Submission by ${students[s].fullName} for ${SUBJECTS[i].name}.`,
          status: late ? "LATE" : "ON_TIME",
          grade: weak ? 40 + Math.round(random() * 15) : 75 + Math.round(random() * 20),
          feedback: weak ? "Needs more practice." : "Good work.",
        },
      });
    }
  }

  // Fees: tuition 1200/mo (Oct+Nov+Dec), exam 800, lab 500 — mixed statuses.
  const tuition = await prisma.feeHead.create({
    data: { name: "Monthly Tuition", amount: 1200, classId: null },
  });
  const examFee = await prisma.feeHead.create({
    data: { name: "Exam Fee", amount: 800, classId: focusClass.id },
  });
  const labFee = await prisma.feeHead.create({
    data: { name: "Lab Fee", amount: 500, classId: focusClass.id },
  });

  const months = [0, 1, 2].map((m) => new Date(Date.UTC(2026, 9 + m, 10)));
  for (const student of students) {
    for (const dueDate of months) {
      await prisma.invoice.create({
        data: {
          studentId: student.id,
          feeHeadId: tuition.id,
          amount: tuition.amount,
          dueDate,
          status: "PENDING",
        },
      });
    }
    await prisma.invoice.create({
      data: { studentId: student.id, feeHeadId: examFee.id, amount: examFee.amount, dueDate: months[0], status: "PENDING" },
    });
    await prisma.invoice.create({
      data: { studentId: student.id, feeHeadId: labFee.id, amount: labFee.amount, dueDate: months[1], status: "PENDING" },
    });
  }

  // Payments for first 5 students: exercise the waterfall (spec 06 logic demo).
  for (let i = 0; i < 5; i++) {
    const amount = i === 0 ? 2500 : i === 1 ? 1200 : 3000;
    await prisma.payment.create({
      data: {
        studentId: students[i].id,
        amount,
        method: i % 2 === 0 ? "BKASH_ROCKET" : "CASH",
        reference: i % 2 === 0 ? `TXN${1000 + i}` : null,
        recordedById: admin.id,
      },
    });
    // NOTE: allocations are applied by the payments service at record time;
    // seed leaves invoices PENDING so the admin UI waterfall demo is visible.
  }

  // Notices.
  await prisma.notice.createMany({
    data: [
      { title: "Term Exam Schedule Published", body: "Mid-year exam results are now available on the portal.", authorId: admin.id, audience: null },
      { title: "Parent-Teacher Meeting", body: "Meeting on 25 Oct, 10am-1pm in the school hall.", authorId: admin.id, audience: "PARENT" },
      { title: "Science Fair Registration", body: "Register with your class teacher by 30 Oct.", authorId: admin.id, audience: "STUDENT" },
    ],
  });

  // Admission applications: 2 pending, 1 approved, 1 rejected.
  await prisma.admissionApplication.createMany({
    data: [
      { formData: { studentName: "Appl icant One", guardianName: "G One", phone: "01712345678", classWanted: "Class 8" }, status: "SUBMITTED" },
      { formData: { studentName: "Applicant Two", guardianName: "G Two", phone: "01798765432", classWanted: "Class 6" }, status: "SUBMITTED" },
      { formData: { studentName: "Applicant Three", guardianName: "G Three", phone: "01700000001", classWanted: "Class 7" }, status: "APPROVED", reviewedById: admin.id, reviewedAt: examDate(10) },
      { formData: { studentName: "Applicant Four", guardianName: "G Four", phone: "01700000002", classWanted: "Class 8" }, status: "REJECTED", reviewedById: admin.id, reviewNote: "Seats full for this section.", reviewedAt: examDate(5) },
    ],
  });

  // AI provider config row (boot-seeded from env defaults; admin can edit).
  await prisma.aiProviderConfig.create({
    data: {
      id: "singleton",
      name: process.env.AI_PROVIDER === "mock" ? "Mock (offline demo)" : "DeepSeek",
      baseUrl: process.env.DEEPEEK_BASE_URL ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
      textModel: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      visionModel: null,
      apiKeyEnc: null,
      apiKeyHint: null,
      temperature: 0.3,
      maxTokens: 2048,
      enabled: true,
      updatedById: admin.id,
    },
  });

  // Public site settings singleton — the school's real identity, from
  // sohopathi.com/guzia-bilateral-high-school/ (EIIN 119825, founded 1958,
  // Rajshahi Education Board, Union Guzia / Shibganj / Bogura).
  const schoolIdentity = {
    schoolName: "Guzia Bilateral High School",
    schoolNameBn: "গুজিয়া উচ্চ বিদ্যালয়",
    phone: "01713939240",
    eiin: "119825",
    board: "Rajshahi Education Board",
    address: "Union Guzia, Shibganj, Bogura",
    addressBn: "গুজিয়া ইউনিয়ন, শিবগঞ্জ, বগুড়া",
    established: "1958",
    tagline:
      "A combined secondary school in Guzia, Bogura — serving the community since 1958.",
    taglineBn:
      "১৯৫৮ সাল থেকে বগুড়ার গুজিয়ায় প্রতিষ্ঠিত একটি সহ-শিক্ষা মাধ্যমিক বিদ্যালয়।",

  };
  await prisma.siteSetting.upsert({
    where: { id: "singleton" },
    update: schoolIdentity,
    create: {
      id: "singleton",
      ...schoolIdentity,
      importantLinks: [
        { label: "Ministry of Education", labelBn: "শিক্ষা মন্ত্রণালয়", href: "https://moedu.gov.bd" },
        { label: "Rajshahi Education Board", labelBn: "রাজশাহী শিক্ষা বোর্ড", href: "https://rajshahieducationboard.gov.bd" },
        { label: "BANBEIS (EIIN)", labelBn: "বানবেইস (EIIN)", href: "https://banbeis.gov.bd" },
        { label: "National Emergency", labelBn: "জাতীয় জরুরি সেবা", href: "tel:999" },
      ],
    },
  });

  console.log("✅ Seed complete.");
  console.log("   Demo logins (all password: password123)");
  console.log("   admin@guziahs.edu | teacher1..3@guziahs.edu | student01..15@guziahs.edu | parent01..08@guziahs.edu");
  console.log(`   Students: ${students.length}, attendance rows: ${attendanceRows.length}, marks: ${markRows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
