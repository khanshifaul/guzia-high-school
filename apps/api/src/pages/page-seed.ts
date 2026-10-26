// src/pages/page-seed.ts — the shipped public content, in English and Bengali.
//
// This is the content that used to live as literals in
// apps/web/app/{page,about/page,academics/page}.tsx, the footer, the /pages
// sitemap and the hotline strip. PagesService seeds any block whose key is
// missing from the database and never overwrites an existing row, so an admin
// edit always wins over this file.
//
// `en` is authoritative for structure and for non-text fields (icon name,
// href, number, colour class); `bn` carries the Bengali text of the same rows,
// position by position. See apps/web/lib/page-blocks.ts for the shape per kind.

export interface SeedBlock {
    key: string;
    kind: string;
    en: Record<string, unknown>;
    bn: Record<string, unknown>;
    imageUrl?: string;
    linkUrl?: string;
}

export interface SeedPage {
    slug: string;
    title: string;
    titleBn: string;
    blocks: SeedBlock[];
}

export const SEED_PAGES: SeedPage[] = [
    // ─── Home ────────────────────────────────────────────────────────
    {
        slug: 'home',
        title: 'Home',
        titleBn: 'হোম',
        blocks: [
            {
                key: 'stats',
                kind: 'stats',
                en: {
                    items: [
                        { icon: 'FaUserGraduate', end: 536, suffix: '', label: 'Students' },
                        { icon: 'FaChalkboardUser', end: 18, suffix: '', label: 'Teachers' },
                        {
                            icon: 'FaSchool',
                            compute: 'years-since-established',
                            label: 'Years of Excellence',
                        },
                        {
                            icon: 'FaAward',
                            end: 97.3,
                            suffix: '%',
                            label: 'SSC Pass Rate, 2022',
                        },
                    ],
                },
                bn: {
                    items: [
                        { label: 'শিক্ষার্থী' },
                        { label: 'শিক্ষক' },
                        { label: 'বছরের ঐতিহ্য' },
                        { label: 'এসএসসি পাসের হার, ২০২২' },
                    ],
                },
            },
            {
                key: 'highlights',
                kind: 'cards',
                en: {
                    title: 'Why Choose Guzia Bilateral High School?',
                    subtitle:
                        'We are committed to providing quality education that prepares students for the challenges of tomorrow.',
                    variant: 'highlights',
                    items: [
                        {
                            icon: 'FaGraduationCap',
                            title: 'Academic Excellence',
                            desc: 'Consistent top results in national board examinations with 95%+ pass rate.',
                        },
                        {
                            icon: 'FaChalkboardUser',
                            title: 'Expert Faculty',
                            desc: 'Highly qualified teachers with advanced degrees and years of experience.',
                        },
                        {
                            icon: 'FaBookOpen',
                            title: 'Modern Curriculum',
                            desc: 'Updated curriculum blending national standards with global perspectives.',
                        },
                        {
                            icon: 'FaFlask',
                            title: 'Science Labs',
                            desc: 'Fully equipped physics, chemistry, and biology laboratories.',
                        },
                        {
                            icon: 'FaTrophy',
                            title: 'Co-Curricular',
                            desc: 'Debate, sports, cultural programs, and science fair opportunities.',
                        },
                        {
                            icon: 'FaUsers',
                            title: 'Community',
                            desc: 'Strong parent-teacher collaboration for holistic student development.',
                        },
                    ],
                },
                bn: {
                    title: 'কেন গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়?',
                    subtitle:
                        'আমরা আগামীর চ্যালেঞ্জ মোকাবিলায় শিক্ষার্থীদের প্রস্তুত করতে মানসম্মত শিক্ষা দিতে প্রতিশ্রুতিবদ্ধ।',
                    items: [
                        {
                            title: 'একাডেমিক উৎকর্ষ',
                            desc: 'জাতীয় বোর্ড পরীক্ষায় ধারাবাহিকভাবে সেরা ফলাফল, ৯৫%+ পাসের হার।',
                        },
                        {
                            title: 'অভিজ্ঞ শিক্ষকমণ্ডলী',
                            desc: 'উচ্চশিক্ষিত ও বহু বছরের অভিজ্ঞতাসম্পন্ন শিক্ষকগণ।',
                        },
                        {
                            title: 'আধুনিক পাঠ্যক্রম',
                            desc: 'জাতীয় মানের সাথে বৈশ্বিক দৃষ্টিভঙ্গি মিশিয়ে হালনাগাদ পাঠ্যক্রম।',
                        },
                        {
                            title: 'বিজ্ঞানাগার',
                            desc: 'পদার্থ, রসায়ন ও জীববিজ্ঞানের পূর্ণাঙ্গ সজ্জিত ল্যাব।',
                        },
                        {
                            title: 'সহপাঠ্যক্রম',
                            desc: 'বিতর্ক, খেলাধুলা, সাংস্কৃতিক অনুষ্ঠান ও বিজ্ঞান মেলার সুযোগ।',
                        },
                        {
                            title: 'কমিউনিটি',
                            desc: 'শিক্ষার্থীর সার্বিক বিকাশে অভিভাবক-শিক্ষক ঘনিষ্ঠ সহযোগিতা।',
                        },
                    ],
                },
            },
            {
                key: 'programs',
                kind: 'cards',
                en: {
                    title: 'Academic Programs',
                    subtitle:
                        'Explore our diverse range of academic streams designed for every ambition.',
                    variant: 'programs',
                    footnote: 'Grades 6–10',
                    items: [
                        {
                            icon: 'FaMicroscope',
                            title: 'Science',
                            desc: 'Science, ICT & advanced Mathematics for future scientists and engineers.',
                        },
                        {
                            icon: 'FaLaptopCode',
                            title: 'Commerce',
                            desc: 'Accounting, Finance, Economics & Entrepreneurship for business leaders.',
                        },
                        {
                            icon: 'FaBookOpen',
                            title: 'Arts',
                            desc: 'History, Literature & Social Studies for holistic thinkers.',
                        },
                    ],
                },
                bn: {
                    title: 'একাডেমিক প্রোগ্রাম',
                    subtitle: 'প্রত্যেকের লক্ষ্য অনুযায়ী আমাদের বৈচিত্র্যময় একাডেমিক স্ট্রিমগুলো দেখুন।',
                    footnote: '৬ষ্ঠ–১০ম শ্রেণি',
                    items: [
                        {
                            title: 'বিজ্ঞান',
                            desc: 'ভবিষ্যৎ বিজ্ঞানী ও প্রকৌশলীদের জন্য বিজ্ঞান, আইসিটি ও উচ্চতর গণিত।',
                        },
                        {
                            title: 'বাণিজ্য',
                            desc: 'ব্যবসায়িক নেতাদের জন্য হিসাববিজ্ঞান, ফিন্যান্স, অর্থনীতি ও উদ্যোক্তা উন্নয়ন।',
                        },
                        {
                            title: 'মানবিক',
                            desc: 'সার্বিক চিন্তাশীলদের জন্য ইতিহাস, সাহিত্য ও সমাজবিজ্ঞান।',
                        },
                    ],
                },
            },
            {
                key: 'facilities',
                kind: 'cards',
                en: {
                    title: 'Our Facilities',
                    subtitle: 'World-class infrastructure that supports holistic development.',
                    variant: 'facilities',
                    items: [
                        {
                            icon: 'FaFlask',
                            title: 'Science Labs',
                            desc: 'Fully equipped physics, chemistry & biology labs.',
                        },
                        {
                            icon: 'FaLaptopCode',
                            title: 'Computer Lab',
                            desc: 'Modern computer lab with 40+ workstations.',
                        },
                        {
                            icon: 'FaBook',
                            title: 'Library',
                            desc: '10,000+ books, journals & digital resources.',
                        },
                        {
                            icon: 'FaPersonRunning',
                            title: 'Sports Complex',
                            desc: 'Football field, basketball court & indoor games.',
                        },
                        {
                            icon: 'FaMusic',
                            title: 'Music & Arts',
                            desc: 'Dedicated music room, art studio & stage.',
                        },
                        {
                            icon: 'FaDumbbell',
                            title: 'Gymnasium',
                            desc: 'Fully equipped indoor gym for all students.',
                        },
                        {
                            icon: 'FaUtensils',
                            title: 'Cafeteria',
                            desc: 'Hygienic, nutritious meals & snacks daily.',
                        },
                        {
                            icon: 'FaBus',
                            title: 'Transport',
                            desc: 'Safe bus service covering all major routes.',
                        },
                    ],
                },
                bn: {
                    title: 'আমাদের সুবিধা',
                    subtitle: 'সার্বিক বিকাশে সহায়ক বিশ্বমানের অবকাঠামো।',
                    items: [
                        { title: 'বিজ্ঞানাগার', desc: 'পদার্থ, রসায়ন ও জীববিজ্ঞানের পূর্ণাঙ্গ সজ্জিত ল্যাব।' },
                        { title: 'কম্পিউটার ল্যাব', desc: '৪০+ ওয়ার্কস্টেশনসহ আধুনিক কম্পিউটার ল্যাব।' },
                        { title: 'গ্রন্থাগার', desc: '১০,০০০+ বই, জার্নাল ও ডিজিটাল রিসোর্স।' },
                        { title: 'ক্রীড়া কমপ্লেক্স', desc: 'ফুটবল মাঠ, বাস্কেটবল কোর্ট ও ইনডোর খেলা।' },
                        { title: 'সংগীত ও কলা', desc: 'নিবেদিত সংগীত কক্ষ, চিত্রশালা ও মঞ্চ।' },
                        { title: 'জিমনেসিয়াম', desc: 'সকল শিক্ষার্থীর জন্য পূর্ণাঙ্গ ইনডোর জিম।' },
                        { title: 'ক্যান্টিন', desc: 'প্রতিদিন পরিচ্ছন্ন ও পুষ্টিকর খাবার ও নাস্তা।' },
                        { title: 'পরিবহন', desc: 'সব প্রধান রুটে নিরাপদ বাস সেবা।' },
                    ],
                },
            },
            {
                key: 'testimonials',
                kind: 'testimonials',
                en: {
                    title: 'What People Say',
                    subtitle: 'Hear from our alumni, parents, and educators.',
                    items: [
                        {
                            name: 'Fatima Begum',
                            role: 'Alumna, Class of 2021',
                            quote: "Guzia Bilateral High School shaped my character and gave me the confidence to pursue my dreams. The teachers here don't just teach — they mentor.",
                        },
                        {
                            name: 'Rafiq Hasan',
                            role: 'Current Parent',
                            quote: 'I chose Guzia for my children because of its academic reputation. Seeing their growth in both studies and values confirms it was the right decision.',
                        },
                        {
                            name: 'MD. SHAHINUR ALOM',
                            role: 'Acting Headmaster',
                            quote: 'Our mission is to nurture every student into a responsible citizen who excels not just academically but also in character and leadership.',
                        },
                    ],
                },
                bn: {
                    title: 'মানুষ যা বলেন',
                    subtitle: 'আমাদের প্রাক্তন শিক্ষার্থী, অভিভাবক ও শিক্ষকদের কথা শুনুন।',
                    items: [
                        {
                            role: 'প্রাক্তন শিক্ষার্থী, ২০২১ ব্যাচ',
                            quote: 'গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয় আমার চরিত্র গড়ে তুলেছে এবং স্বপ্ন অনুসরণের আত্মবিশ্বাস দিয়েছে। এখানকার শিক্ষকরা শুধু পড়ান না — তাঁরা পথ দেখান।',
                        },
                        {
                            role: 'বর্তমান অভিভাবক',
                            quote: 'আমি একাডেমিক সুনামের কারণে আমার সন্তানদের জন্য গুজিয়া বেছে নিয়েছি। পড়াশোনা ও মূল্যবোধে তাদের অগ্রগতি দেখে নিশ্চিত হয়েছি সিদ্ধান্ত সঠিক ছিল।',
                        },
                        {
                            role: 'ভারপ্রাপ্ত প্রধান শিক্ষক',
                            quote: 'আমাদের লক্ষ্য প্রত্যেক শিক্ষার্থীকে দায়িত্বশীল নাগরিক হিসেবে গড়ে তোলা, যে কেবল পড়াশোনায় নয় চরিত্র ও নেতৃত্বেও এগিয়ে থাকবে।',
                        },
                    ],
                },
            },
            {
                key: 'achievements',
                kind: 'cards',
                en: {
                    title: 'Our Achievements',
                    subtitle:
                        'Celebrating excellence across academics, sports, and co-curricular activities.',
                    variant: 'accent',
                    items: [
                        {
                            icon: 'FaTrophy',
                            title: 'Recognized',
                            desc: 'Government recognition since 1 July 1962',
                        },
                        {
                            icon: 'FaAward',
                            title: 'MPO Institution',
                            desc: 'Government pay order, no. 7610041302',
                        },
                        {
                            icon: 'FaStar',
                            title: 'National Rank 1861',
                            desc: 'In the national school ranking',
                        },
                        {
                            icon: 'FaHeart',
                            title: 'JSC 94.94% Pass',
                            desc: '1,031 of 1,086 students passed, 2010–2019',
                        },
                    ],
                },
                bn: {
                    title: 'আমাদের সাফল্য',
                    subtitle: 'একাডেমিক, ক্রীড়া ও সহপাঠ্যক্রমে উৎকর্ষ উদযাপন।',
                    items: [
                        { title: 'স্বীকৃত', desc: '১ জুলাই ১৯৬২ থেকে সরকারি স্বীকৃতি' },
                        { title: 'এমপিও প্রতিষ্ঠান', desc: 'সরকারি পে অর্ডার নং ৭৬১০০৪১৩০২' },
                        { title: 'জাতীয় র‍্যাংকিং ১৮৬১', desc: 'জাতীয় বিদ্যালয় র‍্যাংকিংয়ে' },
                        {
                            title: 'জেএসসি ৯৪.৯৪% পাস',
                            desc: '২০১০–২০১৯ সালে ১,০৮৬ জনের মধ্যে ১,০৩১ জন উত্তীর্ণ',
                        },
                    ],
                },
            },
            {
                key: 'gallery',
                kind: 'gallery',
                en: {
                    title: 'Campus Gallery',
                    subtitle: 'A glimpse into life at Guzia Bilateral High School.',
                    items: [
                        { label: 'Science Lab', tint: 'from-blue-400/20 to-blue-600/20' },
                        { label: 'Library', tint: 'from-emerald-400/20 to-emerald-600/20' },
                        { label: 'Sports Ground', tint: 'from-green-400/20 to-green-600/20' },
                        { label: 'Computer Lab', tint: 'from-purple-400/20 to-purple-600/20' },
                        { label: 'Annual Event', tint: 'from-rose-400/20 to-rose-600/20' },
                        { label: 'Classroom', tint: 'from-amber-400/20 to-amber-600/20' },
                        { label: 'Auditorium', tint: 'from-indigo-400/20 to-indigo-600/20' },
                        { label: 'Campus', tint: 'from-cyan-400/20 to-cyan-600/20' },
                    ],
                },
                bn: {
                    title: 'ক্যাম্পাস গ্যালারি',
                    subtitle: 'গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়ের জীবনের এক ঝলক।',
                    items: [
                        { label: 'বিজ্ঞানাগার' },
                        { label: 'গ্রন্থাগার' },
                        { label: 'খেলার মাঠ' },
                        { label: 'কম্পিউটার ল্যাব' },
                        { label: 'বার্ষিক অনুষ্ঠান' },
                        { label: 'শ্রেণিকক্ষ' },
                        { label: 'মিলনায়তন' },
                        { label: 'ক্যাম্পাস' },
                    ],
                },
            },
            {
                key: 'services',
                kind: 'services',
                en: {
                    title: 'Online Services',
                    subtitle:
                        'Apply, and follow your attendance, results and fees — each link opens the right page for you.',
                    items: [
                        {
                            key: 'admission',
                            icon: 'FaUserCheck',
                            title: 'Online Admission',
                            desc: 'Apply and track admission online.',
                        },
                        {
                            key: 'attendance',
                            icon: 'FaCalendarCheck',
                            title: 'Attendance',
                            desc: 'Daily attendance for students & parents.',
                        },
                        {
                            key: 'grades',
                            icon: 'FaGraduationCap',
                            title: 'Results & GPA',
                            desc: 'Published results with canonical GPA.',
                        },
                        {
                            key: 'fees',
                            icon: 'FaMoneyBillWave',
                            title: 'Fee Payment',
                            desc: 'View dues and payment history.',
                        },
                    ],
                },
                bn: {
                    title: 'অনলাইন সেবা',
                    subtitle:
                        'আবেদন করুন এবং উপস্থিতি, ফলাফল ও ফি দেখুন — প্রতিটি লিংক আপনার জন্য সঠিক পৃষ্ঠা খুলবে।',
                    items: [
                        { title: 'অনলাইন ভর্তি', desc: 'অনলাইনে আবেদন করুন ও ভর্তি ট্র্যাক করুন।' },
                        { title: 'উপস্থিতি', desc: 'শিক্ষার্থী ও অভিভাবকদের দৈনিক উপস্থিতি।' },
                        { title: 'ফলাফল ও জিপিএ', desc: 'প্রকাশিত ফলাফল ও নির্ধারিত জিপিএ।' },
                        { title: 'ফি পরিশোধ', desc: 'বকেয়া ও পরিশোধের ইতিহাস দেখুন।' },
                    ],
                },
            },
        ],
    },

    // ─── About ───────────────────────────────────────────────────────
    {
        slug: 'about',
        title: 'About Us',
        titleBn: 'আমাদের সম্পর্কে',
        blocks: [
            {
                key: 'values',
                kind: 'cards',
                en: {
                    variant: 'values',
                    items: [
                        {
                            icon: 'FaBullseye',
                            title: 'Our Mission',
                            desc: 'To provide quality education that nurtures the whole person — intellectually, morally, and socially — and forms responsible citizens.',
                        },
                        {
                            icon: 'FaEye',
                            title: 'Our Vision',
                            desc: 'To be a leading school where every student achieves academic excellence and grows into a person of character, creativity, and compassion.',
                        },
                        {
                            icon: 'FaHeart',
                            title: 'Our Values',
                            desc: 'Discipline, integrity, respect, hard work, and service to society — the foundation of everything we teach.',
                        },
                    ],
                },
                bn: {
                    items: [
                        {
                            title: 'আমাদের লক্ষ্য',
                            desc: 'মানসম্মত শিক্ষা দিয়ে শিক্ষার্থীর বুদ্ধিবৃত্তিক, নৈতিক ও সামাজিক বিকাশ ঘটানো এবং দায়িত্বশীল নাগরিক গড়ে তোলা।',
                        },
                        {
                            title: 'আমাদের স্বপ্ন',
                            desc: 'এমন এক শীর্ষস্থানীয় বিদ্যালয় হওয়া, যেখানে প্রত্যেক শিক্ষার্থী একাডেমিক উৎকর্ষ অর্জন করে এবং চরিত্র, সৃজনশীলতা ও সহানুভূতির মানুষ হয়ে ওঠে।',
                        },
                        {
                            title: 'আমাদের মূল্যবোধ',
                            desc: 'শৃঙ্খলা, সততা, সম্মান, পরিশ্রম ও সমাজসেবা — আমাদের প্রতিটি শিক্ষার ভিত্তি।',
                        },
                    ],
                },
            },
            {
                key: 'achievements',
                kind: 'cards',
                en: {
                    title: 'Our Achievements',
                    variant: 'accent',
                    items: [
                        {
                            icon: 'FaTrophy',
                            title: 'National Rank #3',
                            desc: 'National Science Olympiad 2025',
                        },
                        {
                            icon: 'FaAward',
                            title: '100% Pass Rate',
                            desc: 'SSC Board Examination 2025',
                        },
                        {
                            icon: 'FaStar',
                            title: 'Best School Award',
                            desc: 'Upazila Education Excellence 2024',
                        },
                        {
                            icon: 'FaUsers',
                            title: 'Gold Medal Debate',
                            desc: 'National Inter-School Championship 2025',
                        },
                    ],
                },
                bn: {
                    title: 'আমাদের সাফল্য',
                    items: [
                        { title: 'জাতীয় র‍্যাংক #৩', desc: 'জাতীয় বিজ্ঞান অলিম্পিয়াড ২০২৫' },
                        { title: '১০০% পাসের হার', desc: 'এসএসসি বোর্ড পরীক্ষা ২০২৫' },
                        { title: 'শ্রেষ্ঠ বিদ্যালয় পুরস্কার', desc: 'উপজেলা শিক্ষা উৎকর্ষ ২০২৪' },
                        { title: 'স্বর্ণপদক বিতর্ক', desc: 'জাতীয় আন্তঃবিদ্যালয় চ্যাম্পিয়নশিপ ২০২৫' },
                    ],
                },
            },
        ],
    },

    // ─── Academics ───────────────────────────────────────────────────
    {
        slug: 'academics',
        title: 'Academics',
        titleBn: 'একাডেমিক',
        blocks: [
            {
                key: 'programs',
                kind: 'cards',
                en: {
                    title: 'Academic Programs',
                    subtitle: 'Explore our diverse range of academic streams.',
                    variant: 'programs',
                    footnote: 'Grades 6–10',
                    items: [
                        {
                            icon: 'FaMicroscope',
                            title: 'Science',
                            desc: 'Science, ICT & advanced Mathematics for future scientists and engineers.',
                            subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'ICT'],
                        },
                        {
                            icon: 'FaLaptopCode',
                            title: 'Commerce',
                            desc: 'Accounting, Finance, Economics & Entrepreneurship for business leaders.',
                            subjects: [
                                'Accounting',
                                'Finance',
                                'Economics',
                                'Business Entrepreneurship',
                            ],
                        },
                        {
                            icon: 'FaBookOpen',
                            title: 'Arts',
                            desc: 'History, Literature & Social Studies for holistic thinkers.',
                            subjects: ['Bangla', 'English', 'History', 'Geography', 'Civics'],
                        },
                    ],
                },
                bn: {
                    title: 'একাডেমিক প্রোগ্রাম',
                    subtitle: 'আমাদের বৈচিত্র্যময় একাডেমিক স্ট্রিমগুলো দেখুন।',
                    footnote: '৬ষ্ঠ–১০ম শ্রেণি',
                    items: [
                        {
                            title: 'বিজ্ঞান',
                            desc: 'ভবিষ্যৎ বিজ্ঞানী ও প্রকৌশলীদের জন্য বিজ্ঞান, আইসিটি ও উচ্চতর গণিত।',
                            subjects: ['পদার্থবিজ্ঞান', 'রসায়ন', 'জীববিজ্ঞান', 'গণিত', 'আইসিটি'],
                        },
                        {
                            title: 'বাণিজ্য',
                            desc: 'ব্যবসায়িক নেতাদের জন্য হিসাববিজ্ঞান, ফিন্যান্স, অর্থনীতি ও উদ্যোক্তা উন্নয়ন।',
                            subjects: ['হিসাববিজ্ঞান', 'ফিন্যান্স', 'অর্থনীতি', 'ব্যবসায় উদ্যোগ'],
                        },
                        {
                            title: 'মানবিক',
                            desc: 'সার্বিক চিন্তাশীলদের জন্য ইতিহাস, সাহিত্য ও সমাজবিজ্ঞান।',
                            subjects: ['বাংলা', 'ইংরেজি', 'ইতিহাস', 'ভূগোল', 'পৌরনীতি'],
                        },
                    ],
                },
            },
            {
                key: 'facilities',
                kind: 'cards',
                en: {
                    title: 'How We Teach',
                    variant: 'facilities',
                    items: [
                        {
                            icon: 'FaFlask',
                            title: 'Science Labs',
                            desc: 'Fully equipped physics, chemistry & biology labs.',
                        },
                        {
                            icon: 'FaChalkboardUser',
                            title: 'Experienced Faculty',
                            desc: 'Qualified teachers dedicated to every student.',
                        },
                        {
                            icon: 'FaCalendarCheck',
                            title: 'Structured Schedule',
                            desc: 'Clear routines, exams, and parent meetings.',
                        },
                    ],
                },
                bn: {
                    title: 'আমরা যেভাবে পড়াই',
                    items: [
                        { title: 'বিজ্ঞানাগার', desc: 'পদার্থ, রসায়ন ও জীববিজ্ঞানের পূর্ণাঙ্গ সজ্জিত ল্যাব।' },
                        { title: 'অভিজ্ঞ শিক্ষকমণ্ডলী', desc: 'প্রতিটি শিক্ষার্থীর জন্য নিবেদিত যোগ্য শিক্ষকগণ।' },
                        { title: 'সুনির্দিষ্ট রুটিন', desc: 'স্পষ্ট দৈনন্দিন রুটিন, পরীক্ষা ও অভিভাবক সভা।' },
                    ],
                },
            },
        ],
    },

    // ─── Site-wide lists (footer, /pages sitemap, hotlines) ──────────
    {
        slug: 'global',
        title: 'Site-wide',
        titleBn: 'সাইটব্যাপী',
        blocks: [
            {
                key: 'footer-quick-links',
                kind: 'links',
                en: {
                    title: 'Quick Links',
                    items: [
                        { href: '/', label: 'Home' },
                        { href: '/about', label: 'About Us' },
                        { href: '/academics', label: 'Academics' },
                        { href: '/admission', label: 'Admissions' },
                        { href: '/news', label: 'News' },
                        { href: '/gallery', label: 'Gallery' },
                        { href: '/contact', label: 'Contact' },
                    ],
                },
                bn: {
                    title: 'দ্রুত লিংক',
                    items: [
                        { label: 'হোম' },
                        { label: 'আমাদের সম্পর্কে' },
                        { label: 'একাডেমিক' },
                        { label: 'ভর্তি' },
                        { label: 'সংবাদ' },
                        { label: 'গ্যালারি' },
                        { label: 'যোগাযোগ' },
                    ],
                },
            },
            {
                key: 'footer-resource-links',
                kind: 'links',
                en: {
                    title: 'Resources',
                    items: [
                        { href: '/academics', label: 'Curriculum' },
                        { href: '/academics', label: 'Faculty' },
                        { href: '/about', label: 'Our Achievements' },
                        { href: '/pages', label: 'Privacy Policy' },
                        { href: '/login', label: 'Portal Login' },
                    ],
                },
                bn: {
                    title: 'রিসোর্স',
                    items: [
                        { label: 'পাঠ্যক্রম' },
                        { label: 'শিক্ষকবৃন্দ' },
                        { label: 'সাফল্য' },
                        { label: 'গোপনীয়তা নীতি' },
                        { label: 'পোর্টাল লগইন' },
                    ],
                },
            },
            {
                key: 'sitemap-links',
                kind: 'links',
                en: {
                    title: 'Sitemap',
                    items: [
                        { href: '/', label: 'Home' },
                        { href: '/about', label: 'About Us' },
                        { href: '/academics', label: 'Academics' },
                        { href: '/admission', label: 'Admissions' },
                        { href: '/news', label: 'News & Events' },
                        { href: '/contact', label: 'Contact' },
                        { href: '/login', label: 'Portal Login' },
                    ],
                },
                bn: {
                    title: 'সাইটম্যাপ',
                    items: [
                        { label: 'হোম' },
                        { label: 'আমাদের সম্পর্কে' },
                        { label: 'একাডেমিক' },
                        { label: 'ভর্তি' },
                        { label: 'সংবাদ ও অনুষ্ঠান' },
                        { label: 'যোগাযোগ' },
                        { label: 'পোর্টাল লগইন' },
                    ],
                },
            },
            {
                key: 'hotlines',
                kind: 'hotlines',
                en: {
                    title: 'Emergency Hotlines',
                    items: [
                        { num: '999', label: 'National Emergency', color: 'bg-rose-700' },
                        { num: '333', label: 'Govt Info & Services', color: 'bg-emerald-700' },
                        { num: '102', label: 'Fire Service', color: 'bg-orange-700' },
                        { num: '1090', label: 'Disaster Warning', color: 'bg-amber-700' },
                        { num: '109', label: 'Women & Child Abuse', color: 'bg-pink-700' },
                        { num: '1098', label: 'Child Helpline', color: 'bg-sky-700' },
                        { num: '16263', label: 'Health Hotline', color: 'bg-teal-700' },
                        { num: '106', label: 'Anti-Corruption', color: 'bg-indigo-700' },
                    ],
                },
                bn: {
                    title: 'জরুরি হটলাইন',
                    items: [
                        { label: 'জাতীয় জরুরি সেবা' },
                        { label: 'সরকারি তথ্য ও সেবা' },
                        { label: 'ফায়ার সার্ভিস' },
                        { label: 'দুর্যোগের আগাম বার্তা' },
                        { label: 'নারী ও শিশু নির্যাতন প্রতিরোধ' },
                        { label: 'শিশু সহায়তা' },
                        { label: 'স্বাস্থ্য হটলাইন' },
                        { label: 'দুর্নীতি দমন (দুদক)' },
                    ],
                },
            },
        ],
    },
];
