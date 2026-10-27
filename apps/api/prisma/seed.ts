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

/**
 * NCTB 2026 textbook lists (nctb.gov.bd, secondary level).
 * Classes 6-8: items 1-16; classes 9-10: items 1-22 and 25-29.
 * One Subject row per title — the same title is shared across classes.
 */
const SUBJECTS_6_8 = [
  "চারুপাঠ",
  "আনন্দপাঠ",
  "বাংলা ব্যাকরণ ও নির্মিতি",
  "English For Today",
  "English Grammar and Composition",
  "গণিত",
  "তথ্য ও যোগাযোগ প্রযুক্তি",
  "বাংলাদেশ ও বিশ্বপরিচয়",
  "বিজ্ঞান",
  "শারীরিক শিক্ষা ও স্বাস্থ্য",
  "কর্ম ও জীবনমুখী শিক্ষা",
  "কৃষিশিক্ষা",
  "গার্হস্থ্যবিজ্ঞান",
  "চারু ও কারুকলা",
  "ইসলাম শিক্ষা",
  "হিন্দুধর্ম শিক্ষা",
];

const SUBJECTS_9_10 = [
  "বাংলা সাহিত্য",
  "বাংলা সহপাঠ",
  "বাংলা ভাষার ব্যাকরণ ও নির্মিতি",
  "English For Today",
  "English Grammar and Composition",
  "গণিত",
  "তথ্য ও যোগাযোগ প্রযুক্তি",
  "বিজ্ঞান",
  "পদার্থবিজ্ঞান",
  "রসায়ন",
  "জীববিজ্ঞান",
  "উচ্চতর গণিত",
  "ভূগোল ও পরিবেশ",
  "অর্থনীতি",
  "কৃষিশিক্ষা",
  "গার্হস্থ্যবিজ্ঞান",
  "পৌরনীতি ও নাগরিকতা",
  "হিসাববিজ্ঞান",
  "ফিন্যান্স ও ব্যাংকিং",
  "ব্যবসায় উদ্যোগ",
  "ইসলাম শিক্ষা",
  "হিন্দুধর্ম শিক্ষা",
  "ক্যারিয়ার শিক্ষা",
  "বাংলাদেশ ও বিশ্বপরিচয়",
  "চারু ও কারুকলা",
  "বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা",
  "শারীরিক শিক্ষা, স্বাস্থ্যবিজ্ঞান ও খেলাধুলা",
];

const FIRST_NAMES = [
  "Ayaan", "Tanvir", "Nusrat", "Rafi", "Sadia", "Imran", "Farhan", "Zara",
  "Mahin", "Tasnim", "Arif", "Nabila", "Sakib", "Ruma", "Fahim", "Anika",
  "Rakib", "Mim", "Hasan", "Priya", "Sohel", "Lamia", "Jamal", "Sumaiya",
];
const LAST_NAMES = ["Rahman", "Hossain", "Akter", "Islam", "Khan", "Ahmed", "Chowdhury", "Uddin"];

/**
 * Teaching staff from the school's MPO sheet (emis.gov.bd, September 2026).
 * The first three keep the demo emails teacher1..3 so the README credentials
 * stay stable; the rest use their name.
 */
const TEACHING_STAFF = [
  { name: "MST. MASUDA KHATUN", email: "teacher1@guziahs.edu", employeeId: "R564856", designation: "Computer Teacher", department: "Computer" },
  { name: "MST. NURE SHAKILA JAHAN", email: "teacher2@guziahs.edu", employeeId: "R5552534", designation: "Agriculture Teacher", department: "Agriculture" },
  { name: "MD. NURUL ISLAM", email: "teacher3@guziahs.edu", employeeId: "R540130", designation: "Assistant Teacher", department: "General" },
  { name: "MD. MEZBAUL ISLAM", email: "mezbaul.islam@guziahs.edu", employeeId: "R1017290", designation: "Assistant Teacher (English)", department: "English" },
  { name: "MD. SHAHINUR ALOM", email: "shahinur.alom@guziahs.edu", employeeId: "R10232220", designation: "Assistant Head Master", department: "Administration" },
  { name: "MD ABDUL LATIF", email: "abdul.latif@guziahs.edu", employeeId: "R1053715", designation: "Assistant Teacher (Religion)", department: "Religion" },
  { name: "TANZILA AKHTER", email: "tanzila.akhter@guziahs.edu", employeeId: "R10341333", designation: "Assistant Teacher", department: "General" },
  { name: "MD MAHAMUDUL HASAN", email: "mahamudul.hasan@guziahs.edu", employeeId: "R1053713", designation: "Assistant Teacher", department: "General" },
  { name: "MD ZILLUR RAHMAN", email: "zillur.rahman@guziahs.edu", employeeId: "R1053714", designation: "Assistant Teacher", department: "General" },
  { name: "MD. AMINUR RAHMAN", email: "aminur.rahman@guziahs.edu", employeeId: "R1023219", designation: "Assistant Teacher", department: "General" },
  { name: "MD ZAKIR HOSSAIN", email: "zakir.hossain@guziahs.edu", employeeId: "N110975", designation: "Physical Teacher", department: "Physical Education" },
  { name: "MD. ASHRAFUL ISLAM", email: "ashraful.islam@guziahs.edu", employeeId: "N1104777", designation: "Assistant Teacher (Library & Information Science)", department: "Library" },
  { name: "MD. SHUZAL MIAH", email: "shuzal.miah@guziahs.edu", employeeId: "N1159994", designation: "Assistant Teacher (Bangla)", department: "Bangla" },
  { name: "PRODDUT KUMAR CHAKROBARTY", email: "proddut.chakrobarty@guziahs.edu", employeeId: "N1226267", designation: "Hindu Religion Teacher", department: "Religion" },
  { name: "MST. SHAHIDA AKTER LUCKY", email: "shahida.akter@guziahs.edu", employeeId: "N5690019", designation: "Assistant Teacher (Physical Science)", department: "Science" },
  { name: "MISS. MOLE AKTAR", email: "mole.aktar@guziahs.edu", employeeId: "N569055942", designation: "Assistant Teacher (Biology)", department: "Science" },
  { name: "MD. MEHEDI HASAN", email: "mehedi.hasan@guziahs.edu", employeeId: "N569333053", designation: "Assistant Teacher (Arts & Crafts)", department: "Arts" },
];

// Weak students (0-indexed in class 8-A): guaranteed AI-demo at-risk cases.
const WEAK_STUDENTS = new Set([0, 3, 6]);

function admissionNo(i: number): string {
  return `GHS-2026-${String(i + 1).padStart(3, "0")}`;
}

async function main(): Promise<void> {
  console.log("🌱 Seeding guzia-high-school demo data...");

  // Wipe in FK-safe order (idempotent re-seed). Sequential rather than one big
  // transaction: two dozen statements in one transaction can exceed Prisma's
  // default budget on a network database (Neon) and fail with P2028.
  for (const reset of [
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
    prisma.class.deleteMany()
  ]) {
    await reset;
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  // Canonical grade bands (specs/04) — the single source of truth for grading.
  await prisma.gradeBand.createMany({ data: GRADE_BANDS });

  // Users: 1 admin, 17 real teachers (MPO sheet), 10 students per class, 15 parents.
  const admin = await prisma.user.create({
    data: {
      email: "admin@guziahs.edu",
      passwordHash,
      fullName: "Principal Admin",
      role: "ADMIN",
    },
  });

  const teacherUsers = await Promise.all(
    TEACHING_STAFF.map((staff) =>
      prisma.user.create({
        data: {
          email: staff.email,
          passwordHash,
          fullName: staff.name,
          role: "TEACHER",
        },
      }),
    ),
  );
  const teachers = await Promise.all(
    teacherUsers.map((u, i) =>
      prisma.teacher.create({
        data: {
          userId: u.id,
          employeeId: TEACHING_STAFF[i].employeeId,
          designation: TEACHING_STAFF[i].designation,
          department: TEACHING_STAFF[i].department,
          phone: `0171100${String(i + 1).padStart(4, "0")}`,
        },
      }),
    ),
  );

  const parentUsers = await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
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

  const sectionsByClass = new Map<string, { id: string; name: string }[]>();
  for (const cls of classes) {
    sectionsByClass.set(cls.id, [
      await prisma.section.create({ data: { name: "A", classId: cls.id } }),
      await prisma.section.create({ data: { name: "B", classId: cls.id } }),
    ]);
  }
  const [_sectionsA, _sectionsB] = sectionsByClass.get(focusClass.id)!;

  // One catalog row per unique NCTB title; classes map onto it.
  const catalog = [...new Set([...SUBJECTS_6_8, ...SUBJECTS_9_10])];
  const subjectByName = new Map<string, { id: string; name: string }>();
  for (const [i, name] of catalog.entries()) {
    const subject = await prisma.subject.create({
      data: { name, code: `NCTB-${String(i + 1).padStart(2, "0")}` },
    });
    subjectByName.set(name, subject);
  }
  const subjects68 = SUBJECTS_6_8.map((name) => subjectByName.get(name)!);
  const subjects910 = SUBJECTS_9_10.map((name) => subjectByName.get(name)!);
  // Class 8 carries the exams and assignments in this demo.
  const focusSubjects = subjects68;

  // ClassSubject: the NCTB list for each class, per section. The teacher is
  // round-robin across the staff so every section has a full timetable.
  const classSubjectRows: {
    classId: string;
    sectionId: string;
    subjectId: string;
    teacherId: string;
  }[] = [];
  for (const cls of classes) {
    const list = cls.name === "Class 9" || cls.name === "Class 10" ? subjects910 : subjects68;
    for (const section of sectionsByClass.get(cls.id) ?? []) {
      list.forEach((subject, i) => {
        classSubjectRows.push({
          classId: cls.id,
          sectionId: section.id,
          subjectId: subject.id,
          teacherId: teachers[i % teachers.length].id,
        });
      });
    }
  }
  await prisma.classSubject.createMany({ data: classSubjectRows });

  // Students: 10 per class (5 in each section), 50 total.
  const studentUsers: { id: string; fullName: string }[] = [];
  const students: { id: string; fullName: string }[] = [];
  const focusStudents: { id: string; fullName: string }[] = [];
  for (const cls of classes) {
    const sections = sectionsByClass.get(cls.id) ?? [];
    for (let slot = 0; slot < 10; slot++) {
      const i = students.length;
      const section = sections[slot < 5 ? 0 : 1];
      const fullName = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
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
          classId: cls.id,
          sectionId: section.id,
          parentId: parents[i % parents.length].id,
          rollNo: slot + 1,
        },
      });
      students.push(s);
      if (cls.id === focusClass.id) focusStudents.push(s);
    }
  }
  const weakStudentIds = new Set(
    [...WEAK_STUDENTS].map((i) => focusStudents[i]?.id).filter((id): id is string => Boolean(id)),
  );

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
      const weak = weakStudentIds.has(students[i].id);
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
    for (let i = 0; i < focusStudents.length; i++) {
      for (const subject of focusSubjects) {
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
          studentId: focusStudents[i].id,
          subjectId: subject.id,
          marksObtained: marks,
          totalMarks: 100,
        });
      }
    }
  }
  await prisma.examMark.createMany({ data: markRows });

  // Assignments + submissions (weak students miss/submit late).
  const teacherOfSubject = focusSubjects.map((s, i) => ({ subjectId: s.id, teacher: teachers[i % teachers.length] }));
  for (const [i, { subjectId, teacher }] of teacherOfSubject.entries()) {
    const due = examDate(7 - i); // due within last week
    const assignment = await prisma.assignment.create({
      data: {
        title: `${focusSubjects[i].name} Assignment ${i + 1}`,
        description: `Practice questions from chapter ${i + 1}.`,
        subjectId,
        classId: focusClass.id,
        teacherId: teacher.id,
        dueDate: due,
      },
    });
    for (let s = 0; s < focusStudents.length; s++) {
      const weak = WEAK_STUDENTS.has(s);
      if (weak && random() < 0.5) continue; // missing submission
      const late = weak && random() < 0.6;
      await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: focusStudents[s].id,
          content: `Submission by ${focusStudents[s].fullName} for ${focusSubjects[i].name}.`,
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
    schoolNameBn: "গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়",
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
  console.log("   admin@guziahs.edu | teacher1..3 + 14 staff | student01..50@guziahs.edu | parent01..15@guziahs.edu");
  console.log(`   Students: ${students.length}, attendance rows: ${attendanceRows.length}, marks: ${markRows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
